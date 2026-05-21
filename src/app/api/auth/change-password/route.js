// Logged-in user changes their own password. Requires the current password
// for confirmation (so a stolen-cookie attacker can't simply hijack the
// account). Rate-limited per user.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

const Schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
});

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey(`changepw:${me.id}`, ip), max: 10, windowMs: 15 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate.tooManyAttempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path?.[0];
    if (path === "newPassword" || path === "confirmPassword") {
      return NextResponse.json({ error: "password.tooShort" }, { status: 400 });
    }
    return NextResponse.json({ error: "password.invalid" }, { status: 400 });
  }
  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "password.mismatch" }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "password.sameAsOld" }, { status: 400 });
  }

  // Verify the current password against the stored hash
  const fresh = await prisma.user.findUnique({ where: { id: me.id } });
  if (!fresh) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await bcrypt.compare(currentPassword, fresh.password);
  if (!ok) {
    return NextResponse.json({ error: "password.currentWrong" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: me.id },
    data: { password: hashed },
  });

  // Kill all OTHER sessions of this user — only the current device stays in.
  // We can't read our own session token from session.js easily, so simplest:
  // delete every session and create a fresh one for this request.
  // (Optional safety; if you want to keep all sessions, drop this block.)
  // For now we leave all sessions alive — the user can keep their phones logged in.

  return NextResponse.json({ ok: true });
}
