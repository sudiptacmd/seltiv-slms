# Seltiv SLMS — Requirements & Page Specification (v2, approved)

> **Status:** Approved 2026-09-01 with the changes in §0. Implementation in progress.
> Stack: **Next.js (App Router, TypeScript) · MongoDB (Mongoose) · Cloudinary (images) · Supabase Storage (PDFs) · NextAuth Credentials · nodemailer · mock SMS · mock bKash · @react-pdf/renderer**.
> Source of truth for the UI: `misc/deck/SLMS Proposal.dc.html` (proposal + mockups).

---

## 0. Decisions locked (changes from v1)

| # | Decision |
|---|---|
| Architecture | **No multi-tenancy.** Each of the 4 branches runs its **own Node.js process + own database**. The app is single-school; branch identity comes from env (`SCHOOL_NAME`, `SCHOOL_CODE`, `SCHOOL_ADDRESS`, `SCHOOL_LETTERHEAD_LOGO`). No school switcher, no trust-consolidation dashboard (a cross-branch roll-up, if ever wanted, is a separate reporting service). |
| Phase 1 optional | **Dropped** — no Online Exam / Question Bank, no Transport. |
| Phase 2 | **Dropped** — not built; data model simply shouldn't block it. |
| Teacher / staff attendance | **On hold** — it is biometric/RFID hardware-driven. No staff-attendance pages, no biometric ingest. Payroll takes working-days / adjustments **manually** for now. Student attendance (teacher roll call) is unaffected. |
| Email | **nodemailer** (real). SMTP via env; dev falls back to a file/preview transport. |
| SMS | **Placeholder adapter** — implements `sendSms()`, persists to `smsMessages`, logs a preview; no real gateway. |
| bKash | **Mock adapter** — a simulated checkout page + callback; same interface a real integration will implement later. |
| PDF storage | **Supabase Storage** (Cloudinary cannot serve PDFs). Images/photos stay on **Cloudinary**. Both behind a storage interface with a local-disk fallback for dev/testing. |
| Auth | **NextAuth Credentials**, JWT sessions. Login by **phone or email + password**. Password reset by **SMS OTP** (through the mock adapter in dev). |
| Class/subject taxonomy | This instance defines **its own** classes & subjects. |
| Class position | Show **both** — rank within section **and** within class/grade. |
| Instalments | Default **2**, **configurable** (per fee plan). Late fee: **configurable** (flat / per-day / percentage), default flat. |
| Data migration | **Excel import** in the Admin portal; **blank templates downloadable from the site**. |
| UI language | **English only.** |
| Gradesheets | **Marks entry only** — no file upload. |
| Repo layout | Next.js app at repo **root**; the deck and design-system moved to **`misc/`**; this spec stays in `docs/`. |
| Hosting | **Demo on Netlify**, **production on a VPS** (`next start` + PM2 + system cron). Build must run in both; scheduled work lives in callable route handlers. |

---

## 1. Context (from the proposal)

One platform replacing paper registers for **admissions, attendance, academics, finance and parent communication**, with every student, teacher, mark and fee in **one database**.

**Problems being solved (slide 4):**

| Problem today | What the system gives |
|---|---|
| Results, attendance and fees in separate registers — a slipping child noticed late. | **One student profile** — academic progress + attendance + fees together. |
| Attendance on paper, summarised late — drifting classes and repeat absentees invisible. | **Live attendance** the moment roll call is saved; drift & repeat-absentee views. |
| Fee ledgers scattered — a collection figure means manual reconciliation. | **One collection view**, drill-down to class/student, bKash auto-reconciled. |

**Portals (slide 7):** Admin · Teacher · Parent · Accounts — one database.

---

## 2. Cross-cutting design

### 2.1 Roles
`admin` · `teacher` (optional class-teacher flag) · `accountant` · `parent`.
A user is one `person` (staff or guardian) + one account. Permissions are a role→action check; `admin` is unrestricted within the school.

### 2.2 Academic structure
`AcademicYear` (one current) → `Class` (grade) → `Section` → `Enrollment` (student ↔ section ↔ year, roll no, status). `Subject` per class with mark distribution + pass mark. `Term` (Term 1/2/3) → `Exam` → `ExamSubject` → `Mark` → `Result` (computed GPA, grade, section rank, class rank). `GradingScale` (grade boundaries, GPA points). `Timetable` = periods × weekdays per section (subject + teacher).

