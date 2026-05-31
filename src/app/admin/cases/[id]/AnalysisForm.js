"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

export default function AnalysisForm({ caseId }) {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({
    rentalValueReview: "",
    surfaceCheck: "",
    useClassification: "",
    annexesNotes: "",
    cadastralComparison: "",
    legalChanges: "",
    simulationNotes: "",
    estimatedSavings: "",
    yearsCovered: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/cases/${caseId}/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        estimatedSavings: form.estimatedSavings ? Number(form.estimatedSavings) : null,
      }),
    });
    setLoading(false);
    router.refresh();
  }

  const fields = [
    ["rentalValueReview", t("caseForm.rentalValueReview")],
    ["surfaceCheck", t("caseForm.surfaceCheck")],
    ["useClassification", t("caseForm.useClassification")],
    ["annexesNotes", t("caseForm.annexesNotes")],
    ["cadastralComparison", t("caseForm.cadastralComparison")],
    ["legalChanges", t("caseForm.legalChanges")],
    ["simulationNotes", t("caseForm.simulationNotes")],
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-2 text-sm">
      {fields.map(([k, label]) => (
        <label key={k} className="block">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{label}</span>
          <textarea
            rows={2}
            value={form[k]}
            onChange={set(k)}
            className="w-full mt-1 p-2.5 rounded-xl"
          />
        </label>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <label>
          {t("caseForm.estimatedSavings")}
          <input
            type="number"
            step="0.01"
            value={form.estimatedSavings}
            onChange={set("estimatedSavings")}
            className="w-full mt-1 p-2.5 rounded-xl"
          />
        </label>
        <label>
          {t("caseForm.yearsCovered")}
          <input
            placeholder={t("caseForm.yearsPlaceholder")}
            value={form.yearsCovered}
            onChange={set("yearsCovered")}
            className="w-full mt-1 p-2.5 rounded-xl"
          />
        </label>
      </div>
      <button
        disabled={loading}
        className="btn-brand rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "..." : t("caseForm.saveAnalysis")}
      </button>
    </form>
  );
}
