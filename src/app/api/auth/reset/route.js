import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

const Schema = z.object({
  token: z.string().min(8).max(128),
  password: z.string().min(8).max(200),
});

export async function POST(request) {
  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey("reset", ip), max: 10, windowMs: 15 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate.tooManyAttempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "reset.invalidToken" }, { status: 400 });
  }
  const { token, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetExpires || user.resetExpires < new Date()) {
    return NextResponse.json({ error: "reset.invalidToken" }, { status: 400 });
  }
  const hashed = await bcrypt.hash(password, 10);
  // If this was an onboarding token (account created by staff and never
  // verified yet), mark the email as verified now — the user proved they
  // own the inbox by clicking the link.
  const wasOnboarding = !user.emailVerified;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetExpires: null,
      // Clear any pending verifyToken too — they're verified by reaching here.
      verifyToken: null,
      verifyExpires: null,
      emailVerified: user.emailVerified || new Date(),
    },
  });
  return NextResponse.json({ ok: true, onboarding: wasOnboarding });
}
