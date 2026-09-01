import { buildTemplate, type ImportKind } from "@/lib/import-templates";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const VALID: ImportKind[] = ["students", "guardians", "staff"];

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { name } = await params;
  const kind = name.replace(/\.xlsx$/, "") as ImportKind;
  if (!VALID.includes(kind)) return new Response("Unknown template", { status: 404 });

  const buf = await buildTemplate(kind);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="slms-${kind}-template.xlsx"`,
    },
  });
}
