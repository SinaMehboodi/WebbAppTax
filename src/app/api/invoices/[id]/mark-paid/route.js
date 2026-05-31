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
  // Payment no longer closes the case. Per the firm's process the tax
  // administration's decision letter arrives AFTER payment, so the case stays
  // open at PAID until staff record that response (POST /admin-response) and
  // then finish the case via the close flow.
  await setStatus({ caseId: inv.caseId, status: "PAID", actorId: user.id });
  await logActivity({ caseId: inv.caseId, actorId: user.id, action: "invoice.paid" });
  await notify({
    userId: inv.clientId,
    caseId: inv.caseId,
    titleKey: "invoiceStatus.PAID",
    link: `/invoices/${id}`,
  });
  return NextResponse.json({ ok: true });
}