### 2.3 Finance model
`FeeHead` (tuition, exam, admission, late-fee, misc) · `FeePlan` per class (+ items, instalment count, late-fee rule) · `Discount`/`Waiver` · `Invoice` (+ lines, due date, status) · `Payment` (cash / bKash) · `BkashTransaction` · `Receipt` (PDF) · `ReminderLog`. Payroll: `SalaryStructure` (basic + allowances − deductions, PF) · `PayrollRun` (month) · `Payslip` (PDF, status Draft/Pending/Paid).

### 2.4 Other collections
`User`, `Staff`, `Guardian`, `Student`, `StudentGuardian`, `AdmissionSession`, `AdmissionApplication` (+ documents, entrance-test score), `AttendanceSession` (section+date+period), `AttendanceRecord`, `Notice` (+ `NoticeRecipient` delivery rows), `SmsMessage`, `ServiceRequestType`, `ServiceRequest` (+ events), `GeneratedDocument`, `AuditLog`, `Notification`, `Settings`, `ImportJob`.

### 2.5 Audit log
Every **grade edit**, **fee change**, **permission/user change**, and **published gradesheet / notice** writes an `AuditLog` row: actor, entity, action, before → after, timestamp (slide 19).

### 2.6 Integrations (all swappable; local fallback in dev)
| Service | Adapter | Prod |
|---|---|---|
| Images (student/staff photos, notice images) | `cloudinary` | Cloudinary account (`CLOUDINARY_URL`) |
| PDFs (report cards, receipts, payslips, certificates, invoices, admit cards) | `supabase` | Supabase Storage bucket (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_PDF_BUCKET`) |
| Email | `nodemailer` | SMTP (`SMTP_HOST/PORT/USER/PASS/FROM`) |
| SMS | `mock` | later — interface `sendSms(to, text): {id,status}` + DLR hook |
| Payment | `mock-bkash` | later — `createPayment`, `executePayment`, webhook |

### 2.7 Documents (react-pdf → Supabase)
Report card / transcript · Gradesheet · Fee invoice · Fee receipt · Payslip · Transfer certificate · Testimonial · Bonafide certificate · Student ID card · Exam admit card · Admission form. Each renders from a template + school letterhead; sensitive ones (payslip, certificates) served via signed/short-lived URLs.

### 2.8 Non-functional
Responsive (parents on mobile) · English UI, DB text fields sized for Bangla content · role-guarded route groups · soft-delete + audit on financial/academic records · seed script reproducing the mockup data (Nabila Rahman, Class 8B, etc.) · works under `next start` and on Netlify.

---

## 3. Pages — Public / shared

| Route | Who | Purpose · key functions |
|---|---|---|
| `/` | anyone | Redirect by role, else `/login` |
| `/login` | anyone | Phone/email + password; role-aware redirect; failure lockout |
| `/forgot-password` · `/reset-password` | anyone | SMS-OTP reset |
| `/admissions/apply` | prospective parent | **Online application** (slide 16): student → guardian → previous school → class → **document upload** → review → submit → application number; optional application fee |
| `/admissions/status` | applicant | Track by application no. + phone; stage + admit-card download |
| `/pay/[token]` | parent (tokenised) | Pay one invoice from an SMS link via mock bKash; receipt — no login |
| `/templates/[name].xlsx` | admin (auth) | Download blank **Excel import templates** (students, guardians, staff, marks, fee plans) |
| `/notifications` | any user | Notification centre |
| `/profile` · `/settings` | any user | Contact, password, notification prefs |
| `/print/[docType]/[id]` | authorised | react-pdf render endpoint for every document in §2.7 |

---

## 4. Pages — Admin Portal (`/admin`)

### 4.1 Dashboard
`/admin` — **Analytics Dashboard** (slide 9): KPI tiles — students enrolled, **attendance today %**, **fees collected %**, **pass rate last term**; **fee-collection trend (6 months)** bar chart; attendance-drift list by class; recent activity; quick links.

### 4.2 Admissions
| Route | Purpose · key functions |
|---|---|
| `/admin/admissions` | Pipeline (slide 16): stat tiles — applications, test scheduled, seats available, enrolment confirmed; filterable table (class, status, documents) |
| `/admin/admissions/[id]` | Detail: applicant + guardian; **per-document verify/reject**; entrance-test score; stage transitions (Applied → Test scheduled → Verified → Seat offered → Enrolled / Rejected); **convert to student**; reject-with-reason (SMS) |
| `/admin/admissions/tests` | Entrance tests: create slots, assign applicants, print seat list, enter results |
| `/admin/admissions/settings` | Session config: open/close dates, classes + **seat counts**, required documents, application fee |

### 4.3 Students
| Route | Purpose · key functions |
|---|---|
| `/admin/students` | Directory: search, filter class/section/status, export, bulk message, add |
| `/admin/students/new` | Manual enrolment: student + guardian form, photo (Cloudinary), assign section + roll |
| `/admin/students/[id]` | **Student Profile** (slide 10): academic progress (Term GPAs, **section & class rank**), attendance summary (present/absent/late), **fee status + outstanding**, guardians, documents, **Download Report (PDF)**; actions: edit, promote, transfer, withdraw |
| `/admin/students/[id]/edit` | Edit bio/contacts/photo/category |
| `/admin/students/promote` | Year-end bulk promote/retain a section; carry-forward balances |
| `/admin/students/transfer` | Section transfer; issue transfer certificate |
| `/admin/students/import` | **Excel import**: download template, upload, validate, preview errors, commit → `ImportJob` |

### 4.4 Academics
| Route | Purpose · key functions |
|---|---|
| `/admin/academics/years` | Academic years: create, set current, close |
| `/admin/academics/classes` | Classes + sections; capacity; order |
| `/admin/academics/subjects` | Subjects; assign to classes; mark distribution + pass mark |
| `/admin/academics/assignments` | Class teacher per section; subject teacher per section+subject |
| `/admin/academics/timetable` | Periods × weekdays per section; assign subject + teacher; clash detection; publish |

### 4.5 Attendance (oversight — student only)
| Route | Purpose · key functions |
|---|---|
| `/admin/attendance` | Monitor: % present by class/section today; drill to student list; **class-drift** + **repeat-absentee** reports; date range; export |
| `/admin/attendance/students/[id]` | Student attendance calendar + notes |
| `/admin/attendance/settings` | School calendar & holidays, working days, period times |

### 4.6 Exams & grades
| Route | Purpose · key functions |
|---|---|
| `/admin/exams` | Exam schedule per term: create exam, subjects, dates, max marks; **publish routine** → notice + SMS; generate **admit cards** |
| `/admin/exams/[id]/marks` | Marks-entry status by section/subject; lock/unlock; nudge teachers |
| `/admin/exams/[id]/results` | Compute GPA/grade, **section rank + class rank**, pass rate; review; **approve & publish gradesheets** (→ visible to parents); generate gradesheet PDFs |
| `/admin/exams/grading-scale` | Grade boundaries, GPA points, rounding |
| `/admin/exams/report-cards` | Bulk term report cards / transcripts for a section |

### 4.7 Finance (overview — ops in Accounts)
| Route | Purpose · key functions |
|---|---|
| `/admin/finance` | Collected vs billed by class; **outstanding & defaulters**; trend; export |
| `/admin/finance/structure` | Fee heads; **fee plans per class** (items, instalments, late-fee rule); discounts / waivers / scholarships |
| `/admin/finance/invoices` | Bulk-generate monthly/term invoices; preview; regenerate; void |

### 4.8 Notices
| Route | Purpose · key functions |
|---|---|
| `/admin/notices` | List: published / draft / scheduled; **sent / delivered** stats (slide 15) |
| `/admin/notices/new` | Compose: title, body, image; **audience** (class / section / individuals; parents / teachers / all); **channels: Portal + SMS**; SMS segment preview; schedule; **Publish & Send SMS** |
| `/admin/notices/[id]` | Content + **per-recipient delivery report** |
| `/admin/notices/templates` | Reusable templates |

### 4.9 Service requests (admin side)
| Route | Purpose · key functions |
|---|---|
| `/admin/service-requests` | Queue (slide 17): filter type / stage / status; age; assign |
| `/admin/service-requests/[id]` | Workflow (Submitted → Verification → **Head-teacher approval** → Ready → Collected/Closed); **generate document from template**; upload signed copy; notify parent per stage |
| `/admin/service-requests/types` | Configure types, stages, fee, document template |

### 4.10 People & access
| Route | Purpose · key functions |
|---|---|
| `/admin/staff` | Staff directory (teaching + non-teaching); add; filter; export; import (Excel) |
| `/admin/staff/[id]` | Staff profile: employment info, documents, photo, salary-structure link, **payslip history** (slide 14 — payslips are staff, not students) |
| `/admin/users` | Accounts: invite / deactivate; **link user ↔ person**; reset password; sessions |
| `/admin/roles` | Role → action matrix; clone role |
| `/admin/audit-log` | Search by actor / entity / action / date; before→after diff; export |

### 4.11 Settings
| Route | Purpose · key functions |
|---|---|
| `/admin/settings/school` | Name, logo, address, head teacher, **letterhead**, EIIN/registration (seeded from env, editable) |
| `/admin/settings/integrations` | Cloudinary / Supabase / SMTP / SMS / bKash config + **test** buttons; shows which adapter is active |
| `/admin/settings/academic-calendar` | Terms, holidays, events |
| `/admin/settings/branding` | Theme, notification defaults |

---

## 5. Pages — Teacher Portal (`/teacher`)

| Route | Purpose · key functions |
|---|---|
| `/teacher` | Dashboard: today's timetable; my sections; **pending tasks** (roll call not taken, marks not submitted); notices |
| `/teacher/classes` | **My Classes** — sections I teach / am class teacher of |
| `/teacher/classes/[sectionId]` | Roster + read-only student mini-profiles |
| `/teacher/attendance` | **Take roll call** (slide 11): section + date + period; mark **Present / Absent / Late**; **Save Roll Call** → SMS to absent students' parents; edit within window; running totals |
| `/teacher/attendance/history` | My past roll calls; per-section summary |
| `/teacher/gradesheet` | **Marks entry**: pick exam + section + subject; grid; save draft; **submit (locks)** |
| `/teacher/gradesheet/[examId]/[subjectId]` | Entry grid: per-student marks, absent/exempt, validation vs max marks |
| `/teacher/timetable` | **Class Schedule** — my weekly timetable |
| `/teacher/notices` | Notices for teachers; class teacher may send a class-scoped notice (if permitted) |
| `/teacher/profile` | Contact, photo, **my payslips** |

---

## 6. Pages — Parent Portal (`/parent`)

| Route | Purpose · key functions |
|---|---|
| `/parent` | Dashboard (slide 12): child selector; snapshot — attendance %, next fee due, unread notices, exam-schedule status; quick actions |
| `/parent/child` | **My Child**: bio, class/section/roll, photo, guardians; academic progress (term GPAs, ranks); attendance summary |
| `/parent/child/gradesheet` | **Gradesheet**: results per term/exam; marks, grade, rank; **download PDF** (only once admin-published) |
| `/parent/child/attendance` | **Attendance** calendar; absences/lates; month filter |
| `/parent/fees` | **Fees & Payment** (slide 13): current invoice(s); breakdown (tuition / exam fee / late fee / total); due date; history + receipts; **instalment option** |
| `/parent/fees/pay/[invoiceId]` | **Pay with bKash** (mock): checkout → success → **auto receipt**; failure/retry |
| `/parent/fees/receipts/[id]` | View / download receipt PDF |
| `/parent/notices` · `/parent/notices/[id]` | **Notices** feed (school / class / individual); read status; attachments |
| `/parent/certificates` | Documents issued to my child, ready to download |
| `/parent/service-requests` | **Service Requests** (slide 17): list with **stage & status**; timeline |
| `/parent/service-requests/new` | Raise: type + child + reason; pay fee if any; submit |
| `/parent/service-requests/[id]` | Stage timeline; download document when **Ready** |
| `/parent/children` | Link a child (student ID + OTP to registered phone) |
| `/parent/profile` | Guardian contacts, password, notification prefs |

---

## 7. Pages — Accounts Portal (`/accounts`)

| Route | Purpose · key functions |
|---|---|
| `/accounts` | Dashboard: collection today / this month by class; **outstanding total**; pending reconciliations; payroll status |
| `/accounts/fees` | **Fee Collection** (slide 1 problem): ledger by class/student; filters; **record cash/offline payment + issue receipt**; apply late fee; apply waiver/discount |
| `/accounts/fees/invoices` | Invoice runs: generate/regenerate; void; adjust lines |
| `/accounts/fees/[studentId]` | Student fee ledger: invoices, payments, running balance, instalment plan |
| `/accounts/fees/reminders` | **Dues & reminders**: pick defaulters; **send SMS reminder + pay link**; cadence; history |
| `/accounts/fees/instalments` | Instalment plans (e.g. **pay in 2**): create/modify/track |
| `/accounts/payroll` | **Payroll** (slide 14): monthly run; staff list with **Gross / Net / Status (Paid/Pending/Draft)**; **manual working-days / adjustments**; allowances, deductions, PF; **Generate Payslips (PDF)**; mark paid |
| `/accounts/payroll/[staffId]` | Staff salary detail; salary structure; payslip history |
| `/accounts/payroll/structure` | Salary components: basic, allowances, deductions, PF rules |
| `/accounts/bkash` | **bKash Reconciliation** (slide 14): incoming (mock) transactions; **auto-match** + manual match to invoices; unmatched queue; refunds; settlement report |
| `/accounts/reports` | Collection summary; outstanding aging; income by fee head; payroll register; export (Excel/PDF); date range |

---

## 8. System routes, jobs & webhooks

| Route / job | Purpose |
|---|---|
| `POST /api/webhooks/bkash` | Mock payment callback → update payment, generate receipt, reconcile |
| `POST /api/webhooks/sms-dlr` | (stub) SMS delivery reports → update `NoticeRecipient` / `SmsMessage` |
| `POST /api/uploads/sign` | Signed Cloudinary upload params |
| `POST /api/cron/invoices` | Monthly/term invoice generation (system cron on VPS; manual/Netlify-scheduled on demo) |
| `POST /api/cron/fee-reminders` | Scheduled defaulter SMS |
| `POST /api/cron/attendance-digest` | Daily unresolved-absence summary |
| `POST /api/cron/attendance-lock` | Lock the previous day's roll calls |

Cron endpoints are protected by a `CRON_SECRET` bearer token.

---

## 9. Build milestones

| # | Milestone | Delivers |
|---|---|---|
| 0 | **Foundation** | Next.js + TS, Mongoose connection, NextAuth Credentials + RBAC route groups, storage/email/SMS/bKash adapters (+ local fallbacks), UI kit matching the mockups (sidebar, stat tiles, panels, tags, tables), `@react-pdf` document base + letterhead, seed script (school + year + classes 6–10 + subjects + demo staff/students/guardians incl. Nabila Rahman) |
| 1 | **People & structure** | Academic years, classes/sections/subjects, staff, guardians, students, enrolments, user↔person linking, roles, audit-log service, **Excel import + templates** |
| 2 | **Admissions** | Public application + document upload, admin pipeline & detail, entrance tests, enrol → student |
| 3 | **Attendance** | Timetable builder, teacher roll call + absence SMS, admin monitor + repeat-absentee report |
| 4 | **Exams & grades** | Exam schedule + admit cards, teacher marks entry, result processing (GPA / ranks / pass rate), grading scale, publish gradesheets, report-card PDF, parent gradesheet view |
| 5 | **Fees & bKash** | Fee heads & plans, invoice generation, Accounts fee-collection ledger, **mock bKash pay + reconciliation**, receipts, reminders, parent Fees & Payment, admin finance overview |
| 6 | **Payroll** | Salary structures, payroll run, payslip PDFs, financial reports |
| 7 | **Notices & SMS** | Compose + audience + channels, delivery tracking, templates, mock SMS + DLR stub, parent/teacher feeds, notification centre |
| 8 | **Service requests** | Types & workflow, parent raise + track, admin processing, document generation |
| 9 | **Dashboards & hardening** | Admin & Accounts analytics, cron endpoints, exports, access-control review, tests, Netlify config + VPS `next start`/PM2 notes, README |

Testing per milestone: `tsc --noEmit` + `next build` clean, Vitest for services (fee/GPA/rank/SMS-segment math, RBAC), and Playwright smoke flows per portal with screenshots.

---

## 10. Still open / assumptions to confirm while building

- Late-fee **default**: flat ৳X after due date — confirm the amount and grace days.
- Grading scale: assuming the Bangladesh GPA-5 secondary scale (A+ =5 … F). Confirm boundaries.
- Report-card layout: assuming term-wise subject marks + grade + GPA + rank + attendance + teacher remark. Confirm any board format to match.
- Service-request types to seed: transfer certificate, testimonial, bonafide, duplicate ID card. Add/remove?
- Parent–child linking: self-service with OTP vs admin-only linking. Assuming self-service with OTP + admin override.
- `SCHOOL_CODE` / EIIN and letterhead assets per branch — provide when available; placeholders until then.
