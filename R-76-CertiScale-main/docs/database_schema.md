# Database Schema

## users

```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('TECHNICIAN', 'REVIEWER', 'ADMIN')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## instruments

```sql
CREATE TABLE instruments (
  instrument_id TEXT PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  accuracy_class TEXT NOT NULL,
  max_capacity NUMERIC NOT NULL,
  min_capacity NUMERIC NOT NULL,
  scale_interval_e NUMERIC NOT NULL,
  actual_scale_interval_d NUMERIC,
  unit TEXT NOT NULL
);
```

## test_cases

```sql
CREATE TABLE test_cases (
  case_id TEXT PRIMARY KEY,
  instrument_id TEXT REFERENCES instruments(instrument_id),
  lab TEXT NOT NULL,
  operator_id TEXT REFERENCES users(user_id),
  ambient_temp_c NUMERIC,
  ambient_humidity_pct NUMERIC,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## observations

```sql
CREATE TABLE observations (
  obs_id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES test_cases(case_id),
  test_type TEXT NOT NULL,
  test_cycle INTEGER,
  load_position TEXT,
  reference_mass NUMERIC NOT NULL,
  indicated_value NUMERIC NOT NULL,
  error NUMERIC NOT NULL,
  mpe_allowed NUMERIC NOT NULL,
  n_intervals NUMERIC NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('PASS', 'FAIL'))
);
```

## reports

```sql
CREATE TABLE reports (
  report_id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES test_cases(case_id),
  report_status TEXT NOT NULL,
  final_verdict TEXT NOT NULL,
  generated_by TEXT REFERENCES users(user_id),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pdf_path TEXT,
  docx_path TEXT
);
```

## approval_register

```sql
CREATE TABLE approval_register (
  serial_no INTEGER PRIMARY KEY,
  issue_date DATE,
  file_number TEXT,
  company_name TEXT,
  equipment TEXT,
  certificate_no TEXT,
  online_application_no TEXT,
  pdf_url TEXT
);
```
