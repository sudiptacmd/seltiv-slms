import "server-only";
import { connectDb } from "../db";
import { SmsMessage } from "@/models";
import { env } from "../env";
import { countSegments, normalizeMsisdn } from "../sms-util";

export { countSegments, isUnicode, renderTemplate, normalizeMsisdn } from "../sms-util";

/**
 * Placeholder SMS adapter. No real gateway yet — every message is persisted to
 * `SmsMessage` and logged. A real provider later implements the same `send()`.
 */

export type SmsPurpose =
  | "notice"
  | "attendance"
  | "fee_reminder"
  | "otp"
  | "service_request"
  | "other";

export async function sendSms(
  to: string,
  text: string,
  opts: { purpose?: SmsPurpose; relatedId?: string } = {},
): Promise<{ id: string; status: string }> {
  await connectDb();
  const { segments, unicode } = countSegments(text);
  const doc = await SmsMessage.create({
    to: normalizeMsisdn(to),
    text,
    segments,
    unicode,
    provider: env.sms.provider,
    purpose: opts.purpose ?? "other",
    relatedId: opts.relatedId,
    status: "sent",
    providerMessageId: `mock_${Math.random().toString(36).slice(2, 10)}`,
  });

  if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.log(`\n📱 [SMS:${opts.purpose ?? "other"}] → ${doc.to} (${segments} seg${unicode ? ", unicode" : ""})\n   ${text}\n`);
  }
  return { id: String(doc._id), status: "sent" };
}

export async function sendBulkSms(
  messages: { to: string; text: string; relatedId?: string }[],
  purpose: SmsPurpose,
): Promise<{ sent: number; failed: number; ids: string[] }> {
  const ids: string[] = [];
  let sent = 0;
  let failed = 0;
  for (const m of messages) {
    try {
      const r = await sendSms(m.to, m.text, { purpose, relatedId: m.relatedId });
      ids.push(r.id);
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed, ids };
}
