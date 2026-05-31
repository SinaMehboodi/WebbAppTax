// Generic status change (staff only). Used for moving between Phase 4/5/6
// intermediate states (ANALYZING, DECISION_PENDING, AWAITING_DOCUMENTS, ...).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffCanAccessCase } from "@/lib/case-access";
import { setStatus, STATUS } from "@/lib/workflow";

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await staffCanAccessCase(user, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { status, note } = await request.json().catch(() => ({}));
  if (!STATUS[status]) return NextResponse.json({ error: "bad status" }, { status: 400 });
  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  await setStatus({ caseId: id, status, actorId: user.id, note });
  return NextResponse.json({ ok: true });
}
