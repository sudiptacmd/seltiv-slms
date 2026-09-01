/**
 * Centralised environment access. Everything has a dev-safe default so the app
 * boots with an empty .env; production sets the real values. Each branch of the
 * trust runs its own process with its own values here (no multi-tenancy).
 */

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}

export const env = {
  // ── This branch's identity (shown on letterheads, PDFs, the login screen) ──
  school: {
    name: str("SCHOOL_NAME", "Sheikh Farid High School"),
    code: str("SCHOOL_CODE", "SFHS"),
    address: str("SCHOOL_ADDRESS", "Kaliganj, Gazipur, Bangladesh"),
    eiin: str("SCHOOL_EIIN", ""),
    phone: str("SCHOOL_PHONE", "+8801700000000"),
    email: str("SCHOOL_EMAIL", "office@sfhs.edu.bd"),
    logoUrl: str("SCHOOL_LOGO_URL", ""),
  },

  mongoUri: str("MONGODB_URI", "mongodb://127.0.0.1:27017/seltiv_slms"),

  authSecret: str("AUTH_SECRET", "dev-only-insecure-secret-change-me"),
  appUrl: str("APP_URL", "http://localhost:3000"),

  cronSecret: str("CRON_SECRET", "dev-cron-secret"),

  // ── Adapters. When the creds are absent the local fallback is used. ──
  cloudinary: {
    url: str("CLOUDINARY_URL", ""), // cloudinary://key:secret@cloud
    get enabled() {
      return this.url.startsWith("cloudinary://");
    },
  },
  supabase: {
    url: str("SUPABASE_URL", ""),
    serviceKey: str("SUPABASE_SERVICE_KEY", ""),
    pdfBucket: str("SUPABASE_PDF_BUCKET", "slms-pdfs"),
    get enabled() {
      return this.url !== "" && this.serviceKey !== "";
    },
  },
  smtp: {
    host: str("SMTP_HOST", ""),
    port: Number(str("SMTP_PORT", "587")),
    user: str("SMTP_USER", ""),
    pass: str("SMTP_PASS", ""),
    from: str("SMTP_FROM", "Seltiv SLMS <no-reply@sfhs.edu.bd>"),
    get enabled() {
      return this.host !== "";
    },
  },
  sms: {
    // No real gateway yet — the mock adapter records every message.
    sender: str("SMS_SENDER_ID", "SFHS"),
    provider: str("SMS_PROVIDER", "mock"),
  },
  payment: {
    provider: str("PAYMENT_PROVIDER", "mock-bkash"),
    bkashMerchantNumber: str("BKASH_MERCHANT_NUMBER", "01700000000"),
  },

  storageDir: str("LOCAL_STORAGE_DIR", "storage"),

  isProd: process.env.NODE_ENV === "production",
};

export type Env = typeof env;
