import { loadCsv, numberValue } from "./dataLoader.js";
import { evaluateObservation, groupBy, normalizeRules, summarizeObservations } from "./rulesEngine.js";

const state = {
  observations: [],
  approvals: [],
  rules: [],
  currentUser: null,
  authToken: "",
  capturedEnvironment: null,
  liveResult: null,
  selectedInstrument: "ALL",
  search: "",
  caseDashboard: null,
  selectedCaseId: "",
};

const titles = {
  login: "Choose Role",
  workflow: "Process",
  dashboard: "Dashboard",
  case: "Case Setup",
  compliance: "Compliance Results",
  tests: "Test Observations",
  rules: "Rules Engine",
  review: "Review And Approval",
  report: "Reports",
  repository: "Repository",
  admin: "Admin",
};

const dom = {
  title: document.querySelector("#view-title"),
  navItems: document.querySelectorAll(".nav-item"),
  metricGrid: document.querySelector("#metricGrid"),
  testTypeBars: document.querySelector("#testTypeBars"),
  qualityFlags: document.querySelector("#qualityFlags"),
  instrumentFilter: document.querySelector("#instrumentFilter"),
  observationRows: document.querySelector("#observationRows"),
  repositoryRows: document.querySelector("#repositoryRows"),
  finalRepositoryRows: document.querySelector("#finalRepositoryRows"),
  repositoryCaseCount: document.querySelector("#repositoryCaseCount"),
  repoManufacturer: document.querySelector("#repoManufacturer"),
  repoModel: document.querySelector("#repoModel"),
  repoDateFrom: document.querySelector("#repoDateFrom"),
  repoDateTo: document.querySelector("#repoDateTo"),
  repoSearchBtn: document.querySelector("#repoSearchBtn"),
  repositoryDetailPanel: document.querySelector("#repositoryDetailPanel"),
  repositoryDetailTitle: document.querySelector("#repositoryDetailTitle"),
  repositoryDetailSummary: document.querySelector("#repositoryDetailSummary"),
  repositoryTrail: document.querySelector("#repositoryTrail"),
  closeRepositoryDetailBtn: document.querySelector("#closeRepositoryDetailBtn"),
  adminRepositoryPanel: document.querySelector("#adminRepositoryPanel"),
  adminRepositoryRows: document.querySelector("#adminRepositoryRows"),
  openRepositoryBtn: document.querySelector("#openRepositoryBtn"),
  ruleExplanation: document.querySelector("#ruleExplanation"),
  mpeTable: document.querySelector("#mpeTable"),
  reportBody: document.querySelector("#reportBody"),
  reportVerdict: document.querySelector("#reportVerdict"),
  globalSearch: document.querySelector("#globalSearch"),
  generateReportBtn: document.querySelector("#generateReportBtn"),
  sessionChip: document.querySelector("#sessionChip"),
  logoutBtn: document.querySelector("#logoutBtn"),
  workflowSteps: document.querySelector("#workflowSteps"),
  complianceRows: document.querySelector("#complianceRows"),
  auditTimeline: document.querySelector("#auditTimeline"),
  adminRules: document.querySelector("#adminRules"),
  reviewChecklist: document.querySelector("#reviewChecklist"),
  approvalGate: document.querySelector("#approvalGate"),
  authStatus: document.querySelector("#authStatus"),
  roleSelector: document.querySelector("#roleSelector"),
  pendingApprovalsPanel: document.querySelector("#pendingApprovalsPanel"),
  pendingApprovalRows: document.querySelector("#pendingApprovalRows"),
  pendingApprovalCount: document.querySelector("#pendingApprovalCount"),
  approvalStatus: document.querySelector("#approvalStatus"),
  roleQueueEyebrow: document.querySelector("#roleQueueEyebrow"),
  roleQueueTitle: document.querySelector("#roleQueueTitle"),
  roleQueueRows: document.querySelector("#roleQueueRows"),
  roleQueueStatus: document.querySelector("#roleQueueStatus"),
  startCaseBtn: document.querySelector("#startCaseBtn"),
  workspaceEyebrow: document.querySelector("#workspaceEyebrow"),
  workspaceTitle: document.querySelector("#workspaceTitle"),
  workspaceDescription: document.querySelector("#workspaceDescription"),
  workspaceStatus: document.querySelector("#workspaceStatus"),
  caseId: document.querySelector("#caseId"),
  caseManufacturer: document.querySelector("#caseManufacturer"),
  caseManufacturerAddress: document.querySelector("#caseManufacturerAddress"),
  caseModel: document.querySelector("#caseModel"),
  caseClass: document.querySelector("#caseClass"),
  caseMax: document.querySelector("#caseMax"),
  caseMin: document.querySelector("#caseMin"),
  caseE: document.querySelector("#caseE"),
  caseD: document.querySelector("#caseD"),
  caseElectronic: document.querySelector("#caseElectronic"),
  caseFeatures: document.querySelector("#caseFeatures"),
  createCaseBtn: document.querySelector("#createCaseBtn"),
  caseCreationStatus: document.querySelector("#caseCreationStatus"),
  observationCaseSelect: document.querySelector("#observationCaseSelect"),
  observationEnvironmentGate: document.querySelector("#observationEnvironmentGate"),
  observationTemperature: document.querySelector("#observationTemperature"),
  observationHumidity: document.querySelector("#observationHumidity"),
  observationPressure: document.querySelector("#observationPressure"),
  recordConditionsBtn: document.querySelector("#recordConditionsBtn"),
  observationReadinessStatus: document.querySelector("#observationReadinessStatus"),
  observationEntryGate: document.querySelector("#observationEntryGate"),
  caseComplianceRows: document.querySelector("#caseComplianceRows"),
  labName: document.querySelector("#labName"),
  labTemp: document.querySelector("#labTemp"),
  labHumidity: document.querySelector("#labHumidity"),
  labPressure: document.querySelector("#labPressure"),
  labOperator: document.querySelector("#labOperator"),
  captureEnvironmentBtn: document.querySelector("#captureEnvironmentBtn"),
  environmentCapture: document.querySelector("#environmentCapture"),
  liveTestType: document.querySelector("#liveTestType"),
  liveLoadPosition: document.querySelector("#liveLoadPosition"),
  liveReferenceMass: document.querySelector("#liveReferenceMass"),
  liveIndicatedValue: document.querySelector("#liveIndicatedValue"),
  calculateLiveBtn: document.querySelector("#calculateLiveBtn"),
  saveLiveBtn: document.querySelector("#saveLiveBtn"),
  liveResult: document.querySelector("#liveResult"),
  exportPdfBtn: document.querySelector("#exportPdfBtn"),
  exportDocxBtn: document.querySelector("#exportDocxBtn"),
  createQrBtn: document.querySelector("#createQrBtn"),
  exportStatus: document.querySelector("#exportStatus"),
};

async function init() {
  const [observations, approvals, rules] = await Promise.all([
    loadCsv("data/oiml_r76_test_observations_dataset.csv"),
    loadCsv("data/model_approval_register_2026.csv"),
    loadCsv("data/tolerance_rules_r76_2006.csv"),
  ]);
  state.observations = observations;
  const storedLive = JSON.parse(localStorage.getItem("r76-live-observations") ?? "[]");
  state.observations = [...observations, ...storedLive];
  state.approvals = approvals;
  state.rules = normalizeRules(rules);
  state.currentUser = JSON.parse(localStorage.getItem("r76-current-user") ?? "null");
  state.authToken = localStorage.getItem("r76-auth-token") ?? "";
  await restoreSession();
  await loadRoleDashboard();
  state.capturedEnvironment = JSON.parse(localStorage.getItem("r76-environment") ?? "null");

  setupNavigation();
  setupSearch();
  setupAuth();
  setupLiveEntry();
  setupExports();
  setupInstrumentFilter();
  setupCaseManagement();
  setupRepository();
  fillCaseForm(state.observations[0]);
  renderAll();
  showView(state.currentUser ? "dashboard" : "login");
}

