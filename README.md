# ReachInbox Email Scheduler & Dashboard

A production-shaped email scheduling platform featuring time-delayed queue processing, strict per-sender rate limiting, 2-layer idempotency checks, process restart survival, live queue monitoring, Slack alert webhooks, and an interactive React dashboard.

---

## 📐 System Architecture & Workflow

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ React Dashboard │ ────> │ Express API     │ ────> │ Prisma Database │
│ (Port 5173)     │       │ (Port 4000)     │       │ (SQLite/Postgres)│
└─────────────────┘       └────────┬────────┘       └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ BullMQ + Redis  │
                          │ Delayed Queue   │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ Worker Process  │
                          └────────┬────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
     ┌───────────────────────┐           ┌───────────────────────┐
     │ Ethereal SMTP Mailer  │           │ Slack Alert Webhook   │
     │ (Preview Links)       │           │ (Rate Limit Hits)     │
     └───────────────────────┘           └───────────────────────┘
```

### Key Architectural Concepts

1. **No-Cron Queue Scheduling**: Schedules individual delayed jobs into **BullMQ** backed by **Redis** (`zset` timestamp ordering). Jobs survive process crashes and restarts without depending on Node.js `setTimeout`.
2. **2-Layer Idempotency**:
   - *Layer 1 (Queue level)*: Deterministic `jobId` set to the Postgres/SQLite primary key (`EmailJob.id`). BullMQ ignores duplicate job additions.
   - *Layer 2 (Worker level)*: Worker re-verifies job status in the database before sending. If status is already `SENT`, execution exits silently.
3. **Atomic Rate Limiting**: Redis fixed-window counters incremented via atomic Lua scripts (`INCR` + `EXPIRE`). Jobs exceeding per-sender hourly limits are deferred (`moveToDelayed`) to the start of the next hourly window without dropping or failing.
4. **Slack Webhook Alerts**: Automatically triggers live Slack notifications when a sender's rate limit boundary is reached.
5. **Ethereal SMTP Engine**: Creates throwaway SMTP test accounts on boot, outputting clickable HTML preview URLs for every delivered email.

---

## 🛠️ Prerequisites & Installation Requirements

Before getting started, make sure you have installed:

- **Node.js** (v20.0.0 or higher recommended): [Download Node.js](https://nodejs.org)
- **npm** (v10.0.0 or higher): Bundled with Node.js
- **Git** (optional, for version control): [Download Git](https://git-scm.com)

---

## ⚙️ Environment Configuration

The backend is configured via `.env` in the `backend/` directory:

```env
# Server Configuration
PORT=4000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=reachinbox-dev-secret-key-123456789

# Database & Queue Connections
DATABASE_URL="file:./dev.db"
REDIS_URL="redis://127.0.0.1:6379"

# Queue Pacing & Rate Limits
WORKER_CONCURRENCY=5
MIN_SEND_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200

# Ethereal SMTP (Leave blank to auto-generate)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Slack OAuth (Optional)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URL=http://localhost:4000/api/slack/oauth/callback
```

---

## 🚀 Step-by-Step Execution Guide

### 1. Setup & Launch Backend Server (Terminal 1)

1. Open PowerShell or Command Prompt in the repository root directory.
2. Navigate to the backend directory:
   ```powershell
   cd backend
   ```
3. Install backend packages:
   ```powershell
   npm install
   ```
4. Push Prisma schema to initialize the database:
   ```powershell
   npx prisma db push
   ```
5. Start the API server and worker process:
   ```powershell
   npm run dev
   ```
   *The server will start listening at `http://localhost:4000` and automatically initialize embedded Redis if a local Redis instance is not present.*

---

### 2. Setup & Launch Frontend Dashboard (Terminal 2)

1. Open a **new** PowerShell or Command Prompt window.
2. Navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
3. Install frontend packages:
   ```powershell
   npm install
   ```
4. Start the Vite React development server:
   ```powershell
   npm run dev
   ```
   *The frontend dashboard will start listening at `http://localhost:5173`.*

