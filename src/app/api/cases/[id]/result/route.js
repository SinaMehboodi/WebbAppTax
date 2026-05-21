// Phase 6 — staff records the administrative response and visible result.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { setStatus, logActivity } from "@/lib/workflow";
import { notify } from "@/lib/notifications";
import { can, PERMS } from "@/lib/permissions";

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !can(user, PERMS.CASE_RECORD_RESULT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { summary, estimatedSavings, futureYearlyImpact, yearsCovered } = await request.json().catch(() => ({}));
  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.taxCase.update({
    where: { id },
    data: {
      resultAt: new Date(),
      resultSummary: summary || null,
      estimatedSavings: estimatedSavings != null ? Number(estimatedSavings) : null,
      futureYearlyImpact: futureYearlyImpact != null ? Number(futureYearlyImpact) : null,
      yearsCovered: yearsCovered || null,
    },
  });
  await setStatus({ caseId: id, status: "RESULT_DELIVERED", actorId: user.id });
  await logActivity({ caseId: id, actorId: user.id, action: "result.recorded" });
  await notify({
    userId: c.ownerId,
    caseId: id,
    titleKey: "cases.result",
    bodyKey: "status.RESULT_DELIVERED",
    link: `/cases/${id}`,
    alsoEmail: true,
  });
  return NextResponse.json({ ok: true });
}
