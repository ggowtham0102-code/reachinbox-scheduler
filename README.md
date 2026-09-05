# ReachInbox Email Scheduler & Dashboard

A production-shaped email scheduling platform featuring time-delayed queue processing, strict per-sender rate limiting, 2-layer idempotency checks, process restart survival, live queue monitoring, Slack alert webhooks, and an interactive React dashboard.

---

## 🛠️ 1. How to Run the Project

### 1.1 Prerequisites
- **Node.js**: v20.0.0 or higher ([Download Node.js](https://nodejs.org))
- **npm**: v10.0.0 or higher (included with Node.js)

---

### 1.2 How to Run Backend (Express, Redis, DB, BullMQ Worker)

Open PowerShell or CMD in the project root:

```powershell
cd backend

# 1. Install dependencies
npm install

# 2. Sync database schema (SQLite / PostgreSQL)
npx prisma db push

# 3. Start API server and in-process BullMQ worker
npm run dev
```

The backend starts at **`http://localhost:4000`**.

> **Note on Redis**: The backend automatically detects if a local Redis server is active. If Redis is not running on port 6379, it automatically boots an embedded in-memory Redis instance (`redis-memory-server`) so BullMQ operates out of the box without manual Docker setup.

#### Running Worker in a Separate Process (Production Setup)
To run the BullMQ worker as an isolated process (closer to a production pod architecture):
```powershell
npm run worker
```

---

### 1.3 How to Run Frontend

Open a **new** PowerShell or CMD terminal:

```powershell
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

The React dashboard starts at **`http://localhost:5173`**.

---

### 1.4 Setting Up Ethereal Email & Environment Variables

#### Ethereal Email Setup
- **Auto-Generation (Default)**: On boot, the backend automatically executes `nodemailer.createTestAccount()` if `SMTP_USER` and `SMTP_PASS` are left empty. Generated temporary credentials and preview links are logged to the console.
- **Pinned Account (Optional)**: To pin a persistent Ethereal inbox across restarts:
  1. Visit [https://ethereal.email/create](https://ethereal.email/create) and create a free test account.
  2. Copy `Account Username` and `Password`.
  3. Set `SMTP_USER` and `SMTP_PASS` in `backend/.env`.

#### Environment Variables (`backend/.env`)

```env
# --- Server ---
PORT=4000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=reachinbox-dev-secret-key-123456789

# --- Database & Redis ---
DATABASE_URL="file:./dev.db"
REDIS_URL="redis://127.0.0.1:6379"

# --- Queue & Rate Limiting ---
WORKER_CONCURRENCY=5
MIN_SEND_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200

# --- Ethereal SMTP Mailer ---
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# --- Google OAuth (Optional - Demo fallback active if empty) ---
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# --- Slack OAuth (Optional) ---
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URL=http://localhost:4000/api/slack/oauth/callback

# --- Elasticsearch (Optional - Postgres ILIKE fallback active if empty) ---
ELASTICSEARCH_URL=
```

---

## 📐 2. Architecture Overview

### 2.1 How Scheduling Works (No Cron)
- `POST /api/emails/schedule` receives a batch request, creates an `EmailBatch` record and one `EmailJob` row per recipient in the database with status `SCHEDULED`.
- Each recipient job is added to the BullMQ delayed queue (`queue.add(name, data, { delay, jobId })`).
- Recipient $N$ is scheduled at `startTime + (N * delayMs)`, guaranteeing deterministic send pacing.
- Delays are stored as Redis `zset` timestamp entries. Node `setTimeout` is **not** used.

### 2.2 How Persistence on Restart is Handled
- **Redis Queue State**: BullMQ delayed and waiting jobs live in Redis memory/disk persistence. Stopping or restarting Node.js processes leaves delayed jobs intact.
- **2-Layer Idempotency**:
  - *Layer 1 (Queue Level)*: `jobId` is set to the primary key UUID (`EmailJob.id`). BullMQ deduplicates additions with identical `jobId`.
  - *Layer 2 (Worker Level)*: Before invoking Nodemailer, the worker queries `EmailJob` status in the database. If status is already `SENT`, the handler exits immediately.
- **Worker Recovery**: BullMQ lock timers detect mid-flight worker crashes and return active stalled jobs to `waiting`.
- **Database Reconciliation**: A reconciliation script (`npm run reconcile`) scans for `SCHEDULED` DB records missing from Redis and re-enqueues them.

### 2.3 How Rate Limiting & Concurrency are Implemented
- **Concurrency**: `WORKER_CONCURRENCY` (default `5`) controls maximum simultaneous jobs processed per worker process.
- **Minimum Pacing Delay**: `MIN_SEND_DELAY_MS` (default `2000`ms) is enforced across workers via BullMQ's queue rate limiter (`limiter: { max: 1, duration: MIN_SEND_DELAY_MS }`).
- **Per-Sender Hourly Rate Limiting**: Fixed-window Redis counter (`ratelimit:{senderEmail}:{hourBucket}`) evaluated via an **atomic Lua script**. If the limit is exceeded:
  - The job is updated to `DEFERRED` in the database.
  - The worker calls `job.moveToDelayed(nextHourBoundary, token)`, pushing the job to the next hour without dropping it or failing.
  - A real-time notification is posted to the sender's configured Slack Webhook URL.

---

## ✨ 3. List of Features Implemented

### ⚙️ Backend Features
- [x] **Email Scheduling API** (`POST /api/emails/schedule`): Supports CSV/manual recipient list submission.
- [x] **BullMQ Delayed Queue**: Cron-free scheduling backed by Redis.
- [x] **Restart Survival**: Persistent queues, database idempotency checks, and a reconciliation script (`npm run reconcile`).
- [x] **Configurable Worker Concurrency**: Managed via `WORKER_CONCURRENCY`.
- [x] **Per-Sender Hourly Rate Limiter**: Atomic Redis Lua script counter with automatic hour-boundary deferral (`moveToDelayed`).
- [x] **Slack Webhook Notifications**: Triggers live Slack alerts on rate-limit hits.
- [x] **Ethereal SMTP Integration**: Auto-generates test accounts and records HTML preview URLs.
- [x] **Elasticsearch Integration**: Full-text search with automatic Postgres ILIKE fallback.
- [x] **Live Bull Board UI**: Queue dashboard hosted at `/admin/queues`.
- [x] **Authentication & Demo Fallback**: Passport Google OAuth with automatic dev demo account fallback when credentials are not configured.

### 🖥️ Frontend Features
- [x] **Authentication Page**: Google Sign-In with automatic development mode demo login.
- [x] **Navigation & Dashboard**: Overview stats showing total scheduled, sent, deferred, and failed jobs.
- [x] **Compose & Schedule Form**: Interactive form with recipient list input, send delay, and hourly rate limit sliders/fields.
- [x] **Scheduled & Deferred Table**: Live status table listing pending and rate-limit deferred email jobs.
- [x] **Sent Emails Table**: Historical table of sent jobs with clickable **Ethereal Preview URL** links.
- [x] **Slack Webhook Integration UI**: OAuth flow trigger and direct Slack webhook connection.
