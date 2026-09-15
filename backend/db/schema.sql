-- R76 CertiScale core database schema.
-- Identifiers are application-generated text IDs so the auth store and
-- operational tables share compatible foreign keys.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('technician', 'lab_supervisor', 'reviewer', 'director', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'deactivated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instruments (
  id TEXT PRIMARY KEY,
  manufacturer_name TEXT NOT NULL,
  manufacturer_address TEXT,
  model_number TEXT NOT NULL,
  max_capacity NUMERIC NOT NULL CHECK (max_capacity > 0),
  min_capacity NUMERIC NOT NULL CHECK (min_capacity >= 0),
  verification_scale_interval_e NUMERIC NOT NULL CHECK (verification_scale_interval_e > 0),
  actual_scale_interval_d NUMERIC CHECK (actual_scale_interval_d > 0),
  accuracy_class TEXT NOT NULL CHECK (accuracy_class IN ('I', 'II', 'III', 'IIII')),
  is_electronic BOOLEAN NOT NULL,
  declared_features JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(declared_features) = 'array'),
  number_of_verification_intervals NUMERIC NOT NULL CHECK (number_of_verification_intervals > 0)
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL REFERENCES instruments(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing_in_progress', 'pending_supervisor_check', 'pending_review', 'pending_director_approval', 'approved', 'report_issued', 'failed')),
  created_by TEXT NOT NULL REFERENCES users(id),
  assigned_role TEXT NOT NULL CHECK (assigned_role IN ('technician', 'lab_supervisor', 'reviewer', 'director', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applicable_test_types JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(applicable_test_types) = 'array')
);

CREATE TABLE IF NOT EXISTS lab_conditions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  temperature NUMERIC NOT NULL,
  humidity NUMERIC NOT NULL,
  atmospheric_pressure NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_observations (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  applied_load NUMERIC NOT NULL,
  indicated_reading NUMERIC NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS tolerance_rules (
  id TEXT PRIMARY KEY,
  accuracy_class TEXT NOT NULL CHECK (accuracy_class IN ('I', 'II', 'III', 'IIII')),
  load_band_min_e NUMERIC NOT NULL CHECK (load_band_min_e >= 0),
  load_band_max_e NUMERIC CHECK (load_band_max_e > load_band_min_e),
  mpe_multiplier_of_e NUMERIC NOT NULL CHECK (mpe_multiplier_of_e >= 0),
  rule_set_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS environmental_limits (
  id TEXT PRIMARY KEY,
  test_type TEXT NOT NULL UNIQUE,
  min_temperature NUMERIC,
  max_temperature NUMERIC,
  min_humidity NUMERIC,
  max_humidity NUMERIC,
  min_pressure NUMERIC,
  max_pressure NUMERIC,
  CHECK (min_temperature IS NULL OR max_temperature IS NULL OR min_temperature <= max_temperature),
  CHECK (min_humidity IS NULL OR max_humidity IS NULL OR min_humidity <= max_humidity),
  CHECK (min_pressure IS NULL OR max_pressure IS NULL OR min_pressure <= max_pressure)
);

CREATE TABLE IF NOT EXISTS test_applicability_rules (
  id TEXT PRIMARY KEY,
  test_type TEXT NOT NULL,
  applies_if_electronic BOOLEAN,
  applies_if_feature TEXT,
  always_applies BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_path TEXT,
  docx_path TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Retained from the existing project schema for case supporting documents.
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  description TEXT
);

CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
CREATE INDEX IF NOT EXISTS cases_instrument_id_idx ON cases(instrument_id);
CREATE INDEX IF NOT EXISTS lab_conditions_case_id_idx ON lab_conditions(case_id);
CREATE INDEX IF NOT EXISTS test_observations_case_id_idx ON test_observations(case_id);
CREATE INDEX IF NOT EXISTS reports_case_id_idx ON reports(case_id);
CREATE INDEX IF NOT EXISTS audit_logs_case_id_idx ON audit_logs(case_id);