async function restoreSession() {
  if (!state.authToken) return;
  try {
    const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${state.authToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    state.currentUser = { ...payload.user, role: roleLabel(payload.user.role), signedInAt: state.currentUser?.signedInAt ?? new Date().toLocaleString() };
    localStorage.setItem("r76-current-user", JSON.stringify(state.currentUser));
  } catch {
    state.authToken = "";
    state.currentUser = null;
    localStorage.removeItem("r76-auth-token");
    localStorage.removeItem("r76-current-user");
  }
}

function setupAuth() {
  renderAuthStatus();
  dom.logoutBtn.addEventListener("click", () => {
    state.authToken = "";
    state.currentUser = null;
    localStorage.removeItem("r76-auth-token");
    localStorage.removeItem("r76-current-user");
    renderAuthStatus();
    renderAdmin();
    showView("login");
  });

  dom.roleSelector.querySelectorAll("button[data-role-select]").forEach((button) => button.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/auth/select-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: button.dataset.roleSelect }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to open this role workspace.");
      state.authToken = payload.token;
      state.currentUser = {
        ...payload.user,
        role: roleLabel(payload.user.role),
        signedInAt: new Date().toLocaleString(),
      };
      localStorage.setItem("r76-auth-token", state.authToken);
      localStorage.setItem("r76-current-user", JSON.stringify(state.currentUser));
      await loadRoleDashboard();
      renderAll();
      showView("dashboard");
    } catch (error) {
      dom.authStatus.innerHTML = `
        <div class="quality-card warn">
          <strong>Role unavailable</strong>
          <p>${error.message}</p>
        </div>
      `;
    }
  }));
}

function roleLabel(role) {
  if (role === "lab_supervisor") return "Lab Supervisor";
  if (role === "reviewer") return "Reviewer / Approver";
  if (role === "director") return "Director";
  if (role === "admin") return "Admin";
  return "Technician";
}

function setupLiveEntry() {
  dom.captureEnvironmentBtn.addEventListener("click", () => {
    state.capturedEnvironment = readEnvironment();
    localStorage.setItem("r76-environment", JSON.stringify(state.capturedEnvironment));
    renderEnvironmentCapture();
  });

  dom.observationCaseSelect.addEventListener("change", async () => {
    state.selectedCaseId = dom.observationCaseSelect.value;
    await refreshObservationContext();
  });
  dom.liveTestType.addEventListener("change", refreshTestReadiness);
  dom.recordConditionsBtn.addEventListener("click", recordTestConditions);
  dom.calculateLiveBtn.addEventListener("click", previewCaseObservation);
  dom.saveLiveBtn.addEventListener("click", saveCaseObservation);
}

function populateObservationCaseSelect() {
  const cases = state.currentUser?.role === "Technician" ? state.caseDashboard?.cases ?? [] : [];
  const selected = state.selectedCaseId;
  dom.observationCaseSelect.innerHTML = `<option value="">Select a technician case</option>${cases.map((caseRecord) => `<option value="${escapeHtml(caseRecord.id)}">${escapeHtml(caseRecord.modelNumber ?? caseRecord.id)} - ${escapeHtml(caseRecord.status.replaceAll("_", " "))}</option>`).join("")}`;
  if (cases.some((caseRecord) => caseRecord.id === selected)) dom.observationCaseSelect.value = selected;
}

async function refreshObservationContext() {
  const caseRecord = state.caseDashboard?.cases?.find((item) => item.id === state.selectedCaseId);
  dom.observationEntryGate.hidden = true;
  if (!caseRecord) {
    dom.liveTestType.innerHTML = "";
    dom.observationReadinessStatus.innerHTML = "";
    renderCaseCompliance([]);
    return;
  }
  dom.liveTestType.innerHTML = caseRecord.applicableTestTypes.map((testType) => `<option value="${escapeHtml(testType)}">${escapeHtml(testType.replaceAll("_", " "))}</option>`).join("");
  await refreshTestReadiness();
  await loadCaseCompliance();
}

