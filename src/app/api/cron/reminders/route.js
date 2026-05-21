// Daily cron endpoint. Call once a day from Vercel Cron / GitHub Actions /
// any external scheduler:
//
//   curl -H "x-cron-secret: $CRON_SECRET" https://<host>/api/cron/reminders
//
// What it does, per request:
//   1. Invoice reminders — push + email at D+15 and D+30 of overdue.
//   2. Annual reminders — Phase 7 §3, e.g. "TF 2026 due in ~30 days".
//
// The job is idempotent: it inserts an InvoiceReminder row per kind so it
// never sends the same reminder twice.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = {
    invoiceReminders: { day15: 0, day30: 0 },
    annualReminders: { sent: 0, scheduled: 0 },
    startedAt: new Date().toISOString(),
  };

  // --- 1. Invoice reminders ----------------------------------------------
  const now = new Date();
  const overdue = await prisma.invoice.findMany({
    where: {
      status: { in: ["ISSUED", "AWAITING_PAYMENT", "REMINDED_15", "OVERDUE"] },
      paidAt: null,
      issuedAt: { lt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) },
    },
    include: { reminders: true, client: true, case: { select: { id: true, reference: true } } },
  });

  for (const inv of overdue) {
    const issuedAgoMs = now - inv.issuedAt;
    const days = Math.floor(issuedAgoMs / (24 * 60 * 60 * 1000));
    const alreadySent = new Set(inv.reminders.map((r) => r.kind));

    let kind = null;
    let nextStatus = null;
    if (days >= 30 && !alreadySent.has("DAY_30")) {
      kind = "DAY_30";
      nextStatus = "OVERDUE";
      summary.invoiceReminders.day30 += 1;
    } else if (days >= 15 && !alreadySent.has("DAY_15")) {
      kind = "DAY_15";
      nextStatus = "REMINDED_15";
      summary.invoiceReminders.day15 += 1;
    }
    if (!kind) continue;

    await prisma.invoiceReminder.create({ data: { invoiceId: inv.id, kind } });
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { status: nextStatus },
    });
    await notify({
      userId: inv.clientId,
      caseId: inv.caseId,
      titleKey: "invoices.title",
      bodyKey: "invoices.amount",
      params: { number: inv.number, amount: Number(inv.amountTTC) },
      link: `/invoices/${inv.id}`,
      alsoEmail: true,
      alsoPush: true,
    });
  }

  // --- 2. Annual reminders (Phase 7) -------------------------------------
  // Strategy: for each USER who has at least one previous TF/CFE case, ensure
  // an AnnualReminder row exists for the current year scheduled ~30 days
  // before the typical notice date (Sep 1 for TF, Oct 1 for CFE). On the day
  // it fires we send the push + email.
  const year = now.getFullYear();
  const clientsWithHistory = await prisma.user.findMany({
    where: {
      role: "USER",
      cases: { some: { taxType: { in: ["TF", "CFE"] }, status: { in: ["PAID", "CLOSED", "ACTIVE", "RESULT_DELIVERED", "INVOICED"] } } },
    },
    select: { id: true, locale: true },
  });

  for (const u of clientsWithHistory) {
    for (const tt of ["TF", "CFE"]) {
      const scheduledFor = new Date(year, tt === "TF" ? 8 : 9, 1); // Sep 1 or Oct 1
      const existing = await prisma.annualReminder.findUnique({
        where: { userId_taxType_year: { userId: u.id, taxType: tt, year } },
      }).catch(() => null);
      if (!existing) {
        await prisma.annualReminder.create({
          data: { userId: u.id, taxType: tt, year, scheduledFor },
        });
        summary.annualReminders.scheduled += 1;
      } else if (!existing.sentAt && existing.scheduledFor <= now) {
        await prisma.annualReminder.update({
          where: { id: existing.id },
          data: { sentAt: now },
        });
        await notify({
          userId: u.id,
          titleKey: "notifications.annualReminderTitle",
          bodyKey: "notifications.annualReminderBody",
          params: { taxType: tt, year: String(year) },
          link: `/cases/new`,
          alsoEmail: true,
          alsoPush: true,
        });
        summary.annualReminders.sent += 1;
      }
    }
  }

  summary.finishedAt = new Date().toISOString();
  return NextResponse.json(summary);
}
