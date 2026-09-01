import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../env";

/**
 * Two stores behind one interface:
 *  - images  → Cloudinary in production, local disk in dev
 *  - PDFs    → Supabase Storage in production, local disk in dev
 *    (Cloudinary cannot serve application/pdf, hence the split.)
 */

export type UploadResult = { url: string; key: string; provider: string };

const LOCAL_ROOT = path.resolve(process.cwd(), env.storageDir);

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function localPut(scope: "uploads" | "pdf", key: string, data: Buffer): Promise<UploadResult> {
  const abs = path.join(LOCAL_ROOT, scope, key);
  await ensureDir(path.dirname(abs));
  await fs.writeFile(abs, data);
  return { url: `/api/files/${scope}/${key}`, key, provider: "local" };
}

export async function localRead(scope: string, key: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(LOCAL_ROOT, scope, key));
  } catch {
    return null;
  }
}

/* ───────────────────────── Images (Cloudinary) ───────────────────────── */

export async function uploadImage(
  data: Buffer,
  opts: { folder: string; filename: string; contentType: string },
): Promise<UploadResult> {
  const safe = `${opts.folder}/${Date.now()}-${sanitize(opts.filename)}`;
  if (!env.cloudinary.enabled) return localPut("uploads", safe, data);

  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({ secure: true }); // reads CLOUDINARY_URL
  const b64 = `data:${opts.contentType};base64,${data.toString("base64")}`;
  const res = await cloudinary.uploader.upload(b64, {
    folder: `seltiv/${env.school.code}/${opts.folder}`,
    resource_type: "image",
    overwrite: false,
  });
  return { url: res.secure_url, key: res.public_id, provider: "cloudinary" };
}

export function cloudinarySignParams(folder: string) {
  if (!env.cloudinary.enabled) return null;
  const url = new URL(env.cloudinary.url);
  const apiKey = url.username;
  const apiSecret = url.password;
  const cloudName = url.hostname;
  const timestamp = Math.floor(Date.now() / 1000);
  const fullFolder = `seltiv/${env.school.code}/${folder}`;
  const toSign = `folder=${fullFolder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
  return { cloudName, apiKey, timestamp, folder: fullFolder, signature };
}

/* ───────────────────────── PDFs (Supabase Storage) ───────────────────────── */

export async function uploadPdf(
  data: Buffer,
  opts: { folder: string; filename: string },
): Promise<UploadResult> {
  const key = `${opts.folder}/${sanitize(opts.filename)}`;
  if (!env.supabase.enabled) return localPut("pdf", key, data);

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(env.supabase.url, env.supabase.serviceKey, {
    auth: { persistSession: false },
  });
  const bucket = env.supabase.pdfBucket;
  const objectPath = `${env.school.code}/${key}`;
  const { error } = await sb.storage
    .from(bucket)
    .upload(objectPath, data, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`supabase upload failed: ${error.message}`);
  // signed URL, 30 days
  const { data: signed } = await sb.storage.from(bucket).createSignedUrl(objectPath, 60 * 60 * 24 * 30);
  return {
    url: signed?.signedUrl ?? `${env.supabase.url}/storage/v1/object/public/${bucket}/${objectPath}`,
    key: objectPath,
    provider: "supabase",
  };
}

/** Refresh a short-lived signed URL for a stored PDF (sensitive docs). */
export async function signPdfUrl(key: string, seconds = 300): Promise<string> {
  if (!env.supabase.enabled) return `/api/files/pdf/${key}`;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(env.supabase.url, env.supabase.serviceKey, { auth: { persistSession: false } });
  const { data } = await sb.storage.from(env.supabase.pdfBucket).createSignedUrl(key, seconds);
  return data?.signedUrl ?? `/api/files/pdf/${key}`;
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export const storageStatus = () => ({
  images: env.cloudinary.enabled ? "cloudinary" : "local",
  pdfs: env.supabase.enabled ? "supabase" : "local",
});
