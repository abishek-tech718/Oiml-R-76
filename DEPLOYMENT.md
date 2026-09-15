# Deployment Guide

This system deploys as two services: a static frontend and an Express backend connected to PostgreSQL. The report output directory must be persistent because issued PDF and DOCX files are stored there.

## Before Deployment

1. Push the repository to GitHub.
2. Provision PostgreSQL through Render, Railway, or another managed provider.
3. Generate long random values for `JWT_SECRET` and `SEED_ADMIN_PASSWORD`.
4. Add a persistent disk or object-storage integration for `REPORT_OUTPUT_DIR`. A platform ephemeral filesystem is suitable only for a temporary demonstration.

## Frontend on Vercel or Netlify

The frontend is static content in `/frontend`.

### Vercel

1. Import the GitHub repository.
2. Set the project root directory to `frontend`.
3. Use no build command and set the publish/output directory to `.`.
4. Configure rewrites so `/api/*` and `/generated-reports/*` route to the backend URL, or configure an API base URL in a future frontend build step.
5. Enable automatic deployments from the production branch.

### Netlify

1. Create a new site from the GitHub repository.
2. Set base directory to `frontend` and publish directory to `.`.
3. Leave the build command empty.
4. Add proxy redirects for `/api/*` and `/generated-reports/*` to the deployed backend URL.
5. Enable continuous deployment for the production branch.

## Backend and Database on Render or Railway

Deploy `/backend` as a Node application. Use:

```text
Build command: npm ci
Start command: npm run migrate:db && npm run api
```

For larger production deployments, run migrations in a one-off release job instead of every web-service start.

Set these environment variables in the Render or Railway dashboard:

| Variable | Required value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Platform-provided port or `3000` locally |
| `DATABASE_URL` | Managed PostgreSQL connection URL |
| `JWT_SECRET` | Long random secret, never a placeholder |
| `SEED_ADMIN_PASSWORD` | Initial admin password, stored only in the platform secret manager |
| `REPORT_OUTPUT_DIR` | Writable persistent volume path, for example `/var/data/reports` |
| `REPORT_LOGO_PATH` | Optional PNG/JPEG logo path on the deployed filesystem |
| `REPORT_WATERMARK_TEXT` | Optional watermark text such as `SAMPLE` |
| `REPORT_WATERMARK_IMAGE_PATH` | Optional PNG/JPEG watermark path |

Attach the platform's PostgreSQL service to the backend and copy its internal `DATABASE_URL`. Mount a persistent disk at the report directory when using Render; on Railway, use a volume or replace filesystem storage with object storage before a long-lived production rollout.

## Cross-Origin and HTTPS

The Express backend enables CORS for local development. In production, restrict CORS to the deployed Vercel or Netlify domain. Configure the frontend proxy/rewrite to the backend HTTPS URL, and use only HTTPS for the public application.
