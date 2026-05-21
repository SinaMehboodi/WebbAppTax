"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InvoiceActions({
  caseId,
  invoice,
  feeModel,
  feePercent,
  estimatedSavings,
  feeFlatAmount,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function issue() {
    setLoading(true);
    await fetch(`/api/cases/${caseId}/invoice`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }
  async function markPaid() {
    if (!invoice) return;
    setLoading(true);
    await fetch(`/api/invoices/${invoice.id}/mark-paid`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  if (invoice) {
    return (
      <div className="text-sm space-y-2">
        <div>
          {invoice.number} ·{" "}
          {Number(invoice.amountTTC).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} ·{" "}
          <b>{invoice.status}</b>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/invoices/${invoice.id}`} className="underline">Open invoice</Link>
          {invoice.status !== "PAID" && (
            <button
              disabled={loading}
              onClick={markPaid}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Mark paid
            </button>
          )}
        </div>
      </div>
    );
  }

  let preview = "";
  if (feeModel === "PERCENT" && feePercent && estimatedSavings) {
    const ht = Number(estimatedSavings) * (Number(feePercent) / 100);
    preview = `Preview HT: ${ht.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`;
  } else if (feeModel && feeFlatAmount) {
    preview = `Preview HT: ${Number(feeFlatAmount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`;
  }

  return (
    <div className="space-y-2 text-sm">
      {preview && <div className="text-zinc-600 dark:text-zinc-400">{preview}</div>}
      <button
        onClick={issue}
        disabled={loading}
        className="btn-brand rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "..." : "Issue invoice"}
      </button>
    </div>
  );
}
