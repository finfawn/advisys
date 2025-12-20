# AdviSys Installation Guide

## Overview

- **Backend**: Express.js (Node 20), MySQL 8
  - Optional integrations: Mailjet (email), Firebase (auth/storage), Stream (video), Google Cloud (storage/AI)
- **Frontend**: React + Vite + Tailwind CSS
- Default backend port is `8080`
- Client calls the backend via `VITE_API_BASE_URL`

## 1. Prerequisites

- **Node.js**: Version 20.x or higher
- **MySQL**: Version 8.0 or higher
- **npm**: Installed with Node.js
- **Git**: For cloning the repository

## 2. Setup Steps

### Clone and Install Dependencies

```powershell
git clone <YOUR_REPOSITORY_URL>
cd AdviSys

# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ..\client
npm install
```

### Configure Environment Variables

Since `.env` files are not committed, you need to create them manually.

**Server:**

1. Navigate to the `server` directory.
2. Create a file named `.env`.
3. Add the following configuration (adjust values as needed):

   ```properties
   # Database Configuration
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=advisys
   
   # App Secrets
   JWT_SECRET=your_random_secret_key
   ADMIN_PASSWORD=your_admin_password
   ADMIN_EMAIL=admin@example.com
   APP_BASE_URL=http://localhost:5173
   
   # Optional: Email Verification (set to true to disable sending real emails)
   EMAIL_VERIFICATION_DISABLED=false
   
   # Optional: External Integrations (leave blank if not using)
   # MAILJET_API_KEY=...
   # MAILJET_API_SECRET=...
   # STREAM_API_KEY=...
   # STREAM_API_SECRET=...
   # GOOGLE_APPLICATION_CREDENTIALS=...
   # FIREBASE_PRIVATE_KEY=...
   ```

**Client:**

1. Navigate to the `client` directory.
2. Create a file named `.env`.
3. Add the following configuration:

   ```properties
   # API URL (matches server port)
   VITE_API_BASE_URL=http://localhost:8080
   
   # Optional: Firebase Config (if using Firebase features)
   # VITE_FIREBASE_API_KEY=...
   # VITE_FIREBASE_AUTH_DOMAIN=...
   # VITE_FIREBASE_PROJECT_ID=...
   ```

### Database Setup

1. Create the database in MySQL:
   ```sql
   CREATE DATABASE advisys CHARACTER SET utf8mb4;
   ```

2. Initialize the schema:
   ```powershell
   cd server
   npm run db:init
   ```
   *This runs `server/db/init.js` and applies `server/db/schema.sql`.*

3. (Optional) Seed sample data:
   ```powershell
   npm run db:seed
   ```

4. Create an Admin User:
   ```powershell
   npm run db:add-admin
   ```
   *This creates a default admin user based on your `.env` configuration (ADMIN_EMAIL/ADMIN_PASSWORD).*

## 3. Running the Application

**Backend:**

```powershell
cd server
npm run dev
```
- Runs on `http://localhost:8080`
- Health check: `http://localhost:8080/healthz`

**Frontend:**

```powershell
cd client
npm run dev
```
- Usually runs on `http://localhost:5173`
- Open this URL in your browser to start using AdviSys.

## 4. Additional Configuration

### Email Verification
To test without sending real emails, set `EMAIL_VERIFICATION_DISABLED=true` in `server/.env`.

### Video & AI Features
If using video conferencing (Stream/GetStream.io) or AI summaries, ensure the respective API keys are correctly set in `server/.env`.
