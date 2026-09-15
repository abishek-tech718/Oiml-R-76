import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localStorePath = path.join(__dirname, "local-case-data.json");

export const DEFAULT_APPLICABILITY_RULES = [
  { id: "TA-01", test_type: "weighing_accuracy_increasing_load", always_applies: true },
  { id: "TA-02", test_type: "weighing_accuracy_decreasing_load", always_applies: true },
  { id: "TA-03", test_type: "repeatability", always_applies: true },
  { id: "TA-04", test_type: "eccentricity", always_applies: true },
  { id: "TA-05", test_type: "discrimination", always_applies: true },
  { id: "TA-06", test_type: "zero_setting", always_applies: true },
  { id: "TA-07", test_type: "zero_tracking", always_applies: true },
  { id: "TA-08", test_type: "temperature_static", always_applies: true },
  { id: "TA-09", test_type: "humidity_steady_state", always_applies: true },
  { id: "TA-10", test_type: "tilt", always_applies: true },
  { id: "TA-11", test_type: "tare_operation", applies_if_feature: "tare", always_applies: false },
  { id: "TA-12", test_type: "voltage_variation", applies_if_electronic: true, always_applies: false },
  { id: "TA-13", test_type: "power_supply_variation", applies_if_electronic: true, always_applies: false },
  { id: "TA-14", test_type: "electrostatic_discharge", applies_if_electronic: true, always_applies: false },
  { id: "TA-15", test_type: "electrical_fast_transients", applies_if_electronic: true, always_applies: false },
  { id: "TA-16", test_type: "electromagnetic_immunity", applies_if_electronic: true, always_applies: false },
];

export const DEFAULT_ENVIRONMENTAL_LIMITS = DEFAULT_APPLICABILITY_RULES.map((rule, index) => ({
  id: `EL-${String(index + 1).padStart(2, "0")}`,
  test_type: rule.test_type,
  min_temperature: -10,
  max_temperature: 40,
  min_humidity: 0,
  max_humidity: 100,
  min_pressure: 800,
  max_pressure: 1100,
}));

export const DEFAULT_TOLERANCE_RULES = [
  ["I", 0, 50000, 0.5], ["I", 50000, 200000, 1], ["I", 200000, null, 1.5],
  ["II", 0, 5000, 0.5], ["II", 5000, 20000, 1], ["II", 20000, 100000, 1.5],
  ["III", 0, 500, 0.5], ["III", 500, 2000, 1], ["III", 2000, 10000, 1.5],
  ["IIII", 0, 50, 0.5], ["IIII", 50, 200, 1], ["IIII", 200, 1000, 1.5],
].map(([accuracy_class, load_band_min_e, load_band_max_e, mpe_multiplier_of_e], index) => ({ id: `TR-${index + 1}`, accuracy_class, load_band_min_e, load_band_max_e, mpe_multiplier_of_e, rule_set_version: "R76-1:2006" }));

function camelCase(row) {
  return {
    id: row.id,
    instrumentId: row.instrumentId ?? row.instrument_id,
    status: row.status,
    createdBy: row.createdBy ?? row.created_by,
    assignedRole: row.assignedRole ?? row.assigned_role,
    createdAt: row.createdAt ?? row.created_at,
    applicableTestTypes: row.applicableTestTypes ?? row.applicable_test_types ?? [],
    manufacturerName: row.manufacturerName ?? row.manufacturer_name,
    modelNumber: row.modelNumber ?? row.model_number,
  };
}

function contextFromRow(row) {
  return {
    case: camelCase(row),
    instrument: {
      id: row.instrument_id,
      manufacturer_name: row.manufacturer_name,
      manufacturer_address: row.manufacturer_address,
      model_number: row.model_number,
      max_capacity: Number(row.max_capacity),
      min_capacity: Number(row.min_capacity),
      actual_scale_interval_d: Number(row.actual_scale_interval_d),
      accuracy_class: row.accuracy_class,
      verification_scale_interval_e: Number(row.verification_scale_interval_e),
      is_electronic: row.is_electronic,
      declared_features: row.declared_features ?? [],
    },
  };
}

export async function createCaseStore() {
  return process.env.DATABASE_URL ? createPostgresStore(process.env.DATABASE_URL) : createLocalStore();
}

