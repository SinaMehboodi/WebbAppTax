// Phase 6 §4 — Invoice detail with explanatory tutorial blocks for:
//   1. Impact on the client's tax bill
//   2. Billing base
//   3. Contractual framework
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";

export default async function InvoiceDetail({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { case: true },
  });
  if (!inv) notFound();
  const isOwner = inv.clientId === user.id;
  const isStaff = user.role === "ADMIN" || user.role === "EMPLOYEE";
  if (!isOwner && !isStaff) notFound();

  const { t } = await getDictionary();
  const ttc = Number(inv.amountTTC);
  const ht = Number(inv.amountHT);
  const base = Number(inv.baseAmount);

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
      <Link href="/invoices" className="text-sm underline text-zinc-600 dark:text-zinc-400">
        ← {t("common.back")}
      </Link>

      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{inv.number}</h1>
          <p className="text-zinc-500">
            {t("invoices.issuedAt")}: {new Date(inv.issuedAt).toLocaleDateString()} · {t("invoices.dueAt")}: {new Date(inv.dueAt).toLocaleDateString()}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm">
          {t(`invoiceStatus.${inv.status}`)}
        </span>
      </header>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">{t("invoices.amountHT")}</span>
          <span className="font-semibold">{ht.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">TVA {Number(inv.vatRate)}%</span>
          <span>{(ttc - ht).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
        </div>
        <div className="flex items-center justify-between text-lg pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <span>{t("invoices.amountTTC")}</span>
          <span className="font-semibold">{ttc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
        </div>
      </div>

      {/* Phase 6 educational tutorial */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("invoices.explainTitle")}</h2>

        <TutorialBlock
          n={1}
          title={t("invoices.explainImpact")}
          body={inv.case.resultSummary || ""}
        />
        <TutorialBlock
          n={2}
          title={t("invoices.explainBase")}
          body={
            inv.feeModel === "PERCENT"
              ? `${t("admin.feePercent")} ${Number(inv.feePercent || 0)}% × ${base.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`
              : `${t("admin.feeFlat")}: ${base.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`
          }
        />
        <TutorialBlock
          n={3}
          title={t("invoices.explainLegal")}
          body={t("invoices.explainLegalBody")}
        />
      </section>
    </div>
  );
}

function TutorialBlock({ n, title, body }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        <span className="h-6 w-6 rounded-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 flex items-center justify-center text-xs">
          {n}
        </span>
        <h3 className="font-medium">{title}</h3>
      </div>
      {body && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 whitespace-pre-line">{body}</p>}
    </div>
  );
}
