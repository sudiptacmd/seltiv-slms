import { NextRequest } from "next/server";
import { localRead } from "@/lib/adapters/storage";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scope: string; key: string[] }> },
) {
  const { scope, key } = await params;
  if (!["uploads", "pdf", "mail"].includes(scope)) {
    return new Response("Not found", { status: 404 });
  }
  // PDFs and generated docs may be sensitive — require a signed-in user.
  if (scope === "pdf" || scope === "mail") {
    const user = await getCurrentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
  }

  const rel = key.join("/");
  if (rel.includes("..")) return new Response("Bad request", { status: 400 });

  const data = await localRead(scope, rel);
  if (!data) return new Response("Not found", { status: 404 });

  const ext = rel.slice(rel.lastIndexOf(".")).toLowerCase();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
