import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/session";
import { sendResetLink } from "@/lib/email";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

const Schema = z.object({ email: z.string().email().max(254) });

export async function POST(request) {
  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey("forgot", ip), max: 5, windowMs: 15 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: true }, // do not leak rate-limit state on this endpoint
      { status: 200 }
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  // Always return ok to avoid leaking which emails are registered
  if (!parsed.success) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.trim().toLowerCase() },
  });
  if (user) {
    const resetToken = generateToken(24);
    const resetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1h
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });
    const base = new URL(request.url).origin;
    const link = `${base}/reset-password?token=${resetToken}`;
    await sendResetLink({ to: user.email, link, locale: user.locale });
  }
  return NextResponse.json({ ok: true });
}
