// ADMIN/SUPER_ADMIN: create a new EMPLOYEE account. Initial permissions can
// be passed; defaults to an empty array (effectively read-only employee).
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, generateToken } from "@/lib/session";
import { can, PERMS, filterGrantable } from "@/lib/permissions";

const Schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  permissions: z.array(z.string().min(1).max(64)).max(64).default([]),
});

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // SUPER_ADMIN only — admin cannot create new accounts.
  if (!can(me, PERMS.USERS_CREATE)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.issues.map(i => `${i.path[0]}: ${i.message}`) }, { status: 400 });
  }
  const data = parsed.data;
  const email = data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "email.taken" }, { status: 409 });

  const hashed = await bcrypt.hash(data.password, 10);
  const cleaned = filterGrantable(data.permissions);
  const referralCode = generateToken(8).slice(0, 10);

  const created = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName: data.firstName,
      lastName: data.lastName,
      role: "EMPLOYEE",
      locale: "fr",
      // Employees created by admin are pre-verified — they bypass the email
      // verification flow.
      emailVerified: new Date(),
      firstLoginTutorialSeen: true,
      active: true,
      permissions: cleaned,
      referralCode,
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  return NextResponse.json({ ok: true, user: created });
}
