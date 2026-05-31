// Phase 6 — staff marks an invoice as paid. Closes the underlying case.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { setStatus, logActivity } from "@/lib/workflow";
import { notify } from "@/lib/notifications";
import { can, PERMS } from "@/lib/permissions";
import { staffCanAccessCase } from "@/lib/case-access";

export async function POST(_request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !can(user, PERMS.CASE_MARK_PAID)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { case: true } });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await staffCanAccessCase(user, inv.caseId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await prisma.invoice.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
  await setStatus({ caseId: inv.caseId, status: "PAID", actorId: user.id });
  await prisma.taxCase.update({
    where: { id: inv.caseId },
    data: { closedAt: new Date(), archived: true, status: "CLOSED" },
  });
  await logActivity({ caseId: inv.caseId, actorId: user.id, action: "invoice.paid" });
  await notify({
    userId: inv.clientId,
    caseId: inv.caseId,
    titleKey: "invoiceStatus.PAID",
    link: `/invoices/${id}`,
  });
  return NextResponse.json({ ok: true });
}
