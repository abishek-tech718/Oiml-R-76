# R76 CertiScale

R76 CertiScale is a Legal Metrology workflow application for testing and approving Non-Automatic Weighing Instruments (NAWI) against OIML R76. It provides controlled access, role-based case progression, instrument-specific test applicability, environmental readiness gates, traceable MPE calculations, a final-case repository, and issued PDF/DOCX reports.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Udhayanithi-U/R-76-CertiScale)

## Project Layout

```text
R76-CertiScale-SIH/
  frontend/                 Static application UI, styles, datasets, Docker image
  backend/                  Express API, PostgreSQL schema, engines, tests, report generation
  docs/                     Project and domain documentation
  docker-compose.yml        Local frontend, backend, and PostgreSQL stack
  .env.example              Safe environment-variable template
```

## Requirements

- Node.js 20 or later
- PostgreSQL 16 for the production-style database path, or Docker Desktop for the complete local stack

## Environment Setup

Copy `.env.example` to `.env` and set values appropriate to the environment. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random token-signing secret |
| `SEED_ADMIN_PASSWORD` | Initial seeded administrator password |
| `REPORT_OUTPUT_DIR` | Writable folder for issued PDF and DOCX files |
| `REPORT_LOGO_PATH` | Optional PNG/JPEG logo path, relative to project root or absolute |
| `REPORT_WATERMARK_TEXT` | Optional report watermark text |
| `REPORT_WATERMARK_IMAGE_PATH` | Optional PNG/JPEG watermark image path |
| `ROLE_SELECTOR_ENABLED` | `true` for the local role selector; set `false` in production |

## Run Locally

Install backend dependencies:

```powershell
cd backend
npm install
cd ..
```

Create the PostgreSQL schema and seed OIML rules:

```powershell
npm run migrate:db
```

Start the integrated application, with Express serving both UI and API:

```powershell
npm run api
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

For static frontend work in a separate terminal:

```powershell
npm run frontend
```

The static frontend is available at [http://127.0.0.1:5173](http://127.0.0.1:5173). Use the integrated application for the complete authenticated workflow.

## Run With Docker

```powershell
docker compose up --build
```

Docker creates PostgreSQL, migrates and seeds it before starting the API, and starts the proxied frontend. Open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Tests

Run all calculation, workflow, environmental, and repository tests:

```powershell
npm test
```

## Security Notes

Login uses JWT tokens; account requests remain pending until administrator approval; API routes enforce active status and role ownership. In deployed environments, always provide strong `JWT_SECRET` and `SEED_ADMIN_PASSWORD` values, use a managed PostgreSQL database, persist `REPORT_OUTPUT_DIR`, and terminate traffic with HTTPS.
