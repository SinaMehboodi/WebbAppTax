// Storage abstraction. In dev we save files to disk under ./uploads, in prod
// we switch to S3 (or any S3-compatible bucket: Supabase Storage, R2, MinIO).
//
//   STORAGE_PROVIDER=local        -> writes to ./uploads/<key>
//   STORAGE_PROVIDER=s3           -> writes to s3://$S3_BUCKET/<key>
//                                    requires S3_BUCKET, S3_REGION,
//                                    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
//                                    optional: S3_ENDPOINT (for R2/Supabase),
//                                              S3_PUBLIC_BASE (if bucket is public),
//                                              S3_FORCE_PATH_STYLE=true (for MinIO)
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

const PROVIDER = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
const LOCAL_ROOT = path.resolve(process.env.LOCAL_STORAGE_ROOT || "./uploads");
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || "eu-west-1";
const S3_ENDPOINT = process.env.S3_ENDPOINT || undefined;
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true";

export function activeProvider() {
  return PROVIDER === "s3" ? "S3" : "LOCAL";
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

export function makeKey({ userId, scope = "misc", filename }) {
  const safe = (filename || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `${scope}/${userId}/${Date.now()}-${randomUUID()}-${safe}`;
}

export async function putFile({ key, buffer, mimeType }) {
  if (PROVIDER === "s3") return s3Put(key, buffer, mimeType);
  return localPut(key, buffer);
}

export async function getFile(key) {
  if (PROVIDER === "s3") return s3Get(key);
  return localGet(key);
}

export async function deleteFile(key) {
  if (PROVIDER === "s3") return s3Delete(key);
  return localDelete(key);
}

export function publicUrl(key) {
  if (PROVIDER === "s3" && process.env.S3_PUBLIC_BASE) {
    return `${process.env.S3_PUBLIC_BASE}/${key}`;
  }
  // Local: served via /api/documents/[id]
  return null;
}

// --- LOCAL impl -------------------------------------------------------------
async function localPut(key, buffer) {
  const full = path.join(LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return { key, sha256: sha256(buffer), sizeBytes: buffer.length };
}
async function localGet(key) {
  const full = path.join(LOCAL_ROOT, key);
  return fs.readFile(full);
}
async function localDelete(key) {
  const full = path.join(LOCAL_ROOT, key);
  await fs.unlink(full).catch(() => {});
}

// --- S3 impl ----------------------------------------------------------------
let _client = null;
async function getClient() {
  if (_client) return _client;
  if (!S3_BUCKET) {
    throw new Error("STORAGE_PROVIDER=s3 but S3_BUCKET is not configured.");
  }
  const { S3Client } = await import("@aws-sdk/client-s3");
  _client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: S3_FORCE_PATH_STYLE,
  });
  return _client;
}

async function s3Put(key, buffer, mimeType) {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
      CacheControl: "private, max-age=31536000, immutable",
    })
  );
  return { key, sha256: sha256(buffer), sizeBytes: buffer.length };
}

async function s3Get(key) {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient();
  const out = await client.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  // Body is a Web ReadableStream in Node 18+ SDK; convert to Buffer.
  const chunks = [];
  for await (const chunk of out.Body) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function s3Delete(key) {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient();
  await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

/**
 * Pre-signed GET URL — gives the browser direct, short-lived access to a
 * private S3 object so we don't have to proxy big PDFs through our API.
 * Returns null for the local provider; the caller should fall back to the
 * existing `/api/documents/[id]` route in that case.
 */
export async function presignedGetUrl(key, ttlSeconds = 300) {
  if (PROVIDER !== "s3") return null;
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await getClient();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: ttlSeconds }
  );
}
