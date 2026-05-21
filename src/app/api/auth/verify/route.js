import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

// Accepts either a token (from the email link) or a 6-digit code (typed by
// the user). Marks the user as verified and clears the token.
const Schema = z.object({
  token: z.string().min(8).max(128).optional(),
  code: z.string().regex(/^\d{6}$/).optional(),
  email: z.string().email().max(254).optional(),
});

export async function POST(request) {
  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey("verify", ip), max: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate.tooManyAttempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "verify.invalidCode" }, { status: 400 });
  }
  const { token, code, email } = parsed.data;

  let user = null;
  if (token) {
    user = await prisma.user.findUnique({ where: { verifyToken: token } });
  } else if (code && email) {
    const candidate = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (candidate && candidate.verifyToken) {
      const expected = String(
        parseInt(candidate.verifyToken.replace(/[^0-9]/g, "").slice(0, 6) || "0", 10)
      )
        .padStart(6, "0")
        .slice(0, 6);
      if (expected === code) user = candidate;
    }
  }

  if (!user || !user.verifyExpires || user.verifyExpires < new Date()) {
    return NextResponse.json({ error: "verify.invalidCode" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verifyToken: null, verifyExpires: null },
  });

  return NextResponse.json({ ok: true });
}
