import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/session";
import { sendVerification } from "@/lib/email";
import { notifyStaff } from "@/lib/notifications";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

const Schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  phone: z.string().trim().max(40).optional().nullable(),
  password: z.string().min(8).max(200),
  confirmPassword: z.string().optional(),
  referenceRepId: z.string().cuid().optional().nullable(),
  companyName: z.string().trim().max(120).optional().nullable(),
  siret: z.string().trim().max(40).optional().nullable(),
  locale: z.enum(["fr", "en"]).optional(),
  referredByCode: z.string().trim().max(40).optional().nullable(),
});

export async function POST(request) {
  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey("signup", ip), max: 5, windowMs: 5 * 60_000 });
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
      const firstIssue = parsed.error.issues[0];
      const path = firstIssue.path[0];
      if (path === "password") return NextResponse.json({ error: "signup.passwordTooShort" }, { status: 400 });
      return NextResponse.json({ error: "signup.missingFields" }, { status: 400 });
    }
    const data = parsed.data;
    if (data.confirmPassword !== undefined && data.confirmPassword !== data.password) {
      return NextResponse.json({ error: "signup.passwordMismatch" }, { status: 400 });
    }

    const normalized = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return NextResponse.json({ error: "signup.emailTaken" }, { status: 409 });
    }

    // Validate referenceRep if provided
    let repId = null;
    if (data.referenceRepId) {
      const rep = await prisma.user.findUnique({ where: { id: data.referenceRepId } });
      if (rep && (rep.role === "EMPLOYEE" || rep.role === "ADMIN")) repId = rep.id;
    }

    let referredById = null;
    if (data.referredByCode) {
      const inviter = await prisma.user.findUnique({ where: { referralCode: data.referredByCode } });
      if (inviter) referredById = inviter.id;
    }

    const hashed = await bcrypt.hash(data.password, 10);
    const verifyToken = generateToken(24);
    const verifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const referralCode = generateToken(8).slice(0, 10);

    const user = await prisma.user.create({
      data: {
        email: normalized,
        password: hashed,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        companyName: data.companyName || null,
        siret: data.siret || null,
        locale: data.locale === "en" ? "en" : "fr",
        referenceRepId: repId,
        referredById,
        verifyToken,
        verifyExpires,
        referralCode,
      },
      select: { id: true, email: true, firstName: true, lastName: true, locale: true },
    });

    const base = new URL(request.url).origin;
    const link = `${base}/verify?token=${verifyToken}`;
    const code = String(parseInt(verifyToken.replace(/[^0-9]/g, "").slice(0, 6) || "0", 10))
      .padStart(6, "0")
      .slice(0, 6);

    await sendVerification({ to: user.email, code, link, locale: user.locale });

    if (repId) {
      await notifyStaff({
        titleKey: "admin.newCase",
        bodyKey: "admin.newCase",
        link: `/admin/users`,
        caseId: null,
      });
    }

    return NextResponse.json(
      { success: true, user, verifyHint: process.env.NODE_ENV !== "production" ? { code, link } : undefined },
      { status: 201 }
    );
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json({ error: "signup.genericError" }, { status: 500 });
  }
}