function createPostgresStore(connectionString) {
  const pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined });
  return {
    mode: "PostgreSQL",
    async initialize() {},
    async listApplicabilityRules() { return (await pool.query("SELECT * FROM test_applicability_rules ORDER BY id")).rows; },
    async listToleranceRules() { return (await pool.query("SELECT * FROM tolerance_rules ORDER BY accuracy_class, load_band_min_e")).rows; },
    async getEnvironmentalLimit(testType) { const result = await pool.query("SELECT * FROM environmental_limits WHERE test_type = $1", [testType]); return result.rows[0] ?? null; },
    async createInstrumentAndCase({ instrument, caseRecord }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO instruments (id,manufacturer_name,manufacturer_address,model_number,max_capacity,min_capacity,verification_scale_interval_e,actual_scale_interval_d,accuracy_class,is_electronic,declared_features,number_of_verification_intervals) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [instrument.id, instrument.manufacturerName, instrument.manufacturerAddress, instrument.modelNumber, instrument.maxCapacity, instrument.minCapacity, instrument.e, instrument.d, instrument.accuracyClass, instrument.isElectronic, JSON.stringify(instrument.declaredFeatures), instrument.n]);
        const result = await client.query(`INSERT INTO cases (id,instrument_id,status,created_by,assigned_role,created_at,applicable_test_types) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [caseRecord.id, instrument.id, caseRecord.status, caseRecord.createdBy, caseRecord.assignedRole, caseRecord.createdAt, JSON.stringify(caseRecord.applicableTestTypes)]);
        await client.query(`INSERT INTO audit_logs (id,case_id,user_id,action,"timestamp") VALUES ($1,$2,$3,$4,$5)`, [`AUD-${crypto.randomUUID()}`, caseRecord.id, caseRecord.createdBy, "Case created", caseRecord.createdAt]);
        await client.query("COMMIT");
        return camelCase(result.rows[0]);
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    },
    async listCases(filter) {
      const where = [];
      const values = [];
      if (filter.statuses) { values.push(filter.statuses); where.push(`c.status = ANY($${values.length})`); }
      if (filter.assignedRole) { values.push(filter.assignedRole); where.push(`c.assigned_role = $${values.length}`); }
      const query = `SELECT c.*, i.manufacturer_name, i.model_number FROM cases c JOIN instruments i ON i.id = c.instrument_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY c.created_at DESC`;
      return (await pool.query(query, values)).rows.map(camelCase);
    },
    async listRepositoryCases({ manufacturer = "", model = "", dateFrom = "", dateTo = "" }) {
      const values = [["approved", "report_issued", "failed"]];
      const where = ["c.status = ANY($1)"];
      if (manufacturer) { values.push(`%${manufacturer}%`); where.push(`i.manufacturer_name ILIKE $${values.length}`); }
      if (model) { values.push(`%${model}%`); where.push(`i.model_number ILIKE $${values.length}`); }
      if (dateFrom) { values.push(dateFrom); where.push(`c.created_at >= $${values.length}::date`); }
      if (dateTo) { values.push(dateTo); where.push(`c.created_at < ($${values.length}::date + INTERVAL '1 day')`); }
      const query = `SELECT c.*, i.manufacturer_name, i.model_number FROM cases c JOIN instruments i ON i.id = c.instrument_id WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC`;
      return (await pool.query(query, values)).rows.map(camelCase);
    },
    async countByStatus() { return (await pool.query("SELECT status, COUNT(*)::int AS count FROM cases GROUP BY status")).rows; },
    async findCase(id) { const result = await pool.query("SELECT * FROM cases WHERE id = $1", [id]); return result.rows[0] ? camelCase(result.rows[0]) : null; },
    async getCaseContext(id) {
      const result = await pool.query("SELECT c.*, i.manufacturer_name, i.manufacturer_address, i.model_number, i.max_capacity, i.min_capacity, i.actual_scale_interval_d, i.accuracy_class, i.verification_scale_interval_e, i.is_electronic, i.declared_features FROM cases c JOIN instruments i ON i.id = c.instrument_id WHERE c.id = $1", [id]);
      return result.rows[0] ? contextFromRow(result.rows[0]) : null;
    },
    async getRepositoryData(id) {
      const context = await this.getCaseContext(id);
      if (!context) return null;
      const observations = await this.listObservations(id);
      return { ...context, observations };
    },
    async getReportData(id) {
      const context = await this.getCaseContext(id);
      if (!context) return null;
      const [observations, labConditions, auditLogs] = await Promise.all([
        this.listObservations(id),
        pool.query("SELECT * FROM lab_conditions WHERE case_id = $1 ORDER BY recorded_at", [id]).then((result) => result.rows),
        pool.query('SELECT * FROM audit_logs WHERE case_id = $1 ORDER BY "timestamp"', [id]).then((result) => result.rows),
      ]);
      return { ...context, observations, labConditions, auditLogs };
    },
    async createReport(report) {
      const result = await pool.query("INSERT INTO reports (id,case_id,generated_at,pdf_path,docx_path) VALUES ($1,$2,$3,$4,$5) RETURNING *", [report.id, report.caseId, report.generatedAt, report.pdfPath, report.docxPath]);
      return result.rows[0];
    },
    async latestReportForCase(caseId) {
      const result = await pool.query("SELECT * FROM reports WHERE case_id = $1 ORDER BY generated_at DESC LIMIT 1", [caseId]);
      return result.rows[0] ?? null;
    },
    async addLabCondition(condition) {
      const result = await pool.query("INSERT INTO lab_conditions (id,case_id,test_type,temperature,humidity,atmospheric_pressure,recorded_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *", [condition.id, condition.caseId, condition.testType, condition.temperature, condition.humidity, condition.atmosphericPressure, condition.recordedAt]);
      return result.rows[0];
    },
    async latestLabCondition(caseId, testType) {
      const result = await pool.query("SELECT * FROM lab_conditions WHERE case_id = $1 AND test_type = $2 ORDER BY recorded_at DESC LIMIT 1", [caseId, testType]);
      return result.rows[0] ?? null;
    },
    async addObservation(observation) {
      const result = await pool.query("INSERT INTO test_observations (id,case_id,test_type,applied_load,indicated_reading,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [observation.id, observation.caseId, observation.testType, observation.appliedLoad, observation.indicatedReading, observation.notes]);
      return result.rows[0];
    },
    async listObservations(caseId, testType = null) {
      const result = await pool.query(`SELECT * FROM test_observations WHERE case_id = $1 ${testType ? "AND test_type = $2" : ""} ORDER BY id`, testType ? [caseId, testType] : [caseId]);
      return result.rows;
    },
    async transitionCase({ id, status, assignedRole, userId, action }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query("UPDATE cases SET status = $1, assigned_role = $2 WHERE id = $3 RETURNING *", [status, assignedRole, id]);
        await client.query(`INSERT INTO audit_logs (id,case_id,user_id,action,"timestamp") VALUES ($1,$2,$3,$4,$5)`, [`AUD-${crypto.randomUUID()}`, id, userId, action, new Date().toISOString()]);
        await client.query("COMMIT");
        return camelCase(result.rows[0]);
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    },
  };
}

function createLocalStore() {
  async function readStore() { return existsSync(localStorePath) ? JSON.parse(await readFile(localStorePath, "utf8")) : { instruments: [], cases: [], auditLogs: [], labConditions: [], observations: [], reports: [], applicabilityRules: DEFAULT_APPLICABILITY_RULES, environmentalLimits: DEFAULT_ENVIRONMENTAL_LIMITS, toleranceRules: DEFAULT_TOLERANCE_RULES }; }
  async function saveStore(store) { await mkdir(path.dirname(localStorePath), { recursive: true }); await writeFile(localStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8"); }
  return {
    mode: "local persistent development store",
    async initialize() { const store = await readStore(); store.applicabilityRules ??= DEFAULT_APPLICABILITY_RULES; store.environmentalLimits ??= DEFAULT_ENVIRONMENTAL_LIMITS; store.toleranceRules ??= DEFAULT_TOLERANCE_RULES; store.labConditions ??= []; store.observations ??= []; store.reports ??= []; await saveStore(store); },
    async listApplicabilityRules() { return (await readStore()).applicabilityRules; },
    async listToleranceRules() { return (await readStore()).toleranceRules; },
    async getEnvironmentalLimit(testType) { return (await readStore()).environmentalLimits.find((limit) => limit.test_type === testType) ?? null; },
    async createInstrumentAndCase({ instrument, caseRecord }) { const store = await readStore(); store.instruments.push(instrument); store.cases.push(caseRecord); store.auditLogs.push({ id: `AUD-${crypto.randomUUID()}`, caseId: caseRecord.id, userId: caseRecord.createdBy, action: "Case created", timestamp: caseRecord.createdAt }); await saveStore(store); return camelCase(caseRecord); },
    async listCases(filter) { const store = await readStore(); return store.cases.filter((item) => (!filter.statuses || filter.statuses.includes(item.status)) && (!filter.assignedRole || item.assignedRole === filter.assignedRole)).map((item) => camelCase({ ...item, manufacturerName: store.instruments.find((instrument) => instrument.id === item.instrumentId)?.manufacturerName, modelNumber: store.instruments.find((instrument) => instrument.id === item.instrumentId)?.modelNumber })); },
    async listRepositoryCases({ manufacturer = "", model = "", dateFrom = "", dateTo = "" }) {
      const store = await readStore();
      return store.cases.filter((caseRecord) => {
        const instrument = store.instruments.find((item) => item.id === caseRecord.instrumentId);
        const createdAt = String(caseRecord.createdAt ?? "").slice(0, 10);
        return ["approved", "report_issued", "failed"].includes(caseRecord.status)
          && (!manufacturer || instrument?.manufacturerName?.toLowerCase().includes(manufacturer.toLowerCase()))
          && (!model || instrument?.modelNumber?.toLowerCase().includes(model.toLowerCase()))
          && (!dateFrom || createdAt >= dateFrom)
          && (!dateTo || createdAt <= dateTo);
      }).map((caseRecord) => {
        const instrument = store.instruments.find((item) => item.id === caseRecord.instrumentId);
        return camelCase({ ...caseRecord, manufacturerName: instrument?.manufacturerName, modelNumber: instrument?.modelNumber });
      });
    },
    async countByStatus() { const store = await readStore(); return Object.entries(store.cases.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] ?? 0) + 1 }), {})).map(([status, count]) => ({ status, count })); },
    async findCase(id) { const item = (await readStore()).cases.find((caseRecord) => caseRecord.id === id); return item ? camelCase(item) : null; },
    async getCaseContext(id) { const store = await readStore(); const caseRecord = store.cases.find((item) => item.id === id); const instrument = store.instruments.find((item) => item.id === caseRecord?.instrumentId); return caseRecord && instrument ? { case: camelCase(caseRecord), instrument: { id: instrument.id, manufacturer_name: instrument.manufacturerName, manufacturer_address: instrument.manufacturerAddress, model_number: instrument.modelNumber, max_capacity: instrument.maxCapacity, min_capacity: instrument.minCapacity, actual_scale_interval_d: instrument.d, accuracy_class: instrument.accuracyClass, verification_scale_interval_e: instrument.e, is_electronic: instrument.isElectronic, declared_features: instrument.declaredFeatures } } : null; },
    async getRepositoryData(id) { const context = await this.getCaseContext(id); if (!context) return null; return { ...context, observations: (await readStore()).observations.filter((row) => row.case_id === id) }; },
    async getReportData(id) { const context = await this.getCaseContext(id); if (!context) return null; const store = await readStore(); return { ...context, observations: store.observations.filter((row) => row.case_id === id), labConditions: store.labConditions.filter((row) => row.case_id === id), auditLogs: store.auditLogs.filter((row) => row.caseId === id).sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp))) }; },
    async createReport(report) { const store = await readStore(); store.reports ??= []; store.reports.push(report); await saveStore(store); return report; },
    async latestReportForCase(caseId) { const reports = (await readStore()).reports ?? []; return reports.filter((report) => report.caseId === caseId).sort((left, right) => String(right.generatedAt).localeCompare(String(left.generatedAt)))[0] ?? null; },
    async addLabCondition(condition) { const store = await readStore(); const row = { id: condition.id, case_id: condition.caseId, test_type: condition.testType, temperature: condition.temperature, humidity: condition.humidity, atmospheric_pressure: condition.atmosphericPressure, recorded_at: condition.recordedAt }; store.labConditions.push(row); await saveStore(store); return row; },
    async latestLabCondition(caseId, testType) { const rows = (await readStore()).labConditions.filter((row) => row.case_id === caseId && row.test_type === testType); return rows.at(-1) ?? null; },
    async addObservation(observation) { const store = await readStore(); const row = { id: observation.id, case_id: observation.caseId, test_type: observation.testType, applied_load: observation.appliedLoad, indicated_reading: observation.indicatedReading, notes: observation.notes }; store.observations.push(row); await saveStore(store); return row; },
    async listObservations(caseId, testType = null) { return (await readStore()).observations.filter((row) => row.case_id === caseId && (!testType || row.test_type === testType)); },
    async transitionCase({ id, status, assignedRole, userId, action }) { const store = await readStore(); const caseRecord = store.cases.find((item) => item.id === id); if (!caseRecord) return null; caseRecord.status = status; caseRecord.assignedRole = assignedRole; store.auditLogs.push({ id: `AUD-${crypto.randomUUID()}`, caseId: id, userId, action, timestamp: new Date().toISOString() }); await saveStore(store); return camelCase(caseRecord); },
  };
}
