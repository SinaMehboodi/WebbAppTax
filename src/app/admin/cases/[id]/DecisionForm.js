"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

const BRANCHES = [
  { value: "PROCEEDING", labelKey: "admin.decisionProceed" },
  { value: "NOT_PROCEEDING", labelKey: "admin.decisionNoAction" },
  { value: "AUDIT_OFFERED", labelKey: "admin.decisionAudit" },
];

export default function DecisionForm({ caseId }) {
  const router = useRouter();
  const t = useT();
  const [branch, setBranch] = useState("PROCEEDING");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/cases/${caseId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, note }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      <div className="grid sm:grid-cols-3 gap-2">
        {BRANCHES.map((b) => (
          <label
            key={b.value}
            className={`block p-3 rounded-xl border-2 cursor-pointer transition ${
              branch === b.value
                ? "border-[var(--brand-500)] bg-emerald-50 dark:bg-emerald-950/30"
                : "border-[var(--border)] hover:border-[var(--brand-500)]/40"
            }`}
          >
            <input
              type="radio"
              name="branch"
              value={b.value}
              checked={branch === b.value}
              onChange={() => setBranch(b.value)}
              className="sr-only"
            />
            <span className="font-medium">{t(b.labelKey)}</span>
          </label>
        ))}
      </div>
      <textarea
        rows={3}
        placeholder={t("admin.decisionNotePlaceholder")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full p-2.5 rounded-xl"
      />
      <button
        disabled={loading}
        className="btn-brand rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "..." : t("admin.submitDecision")}
      </button>
    </form>
  );
}
