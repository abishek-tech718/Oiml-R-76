# Architecture

## System Pipeline

```text
Case Setup -> Data Capture -> Rules Engine -> Report Generation -> Repository
```

## Modules

### 1. Case Management

Stores manufacturer, model, accuracy class, Max capacity, Min capacity, e, d, and lab information.

### 2. Observation Capture

Imports or records test observations for applicable OIML R76 tests.

### 3. Rules Engine

Calculates:

- error = indicated value - reference mass
- n = Max / e
- allowed MPE based on class and load band
- pass/fail based on absolute error <= MPE

### 4. Validation Engine

Checks:

- missing mandatory fields
- inconsistent error values
- result mismatch
- invalid accuracy class
- invalid environmental readings

### 5. Report Generator

Creates a structured report preview with case details, test summary, and compliance statement.

### 6. Repository

Stores approval records and generated report metadata. Allows search by company, equipment, certificate, application number, and model.

### 7. Review And Approval

Blocks final report approval until mandatory tests are complete and validation flags are resolved. In the full backend, final approval requires Reviewer or Admin role.

### 8. Admin Rule Versioning

Stores OIML tolerance rules as database records instead of hardcoding them in UI screens. A case stores the selected rule-set version so old reports remain traceable after future updates.

## Runtime Stack

This application uses:

- HTML for structure.
- CSS for UI design.
- JavaScript modules for data loading, calculations, and rendering.
- CSV files as the current data source.
- Express-style backend scaffold for API planning.
- PostgreSQL schema for production implementation.

## Full Implementation Stack

Recommended full stack:

- Frontend: React
- Backend: FastAPI or Node.js/Express
- Database: PostgreSQL
- Report generation: ReportLab or docx/pdf generation libraries
- Authentication: JWT with role-based access
