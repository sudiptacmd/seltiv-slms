import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { allocationSchema } from "./grading";
const payloadSchema = z.object({
  id: z.string().uuid(), actor: z.string(), year: z.string().regex(/^[a-f0-9]{24}$/),
  klass: z.string().regex(/^[a-f0-9]{24}$/), subject: z.string().regex(/^[a-f0-9]{24}$/),
  version: z.number().int().nonnegative(), after: z.array(allocationSchema).min(1).max(3),
  expires: z.number(),
}).strict();
export type ProposalPayload = z.infer<typeof payloadSchema>;
export function signProposal(payload: ProposalPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payloadSchema.parse(payload))).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
export function verifyProposal(token: string, secret: string, actor: string, now = Date.now()) {
  if (token.length > 15000) throw new Error("Invalid approval request.");
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) throw new Error("Invalid approval request.");
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("This proposal was changed. Prepare it again.");
  const payload = payloadSchema.parse(JSON.parse(Buffer.from(body, "base64url").toString()));
  if (payload.actor !== actor) throw new Error("Only the administrator who requested this proposal can approve it.");
  if (payload.expires < now) throw new Error("This proposal has expired. Prepare it again.");
  return payload;
}
