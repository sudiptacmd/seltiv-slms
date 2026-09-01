import { completeBkashPayment } from "@/lib/actions/payments";

export const runtime = "nodejs";

/**
 * Mock bKash IPN / callback. A real integration verifies a signature here;
 * the sandbox just needs { paymentID, status }.
 */
export async function POST(req: Request) {
  let body: { paymentID?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad payload" }, { status: 400 });
  }
  if (!body.paymentID) return Response.json({ error: "paymentID required" }, { status: 400 });

  const outcome = body.status === "failed" || body.status === "cancelled" ? "failure" : "success";
  const result = await completeBkashPayment(body.paymentID, outcome);
  return Response.json(result);
}
