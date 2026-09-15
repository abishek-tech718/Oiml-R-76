# API Route Design

This folder documents the backend route design for the application.

## Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Dashboard

- `GET /api/dashboard`

Returns case counts by status, recent activity, failed observations, and pending reviewer actions.

## Instruments And Cases

- `POST /api/instruments`
- `GET /api/instruments`
- `POST /api/cases`
- `GET /api/cases/:id`
- `PATCH /api/cases/:id/status`

## Lab Conditions

- `POST /api/cases/:id/lab-conditions`
- `PATCH /api/cases/:id/lab-conditions`

## Test Observations

- `POST /api/cases/:id/observations`
- `POST /api/cases/:id/observations/import`
- `GET /api/cases/:id/observations`

## Compliance

- `GET /api/cases/:id/compliance`
- `POST /api/compliance/evaluate`
- `POST /api/compliance/rollup`

## Reports

- `POST /api/cases/:id/reports`
- `GET /api/reports`
- `GET /api/reports/:id`

## Admin

- `GET /api/admin/tolerance-rules`
- `POST /api/admin/tolerance-rules`
- `PATCH /api/admin/tolerance-rules/:id`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role`

Reviewer/Admin role is required for report finalization. Admin role is required for tolerance-rule and user-role changes.
