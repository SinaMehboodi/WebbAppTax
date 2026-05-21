// In-memory rate limiter. Good enough for single-process dev/staging; for
// multi-replica prod replace `bucket` with Redis or Upstash.
//
//   const r = await rateLimit({ key: `login:${ip}`, max: 5, windowMs: 60_000 });
//   if (!r.ok) return new Response("Too many attempts", { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
//
// Buckets are pruned lazily on read.
import "server-only";

const bucket = new Map();

export async function rateLimit({ key, max, windowMs }) {
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry || entry.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > max) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: Math.max(0, max - entry.count), retryAfter: 0 };
}

// Convenience: build a key from IP + scope. Falls back to "anon" if IP missing.
export function rlKey(scope, ip) {
  return `${scope}:${ip || "anon"}`;
}
