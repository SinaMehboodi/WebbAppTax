// WebAuthn helpers — Relying Party config + short-lived challenge store.
//
// The RP_ID is the host part of the URL (no port, no scheme). In dev that's
// "localhost". In production set APP_URL or RP_ID env var explicitly — RP_ID
// must match the host the browser is on or the assertion will be rejected.
//
// Challenges are stored in-memory keyed by a random handle that we send to
// the client; the client sends it back during verify. In multi-process prod
// you'd swap this for Redis — but for single-process Next.js dev/staging the
// Map is fine. Challenges expire after 5 minutes.
import "server-only";
import { randomBytes } from "node:crypto";

export function getRpId(request) {
  if (process.env.RP_ID) return process.env.RP_ID;
  // Derive from the incoming request's host header
  const host = request.headers.get("host") || "localhost";
  // Strip the port
  return host.split(":")[0];
}

export function getOrigin(request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export function getRpName() {
  return process.env.RP_NAME || "SamTaxco";
}

// ---------------------------------------------------------------------------
// Challenge store (in-memory, 5-min TTL)
// ---------------------------------------------------------------------------
const TTL_MS = 5 * 60 * 1000;
const store = new Map();

function gcExpired(now) {
  for (const [k, v] of store) if (v.expiresAt <= now) store.delete(k);
}

export function saveChallenge(payload) {
  const now = Date.now();
  gcExpired(now);
  const handle = randomBytes(18).toString("base64url");
  store.set(handle, { ...payload, expiresAt: now + TTL_MS });
  return handle;
}

export function popChallenge(handle) {
  if (!handle || typeof handle !== "string") return null;
  const v = store.get(handle);
  if (!v) return null;
  store.delete(handle);
  if (v.expiresAt <= Date.now()) return null;
  return v;
}

// ---------------------------------------------------------------------------
// User-Agent → friendly device name
// ---------------------------------------------------------------------------
export function uaToDeviceName(ua) {
  if (!ua) return "Unknown device";
  const platform = /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? "Android"
    : /Macintosh/.test(ua) ? "Mac"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : "Device";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /Firefox\//.test(ua) ? "Firefox"
    : null;
  return browser ? `${platform} (${browser})` : platform;
}
