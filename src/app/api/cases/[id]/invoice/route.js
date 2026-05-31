// Phase 6 §5 — staff issues the invoice. Computes HT/TTC from the case's
// fee model and savings. Sends notification + email to client.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { setStatus, logActivity } from "@/lib/workflow";
import { notify } from "@/lib/notifications";
import { can, PERMS } from "@/lib/permissions";
import { staffCanAccessCase } from "@/lib/case-access";

const VAT = 20.0; // France standard rate

export async function POST(_request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !can(user, PERMS.CASE_INVOICE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await staffCanAccessCase(user, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const c = await prisma.taxCase.findUnique({
    where: { id },
    include: { invoice: true, owner: true },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (c.invoice) return NextResponse.json({ error: "already invoiced" }, { status: 409 });

  const baseAmount = Number(c.estimatedSavings || c.feeFlatAmount || 0);
  let amountHT = 0;
  if (c.feeModel === "PERCENT" && c.feePercent && c.estimatedSavings) {
    amountHT = Math.round(Number(c.estimatedSavings) * (Number(c.feePercent) / 100) * 100) / 100;
  } else if (c.feeModel === "FLAT" || c.feeModel === "AUDIT") {
    amountHT = Number(c.feeFlatAmount || 0);
  }
  const amountTTC = Math.round(amountHT * (1 + VAT / 100) * 100) / 100;

  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { number: { startsWith: `INV-${year}-` } } });
  const number = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
  const dueAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const inv = await prisma.invoice.create({
    data: {
      number,
      caseId: id,
      clientId: c.ownerId,
      issuerId: user.id,
      baseAmount,
      feeModel: c.feeModel || "FLAT",
      feePercent: c.feePercent || null,
      amountHT,
      vatRate: VAT,
      amountTTC,
      dueAt,
      status: "AWAITING_PAYMENT",
    },
  });
  await setStatus({ caseId: id, status: "INVOICED", actorId: user.id });
  await logActivity({ caseId: id, actorId: user.id, action: "invoice.issued", details: { invoiceId: inv.id, amountTTC } });
  await notify({
    userId: c.ownerId,
    caseId: id,
    titleKey: "invoices.title",
    bodyKey: "invoices.amount",
    params: { number, amount: amountTTC },
    link: `/invoices/${inv.id}`,
    alsoEmail: true,
  });
  return NextResponse.json({ ok: true, invoiceId: inv.id });
}
