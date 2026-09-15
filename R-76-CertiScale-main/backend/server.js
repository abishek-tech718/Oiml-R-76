import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachUser, requireAuth, requireRole } from "./middleware/auth.js";
import { calculateObservation, rollupVerdict } from "./services/rulesEngine.js";
import { createUserStore, normalizeRole } from "./db/userStore.js";
import { createCaseStore } from "./db/caseStore.js";
import { getApplicableTestTypes } from "./services/testApplicabilityEngine.js";
import { assertCaseTransition, dashboardFilterForRole } from "./services/caseWorkflow.js";
import { assessEnvironmentalReadiness } from "./services/environmentalReadiness.js";
import { calculateObservationResult } from "./services/calculationEngine.js";
import { buildRepositoryTrail } from "./services/repositoryTrail.js";
import { buildReportModel, generateReportFiles } from "./services/reportGenerator.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(projectRoot, "frontend");
dotenv.config({ path: path.join(projectRoot, ".env") });
const jwtSecret = process.env.JWT_SECRET ?? "development-only-change-me";
const roleSelectorEnabled = process.env.ROLE_SELECTOR_ENABLED === "true" || (!process.env.ROLE_SELECTOR_ENABLED && process.env.NODE_ENV !== "production");

app.use(cors());
app.use(express.json({ limit: "250kb" }));
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(attachUser);
app.use(express.static(frontendRoot));
const reportOutputDir = path.resolve(projectRoot, process.env.REPORT_OUTPUT_DIR ?? "backend/generated-reports");

const userStore = await createUserStore();
await userStore.initialize();
const caseStore = await createCaseStore();
await caseStore.initialize();

async function requireActiveUser(request, response, next) {
  const user = await userStore.findByEmail(request.user?.email ?? "");
  if (!user || user.status !== "active") {
    return response.status(403).json({ error: "This session is no longer authorized. Please sign in again." });
  }
  request.user = { ...request.user, role: user.role, name: user.name, status: user.status };
  return next();
}

app.get("/generated-reports/:file", requireAuth, requireActiveUser, (request, response) => {
  const file = path.basename(request.params.file);
  if (!/^[A-Za-z0-9_.-]+\.(pdf|docx)$/i.test(file)) return response.status(400).json({ error: "Invalid report file." });
  response.setHeader("Cache-Control", "private, no-store");
  return response.sendFile(file, { root: reportOutputDir }, (error) => {
    if (error && !response.headersSent) response.status(error.statusCode === 404 ? 404 : 500).json({ error: "Report file is unavailable." });
  });
});

const seededRules = [
  { id: "TR-III-01", ruleSetVersion: "R76-1:2006", accuracyClass: "III", minE: 0, maxE: 500, multiplier: 0.5 },
  { id: "TR-III-02", ruleSetVersion: "R76-1:2006", accuracyClass: "III", minE: 500, maxE: 2000, multiplier: 1.0 },
  { id: "TR-III-03", ruleSetVersion: "R76-1:2006", accuracyClass: "III", minE: 2000, maxE: 10000, multiplier: 1.5 },
];

const loginAttempts = new Map();
const selectableRoles = new Set(["technician", "lab_supervisor", "reviewer", "director", "admin"]);

function issueSession(user) {
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    jwtSecret,
    { expiresIn: "2h" },
  );
  return { token, user: { id: user.id, email: user.email, role: user.role, name: user.name, status: user.status } };
}

function textValue(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function positiveNumber(value, label, allowZero = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) throw new Error(`${label} must be ${allowZero ? "zero or greater" : "greater than zero"}.`);
  return parsed;
}

function finiteNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number.`);
  return parsed;
}

function instrumentFromRequest(body) {
  const declaredFeatures = Array.isArray(body.declared_features) ? body.declared_features.map((feature) => String(feature).trim()).filter(Boolean) : [];
  return {
    id: `INS-${crypto.randomUUID()}`,
    manufacturerName: textValue(body.manufacturer_name, "manufacturer_name"),
    manufacturerAddress: String(body.manufacturer_address ?? "").trim(),
    modelNumber: textValue(body.model_number, "model_number"),
    maxCapacity: positiveNumber(body.max_capacity, "max_capacity"),
    minCapacity: positiveNumber(body.min_capacity, "min_capacity", true),
    e: positiveNumber(body.verification_scale_interval_e, "verification_scale_interval_e"),
    d: positiveNumber(body.actual_scale_interval_d, "actual_scale_interval_d"),
    accuracyClass: textValue(body.accuracy_class, "accuracy_class").toUpperCase(),
    isElectronic: Boolean(body.is_electronic),
    declaredFeatures,
    n: positiveNumber(body.number_of_verification_intervals, "number_of_verification_intervals"),
  };
}

async function caseTestContext(caseId, testType) {
  const context = await caseStore.getCaseContext(caseId);
  if (!context) {
    const error = new Error("Case not found.");
    error.code = "NOT_FOUND";
    throw error;
  }
  if (!context.case.applicableTestTypes.includes(testType)) {
    const error = new Error("This test type does not apply to the instrument in this case.");
    error.code = "NOT_APPLICABLE";
    throw error;
  }
  return context;
}

async function environmentalReadiness(caseId, testType) {
  const [condition, limits] = await Promise.all([caseStore.latestLabCondition(caseId, testType), caseStore.getEnvironmentalLimit(testType)]);
  if (!condition) return { ready: false, verdict: "MISSING", message: "Record lab conditions for this test before entering observations.", findings: [] };
  return assessEnvironmentalReadiness(condition, limits);
}

async function allApplicableTestsComplete(caseRecord) {
  const observations = await caseStore.listObservations(caseRecord.id);
  const capturedTypes = new Set(observations.map((observation) => observation.test_type));
  const missing = caseRecord.applicableTestTypes.filter((testType) => !capturedTypes.has(testType));
  return { complete: missing.length === 0, missing };
}
app.get("/api/health", (request, response) => {
  response.json({ ok: true, service: "R76 CertiScale API" });
});

app.get("/api", (request, response) => {
  response.json({
    service: "R76 CertiScale API",
    frontend: "Open http://127.0.0.1:3000/",
    endpoints: ["/api/health", "/api/compliance/evaluate", "/api/compliance/rollup"],
  });
});

app.post("/api/auth/login", async (request, response) => {
  const attemptKey = `${request.ip}:${String(request.body.email ?? "").toLowerCase()}`;
  const attempt = loginAttempts.get(attemptKey) ?? { count: 0, lockedUntil: 0 };
  if (attempt.lockedUntil > Date.now()) {
    return response.status(429).json({ error: "Too many sign-in attempts. Try again later." });
  }

  const user = await userStore.findByEmail(String(request.body.email ?? "").trim());
  const passwordIsValid = user && bcrypt.compareSync(String(request.body.password ?? ""), user.passwordHash);
  if (!passwordIsValid) {
    const nextCount = attempt.count + 1;
    loginAttempts.set(attemptKey, {
      count: nextCount,
      lockedUntil: nextCount >= 5 ? Date.now() + 10 * 60 * 1000 : 0,
    });
    return response.status(401).json({ error: "Invalid credentials" });
  }
  if (user.status === "pending") return response.status(403).json({ error: "Your access request is awaiting administrator approval." });
  if (user.status === "deactivated") return response.status(403).json({ error: "This account has been deactivated. Contact an administrator." });
  loginAttempts.delete(attemptKey);

  return response.json(issueSession(user));
});

app.post("/api/auth/select-role", async (request, response) => {
  if (!roleSelectorEnabled) return response.status(403).json({ error: "Role selection is disabled in this environment." });
  const role = String(request.body.role ?? "").trim().toLowerCase();
  if (!selectableRoles.has(role)) return response.status(400).json({ error: "Choose a valid operational role." });
  const user = await userStore.findFirstActiveByRole(role);
  if (!user) return response.status(404).json({ error: `No active ${role.replaceAll("_", " ")} account is available.` });
  return response.json(issueSession(user));
});

async function requestAccess(request, response) {
  const { name, email, organization, password, confirmPassword, role } = request.body;
  if (!name || !email || !organization || !password || !confirmPassword || !role) {
    return response.status(400).json({ error: "All account fields are required" });
  }
  if (!String(email).includes("@")) {
    return response.status(400).json({ error: "A valid official email address is required" });
  }
  if (String(password).length < 10) {
    return response.status(400).json({ error: "Password must contain at least 10 characters" });
  }
  if (password !== confirmPassword) {
    return response.status(400).json({ error: "Passwords do not match" });
  }
  if (await userStore.findByEmail(String(email).trim())) {
    return response.status(409).json({ error: "An account already exists for this email" });
  }

  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return response.status(400).json({ error: "Choose a valid operational role." });
  const user = await userStore.createPending({
    name: String(name).trim(), email: String(email).trim().toLowerCase(), organization: String(organization).trim(),
    role: normalizedRole, passwordHash: bcrypt.hashSync(String(password), 12),
  });

  return response.status(201).json({
    message: "Access request submitted. An administrator must approve it before you can sign in.",
    user,
  });
}

app.post("/api/auth/request-access", requestAccess);
app.post("/api/auth/signup", requestAccess);

app.get("/api/admin/pending-users", requireAuth, requireActiveUser, requireRole("admin"), async (request, response) => {
  response.json({ users: await userStore.listPending() });
});

app.patch("/api/admin/pending-users/:id", requireAuth, requireActiveUser, requireRole("admin"), async (request, response) => {
  const status = request.body.action === "approve" ? "active" : request.body.action === "reject" ? "deactivated" : null;
  if (!status) return response.status(400).json({ error: "Action must be approve or reject." });
  const user = await userStore.setStatus(request.params.id, status);
  if (!user) return response.status(404).json({ error: "Pending access request not found." });
  return response.json({ user });
});

app.get("/api/auth/me", requireAuth, requireActiveUser, (request, response) => {
  response.json({ user: request.user });
});

app.get("/api/dashboard", requireAuth, requireActiveUser, async (request, response) => {
  try {
    const filter = dashboardFilterForRole(request.user.role);
    const [cases, statusCounts] = await Promise.all([caseStore.listCases(filter), caseStore.countByStatus()]);
    return response.json({ role: request.user.role, cases, statusCounts: request.user.role === "admin" ? statusCounts : [] });
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
});

app.post("/api/cases", requireAuth, requireActiveUser, requireRole("technician"), async (request, response) => {
  try {
    const instrument = instrumentFromRequest(request.body);
    if (!["I", "II", "III", "IIII"].includes(instrument.accuracyClass)) throw new Error("accuracy_class must be I, II, III, or IIII.");
    if (instrument.minCapacity > instrument.maxCapacity) throw new Error("min_capacity cannot exceed max_capacity.");
    const rules = await caseStore.listApplicabilityRules();
    const applicableTestTypes = getApplicableTestTypes({ is_electronic: instrument.isElectronic, declared_features: instrument.declaredFeatures }, rules);
    const createdAt = new Date().toISOString();
    const caseRecord = {
      id: `CASE-${crypto.randomUUID()}`,
      instrumentId: instrument.id,
      status: "draft",
      createdBy: request.user.sub,
      assignedRole: "technician",
      createdAt,
      applicableTestTypes,
    };
    const createdCase = await caseStore.createInstrumentAndCase({ instrument, caseRecord });
    return response.status(201).json({ case: createdCase, applicability: { applicable: applicableTestTypes, applicableCount: applicableTestTypes.length, totalCount: rules.length } });
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
});

app.get("/api/cases/:id/test-readiness/:testType", requireAuth, requireActiveUser, requireRole("technician"), async (request, response) => {
  try {
    await caseTestContext(request.params.id, request.params.testType);
    return response.json(await environmentalReadiness(request.params.id, request.params.testType));
  } catch (error) {
    return response.status(error.code === "NOT_FOUND" ? 404 : 400).json({ error: error.message });
  }
});

app.post("/api/cases/:id/lab-conditions", requireAuth, requireActiveUser, requireRole("technician"), async (request, response) => {
  try {
    const testType = textValue(request.body.test_type, "test_type");
    await caseTestContext(request.params.id, testType);
    const condition = {
      id: `ENV-${crypto.randomUUID()}`,
      caseId: request.params.id,
      testType,
      temperature: finiteNumber(request.body.temperature, "temperature"),
      humidity: positiveNumber(request.body.humidity, "humidity", true),
      atmosphericPressure: positiveNumber(request.body.atmospheric_pressure, "atmospheric_pressure", true),
      recordedAt: new Date().toISOString(),
    };
    const limits = await caseStore.getEnvironmentalLimit(testType);
    const readiness = assessEnvironmentalReadiness({ temperature: condition.temperature, humidity: condition.humidity, atmospheric_pressure: condition.atmosphericPressure }, limits);
    await caseStore.addLabCondition(condition);
    return response.status(201).json({ condition, readiness });
  } catch (error) {
    return response.status(error.code === "NOT_FOUND" ? 404 : 400).json({ error: error.message });
  }
});

app.post("/api/cases/:id/observations", requireAuth, requireActiveUser, requireRole("technician"), async (request, response) => {
  try {
    const testType = textValue(request.body.test_type, "test_type");
    const context = await caseTestContext(request.params.id, testType);
    const readiness = await environmentalReadiness(request.params.id, testType);
    if (!readiness.ready) return response.status(409).json({ error: readiness.message, readiness });
    const appliedLoad = positiveNumber(request.body.applied_load, "applied_load", true);
    const indicatedReading = positiveNumber(request.body.indicated_reading, "indicated_reading", true);
    const previous = await caseStore.listObservations(request.params.id, testType);
    const ascendingWarning = previous.some((observation) => Number(observation.applied_load) > appliedLoad)
      ? "Applied load is below an existing reading for this test sequence. Confirm the intended order."
      : null;
    const observation = await caseStore.addObservation({ id: `OBS-${crypto.randomUUID()}`, caseId: request.params.id, testType, appliedLoad, indicatedReading, notes: String(request.body.notes ?? "").trim() });
    const rules = await caseStore.listToleranceRules();
    const compliance = calculateObservationResult({ accuracy_class: context.instrument.accuracy_class, e: context.instrument.verification_scale_interval_e, applied_load: appliedLoad, indicated_reading: indicatedReading, toleranceRules: rules });
    return response.status(201).json({ observation, compliance, ascendingWarning });
  } catch (error) {
    return response.status(error.code === "NOT_FOUND" ? 404 : 400).json({ error: error.message });
  }
});

app.post("/api/cases/:id/observations/preview", requireAuth, requireActiveUser, requireRole("technician"), async (request, response) => {
  try {
    const testType = textValue(request.body.test_type, "test_type");
    const context = await caseTestContext(request.params.id, testType);
    const readiness = await environmentalReadiness(request.params.id, testType);
    if (!readiness.ready) return response.status(409).json({ error: readiness.message, readiness });
    const rules = await caseStore.listToleranceRules();
    const compliance = calculateObservationResult({
      accuracy_class: context.instrument.accuracy_class,
      e: context.instrument.verification_scale_interval_e,
      applied_load: positiveNumber(request.body.applied_load, "applied_load", true),
      indicated_reading: positiveNumber(request.body.indicated_reading, "indicated_reading", true),
      toleranceRules: rules,
    });
    return response.json({ compliance });
  } catch (error) {
    return response.status(error.code === "NOT_FOUND" ? 404 : 400).json({ error: error.message });
  }
});

app.get("/api/cases/:id/compliance", requireAuth, requireActiveUser, async (request, response) => {
  try {
    const context = await caseStore.getCaseContext(request.params.id);
    if (!context) return response.status(404).json({ error: "Case not found." });
    const [observations, rules, completion] = await Promise.all([caseStore.listObservations(request.params.id), caseStore.listToleranceRules(), allApplicableTestsComplete(context.case)]);
    const results = observations.map((observation) => ({
      observation,
      compliance: calculateObservationResult({ accuracy_class: context.instrument.accuracy_class, e: context.instrument.verification_scale_interval_e, applied_load: observation.applied_load, indicated_reading: observation.indicated_reading, toleranceRules: rules }),
    }));
    return response.json({ results, completion });
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
});

app.get("/api/repository", requireAuth, requireActiveUser, async (request, response) => {
  try {
    const cases = await caseStore.listRepositoryCases({
      manufacturer: String(request.query.manufacturer ?? "").trim(),
      model: String(request.query.model ?? "").trim(),
      dateFrom: String(request.query.dateFrom ?? "").trim(),
      dateTo: String(request.query.dateTo ?? "").trim(),
    });
    response.json({ cases });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.get("/api/repository/:id", requireAuth, requireActiveUser, async (request, response) => {
  try {
    const data = await caseStore.getRepositoryData(request.params.id);
    if (!data || !["approved", "report_issued", "failed"].includes(data.case.status)) return response.status(404).json({ error: "Final case not found in the repository." });
    const toleranceRules = await caseStore.listToleranceRules();
    const [report, trail] = await Promise.all([
      caseStore.latestReportForCase(data.case.id),
      Promise.resolve(buildRepositoryTrail({ caseRecord: data.case, instrument: data.instrument, observations: data.observations, toleranceRules })),
    ]);
    return response.json({ ...trail, report });
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
});

app.patch("/api/cases/:id/transition", requireAuth, requireActiveUser, async (request, response) => {
  const caseRecord = await caseStore.findCase(request.params.id);
  if (!caseRecord) return response.status(404).json({ error: "Case not found." });
  try {
    if (caseRecord.status === "testing_in_progress" && request.body.status === "pending_supervisor_check") {
      const completion = await allApplicableTestsComplete(caseRecord);
      if (!completion.complete) return response.status(409).json({ error: "All applicable tests need at least one observation before supervisor check.", missingTestTypes: completion.missing });
    }
    const transition = assertCaseTransition({ currentStatus: caseRecord.status, nextStatus: request.body.status, actorRole: request.user.role });
    const updatedCase = await caseStore.transitionCase({
      id: caseRecord.id,
      status: transition.status,
      assignedRole: transition.assignedRole,
      userId: request.user.sub,
      action: `Status changed from ${caseRecord.status} to ${transition.status}`,
    });
    return response.json({ case: updatedCase });
  } catch (error) {
    return response.status(error.code === "FORBIDDEN" ? 403 : 400).json({ error: error.message });
  }
});

app.post("/api/compliance/evaluate", (request, response) => {
  const result = calculateObservation({
    accuracyClass: request.body.accuracyClass,
    e: Number(request.body.e),
    appliedLoad: Number(request.body.appliedLoad),
    indicatedReading: Number(request.body.indicatedReading),
    toleranceRules: seededRules,
  });
  response.json(result);
});

app.post("/api/cases/:id/reports", requireAuth, requireActiveUser, requireRole("director", "admin"), async (request, response) => {
  try {
    const data = await caseStore.getReportData(request.params.id);
    if (!data) return response.status(404).json({ error: "Case not found." });
    if (data.case.status !== "approved") return response.status(409).json({ error: "A report can be generated only after Director approval." });
    const toleranceRules = await caseStore.listToleranceRules();
    const trail = buildRepositoryTrail({ caseRecord: data.case, instrument: data.instrument, observations: data.observations, toleranceRules });
    if (trail.failureSummary.failedPointCount > 0) return response.status(409).json({ error: "A report cannot be issued while failed observations are present." });
    const actors = await Promise.all(data.auditLogs.map((audit) => userStore.findById(audit.userId ?? audit.user_id)));
    const generatedAt = new Date().toISOString();
    const model = buildReportModel({ trail, labConditions: data.labConditions, auditLogs: data.auditLogs, actors, generatedAt });
    const files = await generateReportFiles({
      outputDir: reportOutputDir,
      logoPath: process.env.REPORT_LOGO_PATH ? path.resolve(projectRoot, process.env.REPORT_LOGO_PATH) : "",
      watermarkText: process.env.REPORT_WATERMARK_TEXT,
      watermarkImagePath: process.env.REPORT_WATERMARK_IMAGE_PATH ? path.resolve(projectRoot, process.env.REPORT_WATERMARK_IMAGE_PATH) : "",
      model,
    });
    const report = await caseStore.createReport({
      id: `RPT-${crypto.randomUUID()}`,
      caseId: data.case.id,
      generatedAt,
      pdfPath: `/generated-reports/${path.basename(files.pdfFile)}`,
      docxPath: `/generated-reports/${path.basename(files.docxFile)}`,
    });
    const updatedCase = await caseStore.transitionCase({
      id: data.case.id,
      status: "report_issued",
      assignedRole: "director",
      userId: request.user.sub,
      action: `Report issued: ${report.id}`,
    });
    return response.status(201).json({ report, case: updatedCase, verdict: model.verdict });
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
});

app.post("/api/compliance/rollup", (request, response) => {
  response.json(rollupVerdict(request.body.observations ?? []));
});

app.listen(process.env.PORT ?? 3000, () => {
  console.log(`R76 CertiScale API listening on port ${process.env.PORT ?? 3000} using ${userStore.mode}`);
});
