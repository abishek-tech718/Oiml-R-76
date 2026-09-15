# Full-Stack Workflow

## User Roles

- Technician creates cases, records lab conditions, enters observations, and uploads attachments.
- Reviewer checks validation flags, reviews rule explanations, and approves or rejects final reports.
- Admin manages users and versioned OIML R76 tolerance rules.

## Workflow

```text
Login
  -> Dashboard
  -> New Case / Instrument Setup
  -> Lab Conditions
  -> Test Observation Entry
  -> Compliance Results Panel
  -> Reviewer Approval
  -> PDF/DOCX Report Generation
  -> Repository And Search
  -> Admin Rule Version Management
```

## API Workflow

```text
POST /api/auth/login
GET  /api/dashboard
POST /api/instruments
POST /api/cases
POST /api/cases/:id/lab-conditions
POST /api/cases/:id/observations
GET  /api/cases/:id/compliance
POST /api/cases/:id/reports
GET  /api/reports
GET  /api/tolerance-rules
POST /api/admin/tolerance-rules
```

## Calculation Workflow

Given:

- `accuracy_class`
- `e`
- `applied_load`
- `indicated_reading`

Steps:

1. Calculate `n_intervals = applied_load / e`.
2. Select the matching rule from `ToleranceRules`.
3. Calculate `mpe = mpe_multiplier_of_e * e`.
4. Calculate `error = indicated_reading - applied_load`.
5. Mark `PASS` when `abs(error) <= mpe`.
6. Roll up all observations to test-level verdict.
7. Roll up all test-level verdicts to final case verdict.

## Operational Value

The system does not simply display a table. It provides a complete approval pipeline with traceability, role control, validation, explainable compliance logic, and report readiness.
