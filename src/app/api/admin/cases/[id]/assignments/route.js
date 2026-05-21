// Multi-employee case assignment.
//
//   POST   { userId, role: "primary" | "team" } — adds an assignment. If
//          role=primary, also sets the case's primary manager.
//   DELETE { userId }                            — removes an assignment.
//
// Self-assignment requires CASE_ASSIGN_SELF; assigning anyone else requires
// CASE_ASSIGN_OTHERS.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";
import { logActivity } from "@/lib/workflow";

const AddSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["primary", "team"]).default("team"),
});
const RemoveSchema = z.object({ userId: z.string().cuid() });

export async function POST(request, { params }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => ({}));
  const parsed = AddSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { userId, role } = parsed.data;

  const isSelf = userId === me.id;
  const ok = isSelf ? can(me, PERMS.CASE_ASSIGN_SELF) : can(me, PERMS.CASE_ASSIGN_OTHERS);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || (target.role !== "EMPLOYEE" && target.role !== "ADMIN" && target.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "not.staff" }, { status: 400 });
  }
  if (!target.active) {
    return NextResponse.json({ error: "user.inactive" }, { status: 400 });
  }

  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.caseAssignment.upsert({
    where: { caseId_userId: { caseId: id, userId } },
    update: { assignedBy: me.id },
    create: { caseId: id, userId, assignedBy: me.id },
  });

  if (role === "primary") {
    await prisma.taxCase.update({ where: { id }, data: { managerId: userId } });
  }

  await logActivity({
    caseId: id,
    actorId: me.id,
    action: "case.assign",
    details: { userId, role, by: me.id, self: isSelf },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => ({}));
  const parsed = RemoveSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { userId } = parsed.data;

  const isSelf = userId === me.id;
  const ok = isSelf ? can(me, PERMS.CASE_ASSIGN_SELF) : can(me, PERMS.CASE_ASSIGN_OTHERS);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.caseAssignment.deleteMany({ where: { caseId: id, userId } });

  // If the removed user was the primary manager, clear that field
  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (c?.managerId === userId) {
    await prisma.taxCase.update({ where: { id }, data: { managerId: null } });
  }

  await logActivity({
    caseId: id,
    actorId: me.id,
    action: "case.unassign",
    details: { userId, by: me.id, self: isSelf },
  });
  return NextResponse.json({ ok: true });
}