---

## 📋 Comprehensive Command Matrix

| Target | Purpose | Exact Command |
| :--- | :--- | :--- |
| **Backend** | Navigate to folder | `cd backend` |
| **Backend** | Install dependencies | `npm install` |
| **Backend** | Sync Prisma database schema | `npx prisma db push` |
| **Backend** | Start API & queue worker | `npm run dev` |
| **Backend** | Run worker in separate process | `npm run worker` |
| **Backend** | Run queue reconciliation | `npm run reconcile` |
| **Backend** | Typecheck code | `npm run typecheck` |
| **Frontend**| Navigate to folder | `cd frontend` |
| **Frontend**| Install dependencies | `npm install` |
| **Frontend**| Start React dashboard | `npm run dev` |
| **Frontend**| Build for production | `npm run build` |

---

## 📖 Feature & Operations Walkthrough

### 1. User Sign-In & Authentication
- Open `http://localhost:5173`.
- Click **"Continue with Google"**. If Google OAuth keys are not configured in `.env`, the system safely falls back to a development demo account (`demo@reachinbox.com`), allowing immediate dashboard access.

### 2. Scheduling Email Batches
- Navigate to **Compose & Schedule**.
- Fill in:
  - **Sender Email**: e.g. `marketing@company.com`
  - **Subject**: Email subject line
  - **Body**: Plain text or HTML content
  - **Recipients**: Comma-separated or line-separated email list
  - **Send Delay (ms)**: Pacing interval between sends (e.g. `2000`ms)
  - **Hourly Cap**: Maximum sends allowed per hour (e.g. `200`)
- Click **Schedule Emails**.
- Recipient $N$ is scheduled at `startTime + (N * delayMs)`.

### 3. Monitoring Queues via Bull Board
- Open **`http://localhost:4000/admin/queues`** in your browser.
- Inspect active, waiting, delayed, completed, and failed jobs in real-time.

### 4. Viewing Sent Emails & Preview Links
- Navigate to the **Sent Emails** tab in the dashboard.
- Click the **Ethereal Preview URL** link on any delivered email row to view the rendered message as it would appear in the recipient's inbox.

---

## 🔌 API Reference

### `POST /api/emails/schedule`
Schedules a batch of emails.

**Headers**:
`Content-Type: application/json`

**Body**:
```json
{
  "subject": "Product Announcement",
  "body": "Check out our new features!",
  "senderEmail": "sender@company.com",
  "recipients": ["user1@example.com", "user2@example.com"],
  "startTime": "2026-09-05T10:00:00.000Z",
  "delayMs": 2000,
  "hourlyLimit": 200
}
```

**Response (201 Created)**:
```json
{
  "batchId": "ade2a410-a263-4086-a7d4-18ddb1065b55",
  "scheduledCount": 2
}
```

---

### `GET /api/emails/scheduled`
Returns list of currently scheduled or deferred email jobs for the logged-in user.

---

### `GET /api/emails/sent`
Returns list of completed or failed email jobs for the logged-in user including `previewUrl` links.

---

### `GET /health`
Server health check.

**Response (200 OK)**:
```json
{
  "ok": true
}
```

---

## ❓ Troubleshooting & FAQs

### Q: Server returns `EADDRINUSE: address already in use :::4000`
Another process is already using port 4000. Stop existing Node processes via Task Manager or run:
```powershell
Stop-Process -Name node -Force
```

### Q: `ECONNREFUSED` on port 6379
The backend automatically detects if Redis is not running and starts an embedded in-memory Redis instance (`redis-memory-server`) automatically on boot.

### Q: How do I test rate-limiting Slack notifications?
1. Connect a Slack Webhook URL under Slack Settings in the dashboard.
2. Schedule a batch exceeding your configured `MAX_EMAILS_PER_HOUR_PER_SENDER` (e.g. 10 emails with limit set to 5).
3. The remaining 5 jobs will automatically defer to the next hour and trigger a Slack notification to your webhook.
