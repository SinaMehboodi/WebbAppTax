// SUPER_ADMIN: force-set a new password for a user. Returns the new password
// so the admin can hand it to the user verbally / by separate channel.
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, generateToken } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

const Schema = z.object({
  password: z.string().min(8).max(200).optional(),
});

export async function POST(request, { params }) {
  const me = await getCurrentUser();
  if (!me || !can(me, PERMS.USERS_RESET_PASSWORD)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  // If no password provided, generate a strong random one
  const newPwd = parsed.data.password || generateToken(12).slice(0, 16);
  const hashed = await bcrypt.hash(newPwd, 10);

  await prisma.user.update({
    where: { id },
    data: { password: hashed, resetToken: null, resetExpires: null },
  });
  // Kill all existing sessions so they have to re-log
  await prisma.session.deleteMany({ where: { userId: id } });
  return NextResponse.json({ ok: true, password: newPwd });
}
