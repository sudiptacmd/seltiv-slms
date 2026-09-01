# Deployment

Each of the four branches is a **separate deployment** — its own process, its own
MongoDB database, its own environment. Nothing is shared at runtime.

## Environment variables

Copy `.env.example` and set real values. The important ones:

| Variable | Notes |
|---|---|
| `SCHOOL_NAME`, `SCHOOL_CODE`, `SCHOOL_ADDRESS`, `SCHOOL_EIIN`, `SCHOOL_PHONE`, `SCHOOL_EMAIL` | This branch's identity — on the login screen, letterheads and PDFs. `SCHOOL_CODE` also namespaces uploaded files. |
| `MONGODB_URI` | This branch's database. MongoDB Atlas free tier is fine to start. |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `APP_URL` | Public URL — used in SMS pay-links and OAuth callbacks |
| `CRON_SECRET` | Bearer token the scheduled-job endpoints require |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloud` — images. Omit to use local disk. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_PDF_BUCKET` | PDF storage. Omit to use local disk. Create a **private** bucket. |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Email. Omit for the dev file transport. |
| `SMS_SENDER_ID` | Cosmetic until a real gateway is wired in. |

## Demo — Netlify

`netlify.toml` is committed. From the Netlify dashboard: connect the repo, set the
environment variables above, deploy. `@netlify/plugin-nextjs` handles the adapter.

`npm install` runs with `--legacy-peer-deps` (next-auth beta ↔ nodemailer peer range).

**Scheduled jobs:** add Netlify Scheduled Functions that `POST` with
`Authorization: Bearer $CRON_SECRET` to:

- `/api/cron/attendance-lock` — daily, ~22:00 (locks the day's roll calls)
- `/api/cron/attendance-digest` — weekdays, ~11:00 (absentee summary to admins)
- `/api/cron/fee-reminders` — weekly (defaulter SMS with pay-links)

## Production — VPS

```bash
git clone … && cd seltiv-slms
npm ci --legacy-peer-deps
cp .env.example .env.local        # fill in production values
npm run build
npm run seed -- --fresh           # first deploy only, or migrate real data via the Excel importer
pm2 start "npm start" --name slms-<branch>
pm2 save
```

Put Nginx in front for TLS. One MongoDB database per branch (separate DB name or
separate cluster).

### System cron

```cron
0 22 * * *   curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://<branch-url>/api/cron/attendance-lock
0 11 * * 1-5 curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://<branch-url>/api/cron/attendance-digest
0 9  * * 1   curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://<branch-url>/api/cron/fee-reminders
```

Monthly invoice generation is deliberately **manual** — an accountant runs it from
**Accounts → Invoice Runs** picking the month and whether to include the exam fee.

## Data migration

Admin → Students → Import (and Staff → Import). Download the `.xlsx` template,
fill it, upload — the importer validates every row and shows a preview before
committing. Guardian logins are created automatically with the temporary password
`changeme123` (forced change on first sign-in).

## Going live checklist

- [ ] Real `AUTH_SECRET`, `CRON_SECRET`
- [ ] `CLOUDINARY_URL` + private Supabase bucket + `SUPABASE_*`
- [ ] SMTP credentials
- [ ] Wire a real SMS gateway into `src/lib/adapters/sms.ts` (`sendSms`)
- [ ] Wire real bKash into `src/lib/adapters/payment.ts` (create / execute / webhook signature)
- [ ] Import real students & staff; set the current `AcademicYear`, classes, subjects, fee plans
- [ ] Change every seeded demo password
