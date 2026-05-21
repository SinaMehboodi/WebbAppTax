// Admin-only: toggle a user's active flag. Deactivation kills all the user's
// sessions so they can't keep browsing until their cookie expires.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

const Schema = z.object({ active: z.boolean() });

export async function POST(request, { params }) {
  const admin = await getCurrentUser();
  // SUPER_ADMIN only — admin cannot deactivate users.
  if (!admin || !can(admin, PERMS.USERS_DEACTIVATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { active } = parsed.data;

  // Don't let an admin lock themselves out
  if (id === admin.id && !active) {
    return NextResponse.json({ error: "cannot deactivate yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.user.update({
    where: { id },
    data: {
      active,
      deactivatedAt: active ? null : new Date(),
      deactivatedBy: active ? null : admin.id,
    },
  });
  if (!active) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }
  return NextResponse.json({ ok: true });
}
