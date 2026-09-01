# Seltiv SLMS

Student Lifecycle Management System for the four schools of the Sheikh Farid Ahmed
Education and Welfare Trust — one platform for **admissions, attendance, academics,
finance and parent communication**.

Built from the proposal in [`docs/requirements.md`](docs/requirements.md). The
original proposal deck lives in [`misc/`](misc/).

> **Architecture:** no multi-tenancy — **each branch runs its own Node.js process
> and its own database**. Branch identity comes from environment variables.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Database | MongoDB via Mongoose |
| Auth | NextAuth (Credentials) — phone/email + password, SMS-OTP reset |
| Images | Cloudinary (falls back to local disk in dev) |
| PDFs | Supabase Storage + `@react-pdf/renderer` (falls back to local disk) |
| Email | nodemailer (SMTP in prod, `.eml` files in dev) |
| SMS | **placeholder adapter** — records every message, no real gateway |
| Payments | **mock bKash** — simulated tokenised checkout |
| Styling | Tailwind CSS v4, design tokens from the proposal's Broadsheet system |

## Portals

- **`/admin`** — dashboard, admissions, students, academics, attendance monitor,
  exams & grades, finance, notices, service requests, staff/users/roles, audit log,
  settings.
- **`/teacher`** — my classes, take roll call (+ absence SMS), gradesheet marks entry,
  timetable, notices, payslips.
- **`/parent`** — child profile, gradesheet, attendance calendar, fees & bKash payment,
  notices, certificates, service requests.
- **`/accounts`** — fee collection, invoice runs, dues & reminders, instalments,
  payroll & payslips, bKash reconciliation, reports.
- Public — `/login`, `/admissions/apply`, `/admissions/status`, `/pay/<token>`.

> **Not built (by decision):** staff/teacher attendance (biometric hardware — on hold),
> Online Exam / Question Bank, Transport, and all Phase-2 modules.

## Local development

Node is pinned to 22. This machine's system Node was broken (partial `libada`
upgrade), so a working Node 22 lives in `~/.local/node22` with shims in
`~/.local/bin`. Fix the system copy any time with `sudo pacman -S nodejs`.

### 1. MongoDB

A standalone `mongod` is in `~/.local/mongodb`. Start it:

```bash
~/.local/mongodb/bin/mongod --dbpath ~/.local/var/seltiv-mongo --port 27017 --bind_ip 127.0.0.1 --fork --logpath ~/.local/var/log/seltiv-mongod.log
```

Or point `MONGODB_URI` at any MongoDB (Atlas free tier works).

### 2. Install & configure

```bash
npm install
cp .env.example .env.local   # already done on this machine, with a generated AUTH_SECRET
```

### 3. Seed demo data

Reproduces the proposal mockups (Nabila Rahman, Class 8B, the payroll table, the
admissions pipeline…).

```bash
npm run seed -- --fresh
```

Demo logins (password `password123`):

| Role | Phone |
|---|---|
| Admin | `01700000001` |
| Teacher (class teacher, 8B) | `01700000010` |
| Teacher | `01700000011` |
| Accountant | `01700000020` |
| Parent (Nabila's guardian) | `01700000030` |

### 4. Run

```bash
npm run dev        # http://localhost:3000
```

Generated PDFs and uploads land in `storage/` (git-ignored); dev emails in
`storage/mail/`; every SMS is printed to the console and stored in the
`smsmessages` collection.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run seed -- --fresh` | Wipe and reseed |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (fee/GPA/rank/SMS math) |
| `npm run test:e2e` | Playwright smoke flows |

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Netlify for the demo, VPS +
PM2 + system cron for production.
