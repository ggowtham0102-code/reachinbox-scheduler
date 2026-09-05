# ReachInbox Email Scheduler & Dashboard

Production-grade Email Scheduler & Dashboard built with Express, TypeScript, BullMQ, Redis, Prisma & React. Features delayed job scheduling, per-sender hourly rate limits, idempotency checks, Slack alerts, Ethereal SMTP preview links, and Bull Board queue monitoring.

---

## 🛠️ Prerequisites & Tools to Download

- **Node.js** (v20 or higher): Download from [nodejs.org](https://nodejs.org)

---

## 🚀 Setup & Installation (Step-by-Step Order)

### Step 1: Backend Setup (Terminal 1)

Open PowerShell / CMD in the project root:

```powershell
cd backend
npm install
npx prisma db push
npm run dev
```
> The API server will start at **http://localhost:4000** with an embedded in-memory Redis queue worker.

---

### Step 2: Frontend Setup (Terminal 2)

Open a **new** PowerShell / CMD terminal:

```powershell
cd frontend
npm install
npm run dev
```
> The React dashboard will start at **http://localhost:5173**.

---

## 📋 Quick Command Summary

| Step | Action | Terminal Command |
| :--- | :--- | :--- |
| **1** | Open Backend | `cd backend` |
| **2** | Install Backend Dependencies | `npm install` |
| **3** | Setup Database | `npx prisma db push` |
| **4** | Start Backend Server | `npm run dev` |
| **5** | Open Frontend *(New Terminal)* | `cd frontend` |
| **6** | Install Frontend Dependencies | `npm install` |
| **7** | Start Frontend Dashboard | `npm run dev` |

---

## 💡 How to Use

1. 🌐 **Open Dashboard**: Go to [http://localhost:5173](http://localhost:5173) in your browser.
2. 🔑 **Sign In**: Click **"Continue with Google"** (logs in as demo user `demo@reachinbox.com`).
3. ✉️ **Schedule Emails**: Enter sender email, subject, body, recipients, send delay, and rate limit, then click **Schedule Emails**.
4. 📊 **Monitor Live Queues**: Visit Bull Board at [http://localhost:4000/admin/queues](http://localhost:4000/admin/queues).
5. 📬 **View Previews**: Sent emails in the dashboard table include Ethereal SMTP preview URLs.

---

## 🔗 Key URLs

- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **Bull Board Queue Dashboard**: [http://localhost:4000/admin/queues](http://localhost:4000/admin/queues)
- **Health Check**: [http://localhost:4000/health](http://localhost:4000/health)
