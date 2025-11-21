# AdviSys Installation Guide

## Overview

- Backend: Express.js (Node 20), MySQL 8, optional Mailjet email, optional speech-to-text/cloud storage
- Frontend: React + Vite
- Default backend port is `8080` (server/server.js:464)
- Client calls the backend via `VITE_API_BASE_URL` (client/.env.development:1)

## 1) Local Setup (Windows)

### Prerequisites

- Node.js 20.x and npm
- MySQL 8 (server running locally)
- PowerShell with administrator permission for MySQL install
- Optional: Docker Desktop (if you prefer containerized backend)

### Clone and install dependencies

```powershell
git clone <YOUR_REPOSITORY_URL>
cd AdviSys
cd server; npm install
cd ..\client; npm install
```

### Configure backend environment

- Create `server/.env` with at least:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=<your_mysql_user>
DB_PASSWORD=<your_mysql_password>
DB_NAME=advisys
JWT_SECRET=<random-long-secret>
APP_BASE_URL=http://localhost:5173
EMAIL_VERIFICATION_DISABLED=true
```

- Notes:
  - `APP_BASE_URL` or `CORS_ORIGINS` controls allowed origins for CORS (server/server.js:11)
  - Set `EMAIL_VERIFICATION_DISABLED=true` to bypass email verification locally (server/routes/auth.js:23)
  - Do not commit `.env` — it’s ignored by `.gitignore` (.gitignore:51)

### Create and initialize database

1. Create a database in MySQL:

```sql
CREATE DATABASE advisys CHARACTER SET utf8mb4;
```

2. Apply schema:

```powershell
cd server
npm run db:init
```

- This runs `server/db/init.js` and applies `server/db/schema.sql` (server/db/init.js:27)

3. Optional sample data:

```powershell
npm run db:seed
```

4. Optional admin user:

```powershell
npm run db:add-admin
```

- Or enable auto seeding on server start with `SEED_ADMIN_ON_START=true` (server/server.js:471)

### Run the backend

```powershell
cd server
npm run dev
```

- Server listens on `http://localhost:8080` (server/server.js:464)
- Health check: `GET http://localhost:8080/healthz` (server/server.js:141)

### Configure and run the frontend

- Set `client/.env.development`:

```
VITE_API_BASE_URL=http://localhost:8080
```

```powershell
cd client
npm run dev
```

- Vite serves at `http://localhost:5173`
- If requests are blocked by CORS, ensure `APP_BASE_URL` or `CORS_ORIGINS` includes `http://localhost:5173` (server/server.js:11)

### Optional: Run backend in Docker locally

```powershell
cd server
docker build -t advisys-api .
docker run --name advisys-api -p 8080:8080 --env-file .env advisys-api
```

- If connecting to your host MySQL from Docker on Windows, set `DB_HOST=host.docker.internal`

## 2) Cloud Setup — Backend on Google Cloud Run

### Prerequisites

- gcloud CLI installed and authenticated: `gcloud auth login`
- Set project and region: `gcloud config set project <PROJECT_ID>`
- Enable services: Cloud Run, Cloud Build, Artifact Registry, Cloud SQL Admin (if using Cloud SQL)

### Provision MySQL

- Option A: Cloud SQL (recommended)
  - Create a MySQL instance and database
  - Note the `INSTANCE_CONNECTION_NAME` (`<PROJECT>:<REGION>:<INSTANCE>`)
- Option B: External MySQL (e.g., managed VM) with public or private endpoint

### Prepare environment variables

- Minimal required:
  - `JWT_SECRET=<random-long-secret>`
  - `APP_BASE_URL=https://<your-frontend-domain>`
  - Database:
    - Cloud SQL via socket: `INSTANCE_CONNECTION_NAME`, `DB_SOCKET_PATH=/cloudsql`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (server/db/pool.js:11, 63–67)
    - External DB via TCP: `DB_HOST`, `DB_PORT=3306`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (server/db/pool.js:70–74)
  - Optional email (production): `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAIL_FROM`, `MAIL_FROM_NAME` (server/services/email.js:1)

### Deploy to Cloud Run

```powershell
cd server
gcloud run deploy advisys-api --source . --region <REGION> --project <PROJECT_ID> --allow-unauthenticated \
  --set-env-vars=JWT_SECRET=<secret>,APP_BASE_URL=https://<frontend-domain>,DB_USER=<user>,DB_PASSWORD=<pwd>,DB_NAME=<db>
```

- If using Cloud SQL, also attach the instance:

```powershell
gcloud run services update advisys-api --region <REGION> --project <PROJECT_ID> \
  --add-cloudsql-instances=<PROJECT>:<REGION>:<INSTANCE> \
  --set-env-vars=INSTANCE_CONNECTION_NAME=<PROJECT>:<REGION>:<INSTANCE>,DB_SOCKET_PATH=/cloudsql
```

- The Dockerfile exposes `8080` and the app reads `PORT` injected by Cloud Run (server/Dockerfile:12, server/server.js:464)

### Initialize the database

- Run locally pointing to cloud DB:

