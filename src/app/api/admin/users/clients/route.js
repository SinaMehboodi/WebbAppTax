// Permission-gated: register a new USER (client) on the client's behalf.
// The account is created WITHOUT a password — a reset token is generated and
// emailed to the client as an "activate your account" link. The client clicks
// the link, sets their own password, and their email is auto-verified.
//
// Permission: USERS_CREATE_CLIENT (grantable to EMPLOYEE by ADMIN/SUPER_ADMIN).
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, generateToken } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";
import { sendOnboardingLink } from "@/lib/email";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

const Schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  phone: z.string().trim().max(40).optional().nullable(),
  companyName: z.string().trim().max(120).optional().nullable(),
  siret: z.string().trim().max(40).optional().nullable(),
  referenceRepId: z.string().cuid().optional().nullable(),
  locale: z.enum(["fr", "en"]).optional(),
});

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can(me, PERMS.USERS_CREATE_CLIENT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey(`clients:${me.id}`, ip), max: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate.tooManyAttempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.issues.map((i) => `${i.path[0]}: ${i.message}`) },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const email = data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "email.taken" }, { status: 409 });

  // Reference rep — default to the creator if they're an EMPLOYEE/ADMIN/SUPER_ADMIN
  let repId = data.referenceRepId || null;
  if (!repId && ["EMPLOYEE", "ADMIN", "SUPER_ADMIN"].includes(me.role)) {
    repId = me.id;
  }
  if (repId) {
    const rep = await prisma.user.findUnique({ where: { id: repId } });
    if (!rep || !["EMPLOYEE", "ADMIN", "SUPER_ADMIN"].includes(rep.role)) repId = null;
  }

  // Random placeholder password (the client never sees it — they set their
  // own via the onboarding reset link). We still store a strong hash so the
  // login route's bcrypt.compare path stays uniform.
  const placeholderPwd = generateToken(24);
  const hashed = await bcrypt.hash(placeholderPwd, 10);

  const resetToken = generateToken(24);
  const resetExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for onboarding
  const referralCode = generateToken(8).slice(0, 10);

  const created = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      companyName: data.companyName || null,
      siret: data.siret || null,
      role: "USER",
      locale: data.locale === "en" ? "en" : "fr",
      // Onboarding-via-link auto-verifies the email when they set their
      // password (handled in /api/auth/reset). For now leave it null so they
      // can't log in without going through the link first.
      emailVerified: null,
      resetToken,
      resetExpires,
      firstLoginTutorialSeen: false,
      referenceRepId: repId,
      referralCode,
    },
    select: { id: true, email: true, firstName: true, lastName: true, locale: true },
  });

  const base = new URL(request.url).origin;
  const link = `${base}/reset-password?token=${resetToken}&onboarding=1`;
  const byName = `${me.firstName} ${me.lastName}`.trim();

  try {
    await sendOnboardingLink({ to: created.email, link, byName, locale: created.locale });
  } catch (err) {
    console.error("[register-client] email failed:", err.message);
  }

  return NextResponse.json({
    ok: true,
    user: created,
    // Dev-only: surface the activation link so the operator can copy it
    // when no real email transport is configured.
    onboardingHint:
      process.env.NODE_ENV !== "production"
        ? { link, expiresAt: resetExpires.toISOString() }
        : undefined,
  });
}
