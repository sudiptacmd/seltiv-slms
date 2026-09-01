import { classSectionOptions } from "@/lib/students";
import { requireApiRole } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiRole("admin", "teacher", "accountant");
  } catch (r) {
    return r as Response;
  }
  const { classes, sections } = await classSectionOptions();
  return Response.json({ classes, sections });
}
