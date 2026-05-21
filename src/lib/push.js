// Web Push helper — sends a notification payload to every PushSubscription
// for a user. Failures with HTTP 404/410 mean the browser revoked the
// subscription, so we clean those rows up.
import "server-only";
import webpush from "web-push";
import { prisma } from "./prisma";

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@mindset.local";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!PUB || !PRIV) return false;
  webpush.setVapidDetails(SUBJECT, PUB, PRIV);
  configured = true;
  return true;
}

export function pushEnabled() {
  return !!(PUB && PRIV);
}

export async function pushToUser({ userId, title, body, url, tag }) {
  if (!ensureConfigured()) return { skipped: true, reason: "no-vapid" };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return { sent: 0 };

  const payload = JSON.stringify({ title, body, url: url || "/", tag: tag || "mindset" });
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  // Clean up dead subscriptions
  const dead = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const code = r.reason?.statusCode;
      if (code === 404 || code === 410) dead.push(subs[i].id);
    }
  });
  if (dead.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
  }

  return { sent: results.filter((r) => r.status === "fulfilled").length, removed: dead.length };
}
