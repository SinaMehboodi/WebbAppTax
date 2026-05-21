import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

const Schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional(),
});

export async function POST(request) {
  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey("login", ip), max: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate.tooManyAttempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "login.invalid" }, { status: 400 });
    }
    const { email, password, rememberMe } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      return NextResponse.json({ error: "login.invalid" }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "login.invalid" }, { status: 401 });
    }
    if (user.active === false) {
      return NextResponse.json({ error: "login.deactivated" }, { status: 403 });
    }
    if (!user.emailVerified) {
      return NextResponse.json({ error: "login.notVerified" }, { status: 403 });
    }

    await createSession(user.id, { ttlDays: rememberMe ? 90 : 30 });

    return NextResponse.json({
      ok: true,
      role: user.role,
      firstLoginTutorialSeen: user.firstLoginTutorialSeen,
    });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "login.invalid" }, { status: 500 });
  }
}