async function refreshTestReadiness() {
  if (!state.selectedCaseId || !dom.liveTestType.value) return;
  try {
    const response = await fetch(`/api/cases/${encodeURIComponent(state.selectedCaseId)}/test-readiness/${encodeURIComponent(dom.liveTestType.value)}`, { headers: { Authorization: `Bearer ${state.authToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Readiness unavailable.");
    renderReadiness(payload);
  } catch (error) {
    renderReadiness({ ready: false, verdict: "MISSING", message: error.message });
  }
}

function renderReadiness(readiness) {
  const isGreen = readiness.verdict === "GREEN";
  dom.observationEntryGate.hidden = !isGreen;
  const kind = isGreen ? "ok" : "warn";
  const title = isGreen ? "Environmental readiness confirmed" : readiness.verdict === "RED" ? "Environmental readiness blocked" : "Environmental conditions required";
  dom.observationReadinessStatus.innerHTML = `<div class="quality-card ${kind}"><strong>${title}</strong><p>${escapeHtml(readiness.message)}</p></div>`;
}

async function recordTestConditions() {
  try {
    if (!state.selectedCaseId) throw new Error("Choose a case first.");
    const response = await fetch(`/api/cases/${encodeURIComponent(state.selectedCaseId)}/lab-conditions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.authToken}` },
      body: JSON.stringify({ test_type: dom.liveTestType.value, temperature: dom.observationTemperature.value, humidity: dom.observationHumidity.value, atmospheric_pressure: dom.observationPressure.value }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Conditions could not be recorded.");
    renderReadiness(payload.readiness);
  } catch (error) {
    renderReadiness({ ready: false, verdict: "RED", message: error.message });
  }
}

function observationPayload() {
  return { test_type: dom.liveTestType.value, applied_load: dom.liveReferenceMass.value, indicated_reading: dom.liveIndicatedValue.value, notes: `Live entry - ${dom.liveLoadPosition.value}` };
}

async function previewCaseObservation() {
  try {
    if (!state.selectedCaseId) throw new Error("Choose a case first.");
    const response = await fetch(`/api/cases/${encodeURIComponent(state.selectedCaseId)}/observations/preview`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.authToken}` }, body: JSON.stringify(observationPayload()) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Calculation could not be completed.");
    renderServerCompliance(payload.compliance);
  } catch (error) {
    dom.liveResult.innerHTML = `<strong class="result-fail">Unavailable</strong><p>${escapeHtml(error.message)}</p>`;
  }
}

async function saveCaseObservation() {
  try {
    if (!state.selectedCaseId) throw new Error("Choose a case first.");
    const response = await fetch(`/api/cases/${encodeURIComponent(state.selectedCaseId)}/observations`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.authToken}` }, body: JSON.stringify(observationPayload()) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Observation could not be saved.");
    renderServerCompliance(payload.compliance, payload.ascendingWarning);
    await loadCaseCompliance();
    showView("compliance");
  } catch (error) {
    dom.liveResult.innerHTML = `<strong class="result-fail">Not saved</strong><p>${escapeHtml(error.message)}</p>`;
  }
}

function renderServerCompliance(compliance, warning = null) {
  const band = compliance.band_used;
  dom.liveResult.innerHTML = `<strong class="${compliance.pass_fail === "PASS" ? "result-pass" : "result-fail"}">${compliance.pass_fail}</strong><span>Error ${compliance.error}; MPE ${compliance.mpe}</span><p>Rule ${escapeHtml(band.rule_id)}: ${band.load_band_min_e}e to ${band.load_band_max_e ?? "above"} at ${band.mpe_multiplier_of_e}e.</p>${warning ? `<p class="result-fail">${escapeHtml(warning)}</p>` : ""}`;
}

async function loadCaseCompliance() {
  if (!state.selectedCaseId) return;
  try {
    const response = await fetch(`/api/cases/${encodeURIComponent(state.selectedCaseId)}/compliance`, { headers: { Authorization: `Bearer ${state.authToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Compliance results are unavailable.");
    renderCaseCompliance(payload.results);
  } catch {
    renderCaseCompliance([]);
  }
}

function renderCaseCompliance(results) {
  if (!dom.caseComplianceRows) return;
  dom.caseComplianceRows.innerHTML = results.length ? results.map(({ observation, compliance }) => `<tr><td>${escapeHtml(observation.test_type)}</td><td>${observation.applied_load}</td><td>${observation.indicated_reading}</td><td>${compliance.error}</td><td>${compliance.mpe}</td><td><span class="status-pill ${compliance.pass_fail === "PASS" ? "pass" : "fail"}">${compliance.pass_fail}</span></td><td>${escapeHtml(compliance.band_used.rule_id)} (${compliance.band_used.mpe_multiplier_of_e}e)</td></tr>`).join("") : '<tr><td colspan="7" class="empty-row">Select a case and save an observation to see live compliance results.</td></tr>';
}

function setupCaseManagement() {
  dom.startCaseBtn.addEventListener("click", () => showView("case"));
  dom.createCaseBtn.addEventListener("click", createCase);
}

async function createCase() {
  try {
    const maxCapacity = numberValue(dom.caseMax.value);
    const minCapacity = numberValue(dom.caseMin.value);
    const verificationInterval = numberValue(dom.caseE.value);
    const actualInterval = numberValue(dom.caseD.value);
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.authToken}` },
      body: JSON.stringify({
        manufacturer_name: dom.caseManufacturer.value,
        manufacturer_address: dom.caseManufacturerAddress.value,
        model_number: dom.caseModel.value,
        max_capacity: maxCapacity,
        min_capacity: minCapacity,
        verification_scale_interval_e: verificationInterval,
        actual_scale_interval_d: actualInterval,
        accuracy_class: dom.caseClass.value,
        is_electronic: dom.caseElectronic.value === "true",
        declared_features: dom.caseFeatures.value.split(",").map((feature) => feature.trim()).filter(Boolean),
        number_of_verification_intervals: maxCapacity / verificationInterval,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Case could not be created.");
    dom.caseCreationStatus.innerHTML = `<div class="quality-card ok"><strong>Case created</strong><p>Based on this instrument's specification, ${payload.applicability.applicableCount} of ${payload.applicability.totalCount} total tests apply: ${payload.applicability.applicable.join(", ")}.</p></div>`;
    state.selectedCaseId = payload.case.id;
    await loadRoleDashboard();
    renderMetrics();
    renderRoleDashboard();
  } catch (error) {
    dom.caseCreationStatus.innerHTML = `<div class="quality-card warn"><strong>Case not created</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function setupExports() {
  dom.exportPdfBtn.addEventListener("click", () => {
    window.print();
    dom.exportStatus.textContent = "PDF export opened through browser print. Choose Save as PDF.";
  });

  dom.exportDocxBtn.addEventListener("click", () => {
    const reportHtml = document.querySelector("#reportSheet").innerHTML;
    const blob = new Blob([`<html><body>${reportHtml}</body></html>`], {
      type: "application/msword",
    });
    downloadBlob(blob, "R76-CertiScale-Test-Report.doc");
    dom.exportStatus.textContent = "Editable Word-compatible report downloaded.";
  });

  dom.createQrBtn.addEventListener("click", async () => {
    const rows = visibleObservations();
    const first = rows[0] ?? state.observations[0];
    const text = `${first.instrument_id}|${first.model}|${first.manufacturer}|${new Date().toISOString()}`;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
    dom.exportStatus.innerHTML = `QR verification hash: <strong>R76-${hash.toUpperCase()}</strong>`;
  });
}

function downloadBlob(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function setupNavigation() {
  dom.navItems.forEach((item) => {
    item.addEventListener("click", () => showView(item.dataset.view));
  });
  dom.generateReportBtn.addEventListener("click", () => showView("report"));
}

const roleWorkspaces = {
  Technician: {
    views: ["login", "dashboard", "case", "tests", "compliance"],
    eyebrow: "Technician Workspace",
    title: "Prepare instruments, confirm test conditions, and record compliant readings.",
    description: "Start a new NAWI case, capture laboratory conditions, and move complete evidence to supervisor check.",
    queue: "My active test cases",
    status: "Testing responsibility",
  },
  "Lab Supervisor": {
    views: ["login", "dashboard", "compliance"],
    eyebrow: "Laboratory Supervision",
    title: "Verify that test evidence is complete before technical review.",
    description: "Check submitted cases, confirm the measurement trail, and release sound work to the reviewer.",
    queue: "Supervisor verification queue",
    status: "Verification responsibility",
  },
  "Reviewer / Approver": {
    views: ["login", "dashboard", "compliance", "review", "repository"],
    eyebrow: "Compliance Review",
    title: "Review the calculation trail and compliance evidence for each case.",
    description: "Inspect MPE decisions, environmental readiness, and test completeness before director approval.",
    queue: "Compliance review queue",
    status: "Review responsibility",
  },
  Director: {
    views: ["login", "dashboard", "repository", "report"],
    eyebrow: "Director Approval",
    title: "Approve complete NAWI cases and issue controlled test reports.",
    description: "Review the final evidence trail, provide director approval, and generate the formal PDF or DOCX report.",
    queue: "Director approval queue",
    status: "Approval responsibility",
  },
  Admin: {
    views: ["login", "dashboard", "repository", "rules", "admin"],
    eyebrow: "System Oversight",
    title: "Monitor every NAWI case, rule set, report, and access request.",
    description: "Use this read-only operational view to track workflow health and administer the system.",
    queue: "All cases oversight",
    status: "Administrative oversight",
  },
};

function renderRoleWorkspace() {
  const workspace = roleWorkspaces[state.currentUser?.role];
  const allowedViews = workspace?.views ?? ["login"];
  document.body.className = document.body.className.replace(/\brole-[\w-]+\b/g, "").trim();
  if (state.currentUser) document.body.classList.add(`role-${state.currentUser.role.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`);
  dom.navItems.forEach((item) => { item.hidden = !allowedViews.includes(item.dataset.view); });
  dom.generateReportBtn.hidden = !["Director", "Admin"].includes(state.currentUser?.role);
  if (!workspace) return;
  dom.workspaceEyebrow.textContent = workspace.eyebrow;
  dom.workspaceTitle.textContent = workspace.title;
  dom.workspaceDescription.textContent = workspace.description;
  dom.workspaceStatus.innerHTML = `<span class="status-pill pass">${escapeHtml(workspace.status)}</span><span class="status-pill neutral">Rule Set: R76-1:2006</span>`;
}

function setupRepository() {
  dom.repoSearchBtn.addEventListener("click", loadFinalRepository);
  [dom.repoManufacturer, dom.repoModel, dom.repoDateFrom, dom.repoDateTo].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") loadFinalRepository();
    });
  });
  dom.closeRepositoryDetailBtn.addEventListener("click", () => { dom.repositoryDetailPanel.hidden = true; });
  dom.openRepositoryBtn.addEventListener("click", () => showView("repository"));
}

function setupSearch() {
  dom.globalSearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderRepository();
  });
}

function setupInstrumentFilter() {
  const instruments = ["ALL", ...new Set(state.observations.map((row) => row.instrument_id))];
  dom.instrumentFilter.innerHTML = instruments
    .map((instrument) => `<option value="${instrument}">${instrument === "ALL" ? "All instruments" : instrument}</option>`)
    .join("");
  dom.instrumentFilter.addEventListener("change", (event) => {
    state.selectedInstrument = event.target.value;
    renderObservationTable();
    renderCompliance();
    renderRules();
    renderReview();
    renderReport();
  });
}

function showView(view) {
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.querySelector(`#${view}-view`).classList.add("active");
  dom.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  dom.title.textContent = titles[view];
  document.body.classList.toggle("auth-only", !state.currentUser);
}

function renderAll() {
  renderRoleWorkspace();
  renderAuthStatus();
  renderEnvironmentCapture();
  renderLiveResult();
  renderWorkflow();
  renderMetrics();
  renderRoleDashboard();
  renderTestTypeBars();
  renderQualityFlags();
  renderObservationTable();
  renderCompliance();
  renderRules();
  renderReview();
  renderReport();
  renderRepository();
  renderAdmin();
}

function visibleObservations() {
  if (state.selectedInstrument === "ALL") return state.observations;
  return state.observations.filter((row) => row.instrument_id === state.selectedInstrument);
}

function renderMetrics() {
  if (state.currentUser && state.caseDashboard) {
    const dashboardCases = state.caseDashboard.cases ?? [];
    const role = state.currentUser.role;
    const statusCounts = state.caseDashboard.statusCounts ?? [];
    const metrics = role === "Admin"
      ? [["All cases", dashboardCases.length, "Read-only operational overview"], ["Workflow stages", statusCounts.length, "Stages with active cases"], ["Draft", statusCount("draft"), "Awaiting technician work"], ["Issued", statusCount("report_issued"), "Completed reports"]]
      : role === "Technician"
        ? [["My cases", dashboardCases.length, "Draft and active test cases"], ["Testing", dashboardCases.filter((item) => item.status === "testing_in_progress").length, "Observations in progress"], ["Draft", dashboardCases.filter((item) => item.status === "draft").length, "Ready to begin"], ["Next action", "Record tests", "Confirm conditions first"]]
        : [["Awaiting my check", dashboardCases.length, "Cases at your workflow stage"], ["Role", role, "Current responsibility"], ["Action required", dashboardCases.length, "Awaiting your decision"], ["Access", "Active", "Role-controlled API permissions"]];
    dom.metricGrid.innerHTML = metrics.map(([label, value, note]) => `<article class="metric-card"><p>${escapeHtml(label)}</p><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(note)}</span></article>`).join("");
    return;
  }
  const summary = summarizeObservations(state.observations, state.rules);
  const nawiApprovals = state.approvals.filter((row) => row.equipment === "Non-automatic weighing instrument").length;
  const metrics = [
    ["Observation records", summary.total, "Imported and live R76 readings"],
    ["Instrument cases", summary.instruments, "Models ready for report generation"],
    ["Pass records", summary.pass, "Observation rows within MPE"],
    ["Approval register", nawiApprovals, "NAWI records from public register"],
  ];

  dom.metricGrid.innerHTML = metrics
    .map(([label, value, note]) => `
      <article class="metric-card">
        <p>${label}</p>
        <strong>${value}</strong>
        <span>${note}</span>
      </article>
    `)
    .join("");
}

function statusCount(status) {
  return state.caseDashboard?.statusCounts?.find((item) => item.status === status)?.count ?? 0;
}

async function loadRoleDashboard() {
  if (!state.authToken) { state.caseDashboard = null; return; }
  try {
    const response = await fetch("/api/dashboard", { headers: { Authorization: `Bearer ${state.authToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to load the case queue.");
    state.caseDashboard = payload;
  } catch {
    state.caseDashboard = null;
  }
}

function renderRoleDashboard() {
  if (!dom.roleQueueRows) return;
  const role = state.currentUser?.role;
  dom.startCaseBtn.hidden = role !== "Technician";
  const workspace = roleWorkspaces[role];
  dom.roleQueueEyebrow.textContent = role === "Admin" ? "Operational Overview" : "Assigned Workflow";
  dom.roleQueueTitle.textContent = workspace?.queue ?? `${role ?? "Role"} Case Queue`;
  if (!state.currentUser) {
    dom.roleQueueRows.innerHTML = '<tr><td colspan="6" class="empty-row">Sign in to view your case queue.</td></tr>';
    return;
  }
  if (!state.caseDashboard) {
    dom.roleQueueRows.innerHTML = '<tr><td colspan="6" class="empty-row">Case queue is unavailable.</td></tr>';
    return;
  }
  const cases = state.caseDashboard.cases ?? [];
  if (role === "Admin") {
    const stages = ["draft", "testing_in_progress", "pending_supervisor_check", "pending_review", "pending_director_approval", "approved", "report_issued", "failed"];
    dom.roleQueueStatus.innerHTML = `<div class="stage-counts">${stages.map((stage) => `<span><strong>${statusCount(stage)}</strong>${escapeHtml(stage.replaceAll("_", " "))}</span>`).join("")}</div>`;
  } else {
    dom.roleQueueStatus.innerHTML = "";
  }
  dom.roleQueueRows.innerHTML = cases.length ? cases.map((caseRecord) => `
    <tr><td>${escapeHtml(caseRecord.id)}</td><td>${escapeHtml(caseRecord.modelNumber ?? "-")}</td><td>${escapeHtml(caseRecord.manufacturerName ?? "-")}</td>
    <td><span class="status-pill neutral">${escapeHtml(caseRecord.status.replaceAll("_", " "))}</span></td><td>${caseRecord.applicableTestTypes?.length ?? 0}</td>
    <td>${caseAction(caseRecord, role)}</td></tr>
  `).join("") : '<tr><td colspan="6" class="empty-row">No cases are currently assigned to this queue.</td></tr>';
  dom.roleQueueRows.querySelectorAll("button[data-next-status]").forEach((button) => button.addEventListener("click", () => transitionCase(button.dataset.caseId, button.dataset.nextStatus)));
  populateObservationCaseSelect();
}

function caseAction(caseRecord, role) {
  if (role === "Admin") return '<span class="status-pill neutral">Read only</span>';
  const nextStatus = { draft: "testing_in_progress", testing_in_progress: "pending_supervisor_check", pending_supervisor_check: "pending_review", pending_review: "pending_director_approval", pending_director_approval: "approved", approved: "report_issued" }[caseRecord.status];
  if (!nextStatus) return '<span class="status-pill neutral">No action</span>';
  return `<button class="secondary-action queue-action" data-case-id="${escapeHtml(caseRecord.id)}" data-next-status="${nextStatus}">${escapeHtml(nextStatus.replaceAll("_", " "))}</button>`;
}

async function transitionCase(caseId, status) {
  try {
    const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/transition`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.authToken}` }, body: JSON.stringify({ status }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Status change failed.");
    dom.roleQueueStatus.innerHTML = `<div class="quality-card ok"><strong>Status updated</strong><p>${escapeHtml(payload.case.id)} is now ${escapeHtml(payload.case.status.replaceAll("_", " "))}.</p></div>`;
    await loadRoleDashboard();
    renderMetrics();
    renderRoleDashboard();
  } catch (error) {
    dom.roleQueueStatus.innerHTML = `<div class="quality-card warn"><strong>Status not updated</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function renderAuthStatus() {
  if (!dom.authStatus) return;
  document.body.classList.toggle("auth-only", !state.currentUser);
  if (!state.currentUser) {
    dom.sessionChip.textContent = "Choose a role";
    dom.logoutBtn.hidden = true;
    dom.authStatus.innerHTML = `
      <div class="quality-card warn">
        <strong>No role selected</strong>
        <p>Choose the workspace role that matches the next workflow step.</p>
      </div>
    `;
    return;
  }
  dom.sessionChip.textContent = `${state.currentUser.name} - ${state.currentUser.role}`;
  dom.logoutBtn.hidden = false;
  dom.authStatus.innerHTML = `
    <div class="quality-card ok">
      <strong>Current role: ${state.currentUser.role}</strong>
      <p>${state.currentUser.name} selected at ${state.currentUser.signedInAt}</p>
    </div>
  `;
}

function readEnvironment() {
  return {
    lab: dom.labName.value,
    temperature: Number(dom.labTemp.value),
    humidity: Number(dom.labHumidity.value),
    pressure: Number(dom.labPressure.value),
    operator: dom.labOperator.value,
    capturedAt: new Date().toLocaleString(),
  };
}

function renderEnvironmentCapture() {
  const env = state.capturedEnvironment ?? readEnvironment();
  dom.environmentCapture.innerHTML = `
    <strong>${state.capturedEnvironment ? "Captured environment" : "Current environment draft"}</strong>
    <span>${env.temperature} C, ${env.humidity}% RH, ${env.pressure} hPa</span>
    <span>${env.lab} - ${env.operator}</span>
    <em>${state.capturedEnvironment ? `Captured at ${env.capturedAt}` : "Click capture before saving a test reading."}</em>
  `;
}

function currentInstrumentContext() {
  const base = state.selectedInstrument === "ALL"
    ? state.observations[0]
    : state.observations.find((row) => row.instrument_id === state.selectedInstrument) ?? state.observations[0];
  return {
    instrumentId: base.instrument_id,
    model: dom.caseModel.value || base.model,
    manufacturer: dom.caseManufacturer.value || base.manufacturer,
    accuracyClass: dom.caseClass.value || base.accuracy_class,
    maxCapacity: numberValue(dom.caseMax.value || base.max_capacity),
    minCapacity: numberValue(dom.caseMin.value || base.min_capacity),
    e: numberValue(dom.caseE.value || base.scale_interval_e),
    unit: base.unit || "g",
  };
}

function calculateLiveObservation() {
  const instrument = currentInstrumentContext();
  const env = state.capturedEnvironment ?? readEnvironment();
  const referenceMass = Number(dom.liveReferenceMass.value);
  const indicatedValue = Number(dom.liveIndicatedValue.value);
  const nIntervals = referenceMass / instrument.e;
  const row = {
    obs_id: `LIVE-${Date.now()}`,
    instrument_id: instrument.instrumentId,
    model: instrument.model,
    manufacturer: instrument.manufacturer,
    accuracy_class: instrument.accuracyClass,
    max_capacity: instrument.maxCapacity,
    min_capacity: instrument.minCapacity,
    scale_interval_e: instrument.e,
    unit: instrument.unit,
    test_type: dom.liveTestType.value,
    test_cycle: 1,
    load_position: dom.liveLoadPosition.value,
    reference_mass: referenceMass,
    indicated_value: indicatedValue,
    error: indicatedValue - referenceMass,
    mpe_allowed: 0,
    n_intervals: nIntervals,
    result: "PENDING",
    ambient_temp_C: env.temperature,
    ambient_humidity_pct: env.humidity,
    atmospheric_pressure_hPa: env.pressure,
    test_date: new Date().toISOString().slice(0, 10),
    operator: env.operator,
    lab: env.lab,
    notes: "Live entry from weighing-machine test workflow",
  };
  const check = evaluateObservation(row, state.rules);
  row.mpe_allowed = check.allowedMpe;
  row.result = check.recalculatedResult;
  row.error = check.calculatedError;
  return { row, check, env };
}

function renderLiveResult() {
  if (!state.liveResult) return;
  const { row, check, env } = state.liveResult;
  const rule = check.appliedRule;
  const ruleText = rule
    ? `Rule ${rule.id}: Class ${rule.accuracyClass}, ${rule.minE}e to ${rule.maxE === Infinity ? "above" : `${rule.maxE}e`}, MPE = ${rule.multiplier}e`
    : "No matching OIML tolerance rule found";
  dom.liveResult.innerHTML = `
    <strong class="${row.result === "PASS" ? "result-pass" : "result-fail"}">${row.result}</strong>
    <span>${row.test_type} at ${row.reference_mass} ${row.unit}</span>
    <p>Error = ${check.calculatedError.toFixed(3)} ${row.unit}; MPE = ${check.allowedMpe.toFixed(2)} ${row.unit}; therefore ${Math.abs(check.calculatedError) <= check.allowedMpe ? "the reading is inside the allowed limit" : "the reading exceeds the allowed limit"}.</p>
    <p>${ruleText}</p>
    <em>Environment: ${env.temperature} C, ${env.humidity}% RH, ${env.pressure} hPa</em>
  `;
}

function renderTestTypeBars() {
  const groups = groupBy(state.observations, "test_type");
  const max = Math.max(...Object.values(groups).map((rows) => rows.length));
  dom.testTypeBars.innerHTML = Object.entries(groups)
    .map(([label, rows]) => `
      <div class="bar-row">
        <div class="bar-meta"><span>${label}</span><strong>${rows.length}</strong></div>
        <div class="bar-track"><span style="width:${(rows.length / max) * 100}%"></span></div>
      </div>
    `)
    .join("");
}

function renderQualityFlags() {
  const summary = summarizeObservations(state.observations, state.rules);
  const issueRows = summary.dataIssues.slice(0, 5);
  dom.qualityFlags.innerHTML = `
    <div class="quality-card ${summary.dataIssues.length ? "warn" : "ok"}">
      <strong>${summary.dataIssues.length} validation flags</strong>
      <p>${summary.dataIssues.length ? "Some rows require review before report finalization." : "Observation calculations are internally consistent."}</p>
    </div>
    <div class="issue-list">
      ${issueRows.map(({ row, check }) => `
        <div class="issue-item">
          <strong>${row.obs_id}</strong>
          <span>${check.errorMismatch ? "Error mismatch" : "Result mismatch"} in ${row.test_type}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderWorkflow() {
  const steps = [
    ["Sign In", "Technician, Reviewer, or Admin enters with role-based access."],
    ["Create Case", "Capture manufacturer, model, Max, Min, e, d, accuracy class, and device details."],
    ["Lab Conditions", "Record temperature, humidity, pressure, and reference weight certificates."],
    ["Test Entry", "Enter or import accuracy, eccentricity, repeatability, tare/zero, temperature, creep, and warm-up observations."],
    ["Compliance", "Pure rules engine calculates error, MPE, pass/fail, test verdict, and case verdict."],
    ["Review", "Reviewer approves only after mandatory tests and validation checks are complete."],
    ["Report", "Generate PDF/DOCX style report with instrument details, test tables, verdict, QR/signature placeholders."],
    ["Repository", "Store report and allow search by manufacturer, model, status, certificate, and date."],
    ["Admin Rules", "Admin updates versioned OIML tolerance rules without changing application code."],
  ];

  dom.workflowSteps.innerHTML = steps.map(([title, text], index) => `
    <article class="workflow-step">
      <span>${index + 1}</span>
      <div>
        <strong>${title}</strong>
        <p>${text}</p>
      </div>
    </article>
  `).join("");
}

function renderObservationTable() {
  const rows = visibleObservations().slice(0, 28);
  dom.observationRows.innerHTML = rows.map((row) => {
    const result = String(row.result).trim().toUpperCase();
    return `
      <tr>
        <td>${row.obs_id}</td>
        <td>${row.test_type}</td>
        <td>${row.reference_mass} ${row.unit}</td>
        <td>${row.indicated_value} ${row.unit}</td>
        <td>${row.error}</td>
        <td>${row.mpe_allowed}</td>
        <td><span class="status-pill ${result === "PASS" ? "pass" : "fail"}">${result}</span></td>
        <td>${row.ambient_temp_C ?? "-"} C / ${row.ambient_humidity_pct ?? "-"}% / ${row.atmospheric_pressure_hPa ?? "1012"} hPa</td>
      </tr>
    `;
  }).join("");
}

function renderCompliance() {
  const rows = visibleObservations().slice(0, 36);
  dom.complianceRows.innerHTML = rows.map((row) => {
    const check = evaluateObservation(row, state.rules);
    const result = check.recalculatedResult;
    const issue = check.errorMismatch || check.resultMismatch;
    return `
      <tr>
        <td>${row.obs_id}</td>
        <td>${row.accuracy_class}</td>
        <td>${row.scale_interval_e} ${row.unit}</td>
        <td>${numberValue(row.n_intervals).toFixed(0)}e</td>
        <td>${check.calculatedError.toFixed(3)}</td>
        <td>${check.allowedMpe.toFixed(2)}</td>
        <td><span class="status-pill ${result === "PASS" ? "pass" : "fail"}">${result}</span></td>
        <td>${issue ? '<span class="status-pill warn">CHECK</span>' : '<span class="status-pill neutral">OK</span>'}<small>${check.appliedRule ? check.appliedRule.id : "No rule"}</small></td>
      </tr>
    `;
  }).join("");
}

function mandatoryTestStatus(rows) {
  const mandatory = [
    "Weighing Test - Increasing Load",
    "Weighing Test - Decreasing Load",
    "Eccentricity Test",
    "Repeatability Test",
    "Discrimination Test",
  ];
  const present = new Set(rows.map((row) => row.test_type));
  return mandatory.map((testType) => ({
    testType,
    complete: present.has(testType),
    count: rows.filter((row) => row.test_type === testType).length,
  }));
}

function renderReview() {
  const rows = visibleObservations();
  const summary = summarizeObservations(rows, state.rules);
  const tests = mandatoryTestStatus(rows);
  const incomplete = tests.filter((item) => !item.complete);
  const canApprove = incomplete.length === 0 && summary.dataIssues.length === 0 && summary.fail === 0;

  dom.reviewChecklist.innerHTML = tests.map((item) => `
    <div class="check-row">
      <span class="status-dot ${item.complete ? "ok" : "bad"}"></span>
      <strong>${item.testType}</strong>
      <em>${item.complete ? `${item.count} observations captured` : "Missing before report generation"}</em>
    </div>
  `).join("");

  dom.approvalGate.innerHTML = `
    <div class="quality-card ${canApprove ? "ok" : "warn"}">
      <strong>${canApprove ? "Ready for reviewer approval" : "Approval blocked"}</strong>
      <p>${canApprove ? "All mandatory tests are present, no validation flags remain, and all results pass." : "Reviewer/Admin must resolve missing tests, failed observations, or validation flags before final approval."}</p>
    </div>
    <div class="approval-actions">
      <button class="primary-action" id="approveReportBtn" ${canApprove ? "" : "disabled"}>Approve Final Report</button>
      <button class="secondary-action">Return To Technician</button>
    </div>
  `;
  document.querySelector("#approveReportBtn")?.addEventListener("click", finalizeReport);
}

async function finalizeReport() {
  try {
    const response = await fetch("/api/reports/finalize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.authToken}`,
      },
      body: JSON.stringify({ caseId: dom.caseId.value }),
    });
    if (!response.ok) throw new Error("Reviewer/Admin login required before legal report approval.");
    const payload = await response.json();
    dom.approvalGate.insertAdjacentHTML("beforeend", `
      <div class="quality-card ok">
        <strong>Report finalized</strong>
        <p>${payload.reportId} approved by ${payload.approvedBy}</p>
      </div>
    `);
  } catch (error) {
    dom.approvalGate.insertAdjacentHTML("beforeend", `
      <div class="quality-card warn">
        <strong>Approval failed</strong>
        <p>${error.message}</p>
      </div>
    `);
  }
}

function renderRules() {
  const sample = visibleObservations()[0] ?? state.observations[0];
  const check = evaluateObservation(sample, state.rules);
  dom.ruleExplanation.innerHTML = `
    <div class="explain-box">
      <p class="eyebrow">Selected observation</p>
      <h4>${sample.obs_id} - ${sample.test_type}</h4>
      <p>Class ${sample.accuracy_class}, e = ${sample.scale_interval_e} ${sample.unit}, n = ${sample.n_intervals}</p>
      <ol>
        <li>Read reference mass: ${sample.reference_mass} ${sample.unit}</li>
        <li>Read indicated value: ${sample.indicated_value} ${sample.unit}</li>
        <li>Calculate error: ${check.calculatedError.toFixed(4)} ${sample.unit}</li>
        <li>Select OIML rule: ${check.appliedRule ? `${check.appliedRule.id}, ${check.appliedRule.multiplier}e` : "No matching rule"}</li>
        <li>Compare with allowed MPE: ${check.allowedMpe.toFixed(2)} ${sample.unit}</li>
        <li>Verdict: ${check.recalculatedResult}</li>
      </ol>
      <p class="helper-note">If absolute error is less than or equal to MPE, the observation passes. If it is greater than MPE, that test point fails and the case requires review.</p>
    </div>
  `;

  const groups = groupBy(state.rules, "accuracyClass");
  dom.mpeTable.innerHTML = Object.entries(groups).map(([className, rules]) => `
    <div class="mpe-row">
      <strong>Class ${className}</strong>
      ${rules.map((rule) => `<span>${rule.minE} to ${rule.maxE === Infinity ? "above" : rule.maxE}: ${rule.multiplier}e</span>`).join("")}
    </div>
  `).join("");
}

function renderReport() {
  const rows = visibleObservations();
  const summary = summarizeObservations(rows, state.rules);
  const first = rows[0] ?? state.observations[0];
  const groups = groupBy(rows, "test_type");
  const failClass = summary.fail ? "fail" : "pass";
  dom.reportVerdict.textContent = summary.fail ? "REVIEW" : "PASS";
  dom.reportVerdict.className = `status-pill ${failClass}`;
  dom.reportBody.innerHTML = `
    <div class="report-grid">
      <div><span>Instrument ID</span><strong>${first.instrument_id}</strong></div>
      <div><span>Model</span><strong>${first.model}</strong></div>
      <div><span>Manufacturer</span><strong>${first.manufacturer}</strong></div>
      <div><span>Accuracy Class</span><strong>${first.accuracy_class}</strong></div>
      <div><span>Max Capacity</span><strong>${first.max_capacity} ${first.unit}</strong></div>
      <div><span>Verification Interval e</span><strong>${first.scale_interval_e} ${first.unit}</strong></div>
      <div><span>Environment</span><strong>${first.ambient_temp_C ?? "22.8"} C / ${first.ambient_humidity_pct ?? "53.2"}% RH</strong></div>
      <div><span>Pressure</span><strong>${first.atmospheric_pressure_hPa ?? "1012.4"} hPa</strong></div>
      <div><span>Operator</span><strong>${first.operator ?? "A. Kumar"}</strong></div>
    </div>
    <h4>Test Summary</h4>
    <div class="report-tests">
      ${Object.entries(groups).map(([label, testRows]) => {
        const failed = testRows.filter((row) => row.result === "FAIL").length;
        return `<div><strong>${label}</strong><span>${testRows.length} readings - ${failed ? "Review required" : "Pass"}</span></div>`;
      }).join("")}
    </div>
    <h4>Compliance Statement</h4>
    <p>The system compares recorded errors against OIML R76 maximum permissible error bands and includes test-time temperature, humidity, pressure, operator, and lab traceability before final approval.</p>
  `;
}

function renderAdmin() {
  const isAdmin = state.currentUser?.role === "Admin" || state.currentUser?.role === "admin";
  dom.pendingApprovalsPanel.hidden = !isAdmin;
  if (isAdmin) loadPendingApprovals();
  dom.adminRules.innerHTML = state.rules.map((rule) => `
    <tr>
      <td>${rule.id}</td>
      <td>${rule.ruleSetVersion}</td>
      <td>${rule.accuracyClass}</td>
      <td>${rule.minE}</td>
      <td>${rule.maxE === Infinity ? "No upper limit" : rule.maxE}</td>
      <td>${rule.multiplier}e</td>
    </tr>
  `).join("");

  dom.auditTimeline.innerHTML = [
    state.currentUser ? [state.currentUser.email, `Signed in as ${state.currentUser.role}`, "Security"] : ["System", "Awaiting secure sign-in", "Security"],
    state.capturedEnvironment ? [state.capturedEnvironment.operator, `Captured environment at ${state.capturedEnvironment.capturedAt}`, "Lab conditions"] : ["System", "Environment not captured yet", "Lab conditions"],
    ["A. Kumar", "Created CASE-NAWI-2026-001", "Technician"],
    ["System", "Validated observations and flagged data issues", "Validation engine"],
    ["R. Iyer", "Reviewed OIML R76 rule trace", "Reviewer"],
    ["Admin", "Published rule set R76-1:2006", "Rule versioning"],
  ].map(([actor, action, role]) => `
    <div class="audit-item">
      <strong>${actor}</strong>
      <span>${action}</span>
      <em>${role}</em>
    </div>
  `).join("");
}

async function loadPendingApprovals() {
  try {
    const response = await fetch("/api/admin/pending-users", { headers: { Authorization: `Bearer ${state.authToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to load access requests.");
    dom.pendingApprovalCount.textContent = `${payload.users.length} awaiting review`;
    dom.pendingApprovalRows.innerHTML = payload.users.length ? payload.users.map((user) => `
      <tr><td>${user.name}</td><td>${user.email}</td><td>${user.organization || "-"}</td><td>${roleLabel(user.role)}</td>
      <td>${new Date(user.createdAt).toLocaleString()}</td><td><div class="approval-actions compact"><button class="primary-action" data-approval="approve" data-user-id="${user.id}">Approve</button><button class="secondary-action" data-approval="reject" data-user-id="${user.id}">Reject</button></div></td></tr>
    `).join("") : '<tr><td colspan="6" class="empty-row">No access requests await a decision.</td></tr>';
    dom.pendingApprovalRows.querySelectorAll("button[data-approval]").forEach((button) => button.addEventListener("click", () => decideAccessRequest(button.dataset.userId, button.dataset.approval)));
  } catch (error) {
    dom.approvalStatus.innerHTML = `<div class="quality-card warn"><strong>Approval list unavailable</strong><p>${error.message}</p></div>`;
  }
}

async function decideAccessRequest(userId, action) {
  try {
    const response = await fetch(`/api/admin/pending-users/${encodeURIComponent(userId)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.authToken}` }, body: JSON.stringify({ action }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to record the decision.");
    dom.approvalStatus.innerHTML = `<div class="quality-card ok"><strong>Request ${action === "approve" ? "approved" : "rejected"}</strong><p>${payload.user.email} has been ${payload.user.status}.</p></div>`;
    loadPendingApprovals();
  } catch (error) {
    dom.approvalStatus.innerHTML = `<div class="quality-card warn"><strong>Decision not recorded</strong><p>${error.message}</p></div>`;
  }
}

function renderRepository() {
  const filtered = state.approvals
    .filter((row) => {
      if (!state.search) return true;
      return `${row.company_name} ${row.equipment} ${row.certificate_no} ${row.online_application_no}`.toLowerCase().includes(state.search);
    })
    .slice(0, 35);

  dom.repositoryRows.innerHTML = filtered.map((row) => `
    <tr>
      <td>${row.issue_date}</td>
      <td>${row.company_name}</td>
      <td>${row.equipment}</td>
      <td>${row.certificate_no}</td>
      <td>${row.online_application_no}</td>
    </tr>
  `).join("");
  loadFinalRepository();
}

async function loadFinalRepository() {
  if (!state.authToken) {
    dom.repositoryCaseCount.textContent = "Sign in required";
    dom.finalRepositoryRows.innerHTML = '<tr><td colspan="6" class="empty-row">Sign in to search finalised test cases.</td></tr>';
    renderAdminRepository([]);
    return;
  }
  const query = new URLSearchParams();
  if (dom.repoManufacturer.value.trim()) query.set("manufacturer", dom.repoManufacturer.value.trim());
  if (dom.repoModel.value.trim()) query.set("model", dom.repoModel.value.trim());
  if (dom.repoDateFrom.value) query.set("dateFrom", dom.repoDateFrom.value);
  if (dom.repoDateTo.value) query.set("dateTo", dom.repoDateTo.value);
  try {
    const response = await fetch(`/api/repository?${query.toString()}`, { headers: { Authorization: `Bearer ${state.authToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Repository could not be loaded.");
    const cases = payload.cases ?? [];
    dom.repositoryCaseCount.textContent = `${cases.length} final case${cases.length === 1 ? "" : "s"}`;
    dom.finalRepositoryRows.innerHTML = cases.length ? cases.map(repositoryCaseRow).join("") : '<tr><td colspan="6" class="empty-row">No final cases match the selected filters.</td></tr>';
    dom.finalRepositoryRows.querySelectorAll("button[data-repository-case]").forEach((button) => button.addEventListener("click", () => openRepositoryDetail(button.dataset.repositoryCase)));
    renderAdminRepository(cases);
  } catch (error) {
    dom.repositoryCaseCount.textContent = "Unavailable";
    dom.finalRepositoryRows.innerHTML = `<tr><td colspan="6" class="empty-row">${escapeHtml(error.message)}</td></tr>`;
    renderAdminRepository([]);
  }
}

function repositoryCaseRow(caseRecord) {
  const finalStatus = String(caseRecord.status).toLowerCase();
  return `<tr>
    <td>${escapeHtml(caseRecord.id)}</td>
    <td>${escapeHtml(caseRecord.manufacturerName ?? "-")}</td>
    <td>${escapeHtml(caseRecord.modelNumber ?? "-")}</td>
    <td>${new Date(caseRecord.createdAt).toLocaleDateString()}</td>
    <td><span class="status-pill ${finalStatus === "failed" ? "fail" : "pass"}">${escapeHtml(finalStatus)}</span></td>
    <td><button class="secondary-action compact-action" data-repository-case="${escapeHtml(caseRecord.id)}">View trail</button></td>
  </tr>`;
}

function renderAdminRepository(cases) {
  const isAdmin = state.currentUser?.role === "Admin" || state.currentUser?.role === "admin";
  dom.adminRepositoryPanel.hidden = !isAdmin;
  if (!isAdmin) return;
  dom.adminRepositoryRows.innerHTML = cases.length ? cases.slice(0, 5).map((caseRecord) => `<tr>
    <td>${escapeHtml(caseRecord.id)}</td><td>${escapeHtml(caseRecord.manufacturerName ?? "-")} / ${escapeHtml(caseRecord.modelNumber ?? "-")}</td>
    <td>${new Date(caseRecord.createdAt).toLocaleDateString()}</td>
    <td><span class="status-pill ${caseRecord.status === "failed" ? "fail" : "pass"}">${escapeHtml(caseRecord.status)}</span></td>
    <td><button class="secondary-action compact-action" data-admin-repository-case="${escapeHtml(caseRecord.id)}">View trail</button></td></tr>`).join("") : '<tr><td colspan="5" class="empty-row">No approved or failed cases are available.</td></tr>';
  dom.adminRepositoryRows.querySelectorAll("button[data-admin-repository-case]").forEach((button) => button.addEventListener("click", () => {
    showView("repository");
    openRepositoryDetail(button.dataset.adminRepositoryCase);
  }));
}

async function openRepositoryDetail(caseId) {
  try {
    const response = await fetch(`/api/repository/${encodeURIComponent(caseId)}`, { headers: { Authorization: `Bearer ${state.authToken}` } });
    const trail = await response.json();
    if (!response.ok) throw new Error(trail.error ?? "Calculation trail could not be loaded.");
    renderRepositoryDetail(trail);
    dom.repositoryDetailPanel.hidden = false;
    dom.repositoryDetailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    dom.repositoryDetailPanel.hidden = false;
    dom.repositoryDetailTitle.textContent = "Case details unavailable";
    dom.repositoryDetailSummary.innerHTML = `<div class="quality-card warn"><strong>Repository detail unavailable</strong><p>${escapeHtml(error.message)}</p></div>`;
    dom.repositoryTrail.innerHTML = "";
  }
}

function renderRepositoryDetail(trail) {
  const failed = trail.case.status === "failed" || trail.failureSummary.failedPointCount > 0;
  dom.repositoryDetailTitle.textContent = `${trail.case.id} - ${trail.instrument.manufacturer_name} ${trail.instrument.model_number}`;
  const failureText = trail.failureSummary.failedPointCount
    ? `${trail.failureSummary.failedPointCount} failed point${trail.failureSummary.failedPointCount === 1 ? "" : "s"} across ${trail.failureSummary.failedTestTypes.join(", ")}.`
    : "No failed observations are recorded in this final case.";
  const canGenerateReport = trail.case.status === "approved" && ["Director", "Admin", "director", "admin"].includes(state.currentUser?.role);
  const report = trail.report;
  dom.repositoryDetailSummary.innerHTML = `<div class="repository-summary ${failed ? "failed-summary" : "passed-summary"}">
    <div><span>Final status</span><strong>${escapeHtml(trail.case.status)}</strong></div>
    <div><span>Accuracy class</span><strong>${escapeHtml(trail.instrument.accuracy_class)}</strong></div>
    <div><span>Verification interval</span><strong>${trail.instrument.verification_scale_interval_e}</strong></div>
    <p>${escapeHtml(failureText)}</p>
  </div>
  <div class="report-repository-actions">
    ${canGenerateReport ? `<button class="primary-action" id="generateCaseReportBtn" data-case-id="${escapeHtml(trail.case.id)}">Generate report</button>` : ""}
    ${report ? `<span class="report-issued-label">Issued ${new Date(report.generatedAt ?? report.generated_at).toLocaleString()}</span>
      <button class="secondary-action" data-report-download="${escapeHtml(report.pdfPath ?? report.pdf_path)}" data-report-name="${escapeHtml(trail.case.id)}.pdf">Download PDF</button>
      <button class="secondary-action" data-report-download="${escapeHtml(report.docxPath ?? report.docx_path)}" data-report-name="${escapeHtml(trail.case.id)}.docx">Download DOCX</button>` : ""}
  </div>`;
  document.querySelector("#generateCaseReportBtn")?.addEventListener("click", () => generateCaseReport(trail.case.id));
  dom.repositoryDetailSummary.querySelectorAll("button[data-report-download]").forEach((button) => button.addEventListener("click", () => downloadProtectedReport(button.dataset.reportDownload, button.dataset.reportName)));
  dom.repositoryTrail.innerHTML = trail.tests.map((test) => `<section class="trail-test ${test.testVerdict === "FAIL" ? "trail-test-failed" : ""}">
    <div class="trail-test-head"><h4>${escapeHtml(test.testType.replaceAll("_", " "))}</h4><span class="status-pill ${test.testVerdict === "FAIL" ? "fail" : test.testVerdict === "PASS" ? "pass" : "neutral"}">${escapeHtml(test.testVerdict)}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Applied load</th><th>Indicated reading</th><th>Error</th><th>MPE</th><th>Rule</th><th>Load band</th><th>Result</th></tr></thead><tbody>
      ${test.points.length ? test.points.map((point) => `<tr class="${point.isFailure ? "failed-point" : ""}">
        <td>${point.observation.applied_load}</td><td>${point.observation.indicated_reading}</td><td>${point.compliance.error}</td><td>${point.compliance.mpe}</td>
        <td>${escapeHtml(point.compliance.band_used.rule_id)}</td><td>${point.compliance.band_used.load_band_min_e}e - ${point.compliance.band_used.load_band_max_e ?? "above"}e</td>
        <td><span class="status-pill ${point.isFailure ? "fail" : "pass"}">${point.compliance.pass_fail}</span></td>
      </tr>`).join("") : '<tr><td colspan="7" class="empty-row">No observations were recorded for this applicable test type.</td></tr>'}
    </tbody></table></div>
  </section>`).join("");
}

async function generateCaseReport(caseId) {
  try {
    const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/reports`, { method: "POST", headers: { Authorization: `Bearer ${state.authToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Report could not be generated.");
    await loadRoleDashboard();
    await loadFinalRepository();
    await openRepositoryDetail(caseId);
  } catch (error) {
    dom.repositoryDetailSummary.insertAdjacentHTML("beforeend", `<div class="quality-card warn"><strong>Report not issued</strong><p>${escapeHtml(error.message)}</p></div>`);
  }
}

async function downloadProtectedReport(filePath, fileName) {
  try {
    const response = await fetch(filePath, { headers: { Authorization: `Bearer ${state.authToken}` } });
    if (!response.ok) throw new Error("The report file is unavailable.");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(await response.blob());
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    dom.repositoryDetailSummary.insertAdjacentHTML("beforeend", `<div class="quality-card warn"><strong>Download unavailable</strong><p>${escapeHtml(error.message)}</p></div>`);
  }
}

function fillCaseForm(row) {
  dom.caseManufacturer.value = row.manufacturer;
  dom.caseModel.value = row.model;
  dom.caseClass.value = row.accuracy_class;
  dom.caseMax.value = `${row.max_capacity} ${row.unit}`;
  dom.caseMin.value = `${row.min_capacity} ${row.unit}`;
  dom.caseE.value = `${row.scale_interval_e} ${row.unit}`;
}

init().catch((error) => {
  document.body.innerHTML = `<main class="load-error"><h1>Unable to start R76 CertiScale</h1><p>${error.message}</p><p>Run this folder through a local server so CSV files can load.</p></main>`;
});
