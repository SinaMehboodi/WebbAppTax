// SUPER_ADMIN: modify user name and / or email. Cascades to the related
// invoices and notifications via FK (just by editing the user record).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

const Schema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().max(254).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "nothing to update" });

export async function POST(request, { params }) {
  const me = await getCurrentUser();
  if (!me || !can(me, PERMS.USERS_MODIFY)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data = {};
  if (parsed.data.firstName) data.firstName = parsed.data.firstName;
  if (parsed.data.lastName) data.lastName = parsed.data.lastName;
  if (parsed.data.email) {
    const normalized = parsed.data.email.trim().toLowerCase();
    if (normalized !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email: normalized } });
      if (existing) return NextResponse.json({ error: "email.taken" }, { status: 409 });
      data.email = normalized;
    }
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
