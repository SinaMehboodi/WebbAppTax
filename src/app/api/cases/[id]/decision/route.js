// Phase 5 — staff records the 3-branch decision and notifies the client.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { logActivity, setStatus } from "@/lib/workflow";
import { notify } from "@/lib/notifications";
import { can, PERMS } from "@/lib/permissions";
import { staffCanAccessCase } from "@/lib/case-access";

const ALLOWED = ["PROCEEDING", "NOT_PROCEEDING", "AUDIT_OFFERED"];

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !can(user, PERMS.CASE_DECIDE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await staffCanAccessCase(user, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { branch, note } = await request.json().catch(() => ({}));
  if (!ALLOWED.includes(branch)) {
    return NextResponse.json({ error: "bad branch" }, { status: 400 });
  }

  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.taxCase.update({
    where: { id },
    data: { decisionAt: new Date(), decisionNote: note || null },
  });
  await setStatus({ caseId: id, status: branch, actorId: user.id, note });
  await logActivity({ caseId: id, actorId: user.id, action: "decision.made", details: { branch, note } });
  await notify({
    userId: c.ownerId,
    caseId: id,
    titleKey: "cases.decision",
    bodyKey: `status.${branch}`,
    link: `/cases/${id}`,
    alsoEmail: true,
  });
  return NextResponse.json({ ok: true });
}