```powershell
cd server
setx DB_HOST <cloud-db-host-or-socket>
setx DB_USER <user>
setx DB_PASSWORD <pwd>
setx DB_NAME <db>
npm run db:init
npm run db:add-admin
```

- Or apply `server/db/schema.sql` via a SQL client

### Verify

- Open the Cloud Run service URL and call `/healthz`
- Email diagnostics: `/api/diag-email` or `/api/diag/email` (server/server.js:142, server/routes/diagnostics.js:5)

## 3) Frontend Deployment (Firebase Hosting)

### Build

```powershell
cd client
npm run build
```

- Ensure `client/.env.production` sets `VITE_API_BASE_URL` to your Cloud Run service URL (client/.env.production:2). The app reads this in many pages/components (for example `client/src/pages/admin/AdminDepartmentSettings.jsx:13`).

### Preview locally

```powershell
cd client
npm run preview
```

- Local preview runs at `http://localhost:4173` (client/playwright.config.ts:12)
- Confirm pages load and API calls hit your Cloud Run backend.

### Deploy

```powershell
firebase login
firebase use <PROJECT_ID>
firebase deploy --only hosting:<site-name>
```

- Sites are defined in `firebase.json` (firebase.json:4, 24) and output points to `client/dist` (firebase.json:5)
- SPA rewrites route all paths to `/index.html` (firebase.json:11)

### Choose your Hosting site

- Available hosting sites in the repo:
  - `gen-lang-client-0246208027` (firebase.json:4)
  - `advisys-app-1763318920` (firebase.json:24)
- Deploy to a specific site:

```powershell
firebase deploy --only hosting:advisys-app-1763318920
```

### Custom domain and HTTPS

- In Firebase Hosting, add your custom domain and complete verification
- Update backend CORS allowlist to your domain via `APP_BASE_URL=https://<your-domain>` (server/server.js:11)
- Ensure `VITE_API_BASE_URL` points to your Cloud Run HTTPS URL in `client/.env.production`

### CORS

- Backend must allow your hosting domain via `APP_BASE_URL` or `CORS_ORIGINS` (server/server.js:11)

### Post-deploy checks

- Open your Hosting URL and verify pages load
- Inspect browser network calls; they should target `VITE_API_BASE_URL`
- If you see 403 or CORS errors, verify `APP_BASE_URL`/`CORS_ORIGINS` and that Cloud Run allows unauthenticated access

## 4) Environment Variables Reference

- Backend core:
  - `PORT` (Cloud Run injects; local defaults to 8080) (server/server.js:464)
  - `APP_BASE_URL` or `CORS_ORIGINS` (comma-separated origins) (server/server.js:11)
  - `JWT_SECRET` (production-required)
  - Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` or `INSTANCE_CONNECTION_NAME` + `DB_SOCKET_PATH` (server/db/pool.js:11, 63–74)
  - Admin seed: `SEED_ADMIN_ON_START`, `SEED_ADMIN_RESET`, `ADMIN_EMAIL`, `ADMIN_FULL_NAME`, `ADMIN_PASSWORD` (server/server.js:471–505)
  - Email: `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAIL_FROM`, `MAIL_FROM_NAME` (server/services/email.js:1)
  - Optional STT/storage keys if you enable those services

- Frontend:
  - `VITE_API_BASE_URL` (client -> backend URL) (client/.env.development:1)

## 5) Database Initialization and Admin Seeding

- Apply schema: `npm run db:init` (server/db/init.js:27)
- Create admin: `npm run db:add-admin` (server/db/add_admin.js:7)
- Auto-admin on startup: `SEED_ADMIN_ON_START=true` (server/server.js:471)

## 6) Verification and Smoke Tests

- Backend:
  - `GET /` returns a simple running message (server/server.js:136)
  - `GET /healthz` returns `{ ok: true }` (server/server.js:141)
- Frontend:
  - Start Vite and login with seeded admin; ensure API calls are hitting `VITE_API_BASE_URL`

## 7) Troubleshooting

- CORS blocked:
  - Ensure `APP_BASE_URL` or `CORS_ORIGINS` includes your frontend origin (server/server.js:11)

- DB connection errors:
  - Cloud SQL: confirm `--add-cloudsql-instances` and `INSTANCE_CONNECTION_NAME` + `DB_SOCKET_PATH=/cloudsql` (server/db/pool.js:11, 63–67)
  - External DB: validate `DB_HOST`, `DB_PORT`, network/firewall rules (server/db/pool.js:70–74)

- Email not sending:
  - Set Mailjet env vars and test `/api/diag-email` or `/api/diag/email` (server/server.js:142; server/routes/diagnostics.js:5)

- Login 403 due to verification:
  - For local dev, set `EMAIL_VERIFICATION_DISABLED=true` (server/routes/auth.js:23)

- Port conflicts:
  - Backend uses `8080`; change via `PORT` if needed (server/server.js:464)

## 8) Security Notes

- Never commit secrets to the repo; `.env` is ignored by Git (.gitignore:51)
- Use different `JWT_SECRET` per environment
- Limit DB credentials to least privilege