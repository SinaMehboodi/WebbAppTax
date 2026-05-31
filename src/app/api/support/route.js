// Public support endpoint — powers the login-page help widget.
//
// POST: a visitor (usually NOT logged in — they're here because they can't get
// in) sends a message. With no token we open a new thread; with a valid token
// we append to theirs and re-open it. Rate-limited by IP. Staff with
// support.view get pinged. No auth required — this is the one help channel a
// locked-out user still has.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notify } from "@/lib/notifications";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/audit";

const Schema = z.object({
  token: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(4000),
  locale: z.enum(["fr", "en"]).optional(),
});

function cleanEmail(v) {
  const s = (v || "").trim();
  return s.includes("@") && s.length <= 200 ? s : null;
}

export async function POST(request) {
  const ip = getClientIp(request);
  const ua = getUserAgent(request);

  // 12 messages / 10 min / IP — plenty for a real conversation, kills spam loops.
  const rl = await rateLimit({ key: rlKey("support", ip), max: 12, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate.tooManyAttempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const parsed = Schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { token, name, email, subject, message, locale } = parsed.data;

  // If they happen to be logged in, link the thread to their account.
  const me = await getCurrentUser().catch(() => null);

  let thread;
  if (token) {
    const existing = await prisma.supportThread.findUnique({ where: { publicToken: token } });
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
    thread = await prisma.supportThread.update({
      where: { id: existing.id },
      data: {
        status: "OPEN", // any new visitor message re-opens the thread
        lastMessageAt: new Date(),
        ...(me && !existing.userId ? { userId: me.id } : {}),
      },
    });
  } else {
    thread = await prisma.supportThread.create({
      data: {
        name: name || (me ? `${me.firstName} ${me.lastName}`.trim() : null),
        email: cleanEmail(email) || me?.email || null,
        subject: subject || null,
        userId: me?.id || null,
        locale: locale || me?.locale || "fr",
        ipAddress: ip,
        userAgent: ua,
        status: "OPEN",
        lastMessageAt: new Date(),
      },
    });
  }

  await prisma.supportMessage.create({
    data: { threadId: thread.id, authorId: me?.id || null, fromStaff: false, body: message },
  });

  // Ping staff who can open the inbox (SUPER_ADMIN/ADMIN always; employees with
  // support.view). Best-effort — never block the visitor on a notification.
  try {
    const staff = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { role: "SUPER_ADMIN" },
          { role: "ADMIN" },
          { role: "EMPLOYEE", permissions: { has: "support.view" } },
        ],
      },
      select: { id: true },
    });
    await Promise.all(
      staff.map((s) =>
        notify({
          userId: s.id,
          titleKey: "support.notifyNew",
          params: { name: thread.name || email || "visiteur" },
          link: `/admin/support/${thread.id}`,
          alsoEmail: false,
          alsoPush: true,
        })
      )
    );
  } catch (e) {
    console.error("[support] notify failed:", e.message);
  }

  return NextResponse.json({
    ok: true,
    token: thread.publicToken,
    threadId: thread.id,
    status: thread.status,
  });
}
