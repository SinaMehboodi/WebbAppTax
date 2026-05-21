// Request-level audit helpers — IP and User-Agent extraction that handles
// proxies the way Next.js + Vercel/Cloudflare/nginx commonly forward them.
import "server-only";
import { createHash } from "node:crypto";

export function getClientIp(request) {
  const h = request.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    // First entry is typically the original client; trim and validate
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf;
  const real = h.get("x-real-ip");
  if (real) return real;
  // Next.js doesn't expose request.ip in all runtimes; fall back to unknown.
  return "unknown";
}

export function getUserAgent(request) {
  return request.headers.get("user-agent") || "unknown";
}

export function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

export function shortHash(hex, n = 12) {
  return (hex || "").slice(0, n);
}
