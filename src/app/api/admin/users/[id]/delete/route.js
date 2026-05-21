// SUPER_ADMIN: hard-delete a user. Cascades to all their owned cases,
// uploaded documents, sessions, notifications, etc. (FK cascade in schema.)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

export async function POST(_request, { params }) {
  const me = await getCurrentUser();
  if (!me || !can(me, PERMS.USERS_DELETE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (id === me.id) return NextResponse.json({ error: "cannot delete yourself" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
