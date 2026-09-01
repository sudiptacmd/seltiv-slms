import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";

/**
 * Email via nodemailer. Real SMTP when SMTP_HOST is set; otherwise a dev
 * transport that writes each message to storage/mail/*.eml and logs a preview.
 */

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (transporter) return transporter;
  if (env.smtp.enabled) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}): Promise<{ ok: boolean; id?: string }> {
  const t = getTransport();
  const info = await t.sendMail({
    from: env.smtp.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? stripHtml(opts.html),
    attachments: opts.attachments,
  });

  if (!env.smtp.enabled) {
    const dir = path.resolve(process.cwd(), env.storageDir, "mail");
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${opts.to.replace(/[^a-z0-9]/gi, "_")}.json`);
    await fs.writeFile(file, JSON.stringify({ ...opts, attachments: undefined }, null, 2));
    // eslint-disable-next-line no-console
    console.log(`\n✉️  [EMAIL] → ${opts.to} · "${opts.subject}"  (saved ${path.relative(process.cwd(), file)})\n`);
  }
  return { ok: true, id: (info as { messageId?: string }).messageId };
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const emailStatus = () => (env.smtp.enabled ? "smtp" : "local-dev");
