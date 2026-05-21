"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResultForm({ caseId, initial }) {
  const router = useRouter();
  const [summary, setSummary] = useState(initial?.resultSummary || "");
  const [estimatedSavings, setEstimatedSavings] = useState(
    initial?.estimatedSavings ? String(initial.estimatedSavings) : ""
  );
  const [futureYearlyImpact, setFutureYearlyImpact] = useState(
    initial?.futureYearlyImpact ? String(initial.futureYearlyImpact) : ""
  );
  const [yearsCovered, setYearsCovered] = useState(initial?.yearsCovered || "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/cases/${caseId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        estimatedSavings: estimatedSavings ? Number(estimatedSavings) : null,
        futureYearlyImpact: futureYearlyImpact ? Number(futureYearlyImpact) : null,
        yearsCovered,
      }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 text-sm">
      <textarea
        rows={3}
        placeholder="Summary visible to client"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="w-full p-2.5 rounded-xl"
      />
      <div className="grid grid-cols-3 gap-2">
        <label>
          Savings (€)
          <input
            type="number"
            step="0.01"
            value={estimatedSavings}
            onChange={(e) => setEstimatedSavings(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl"
          />
        </label>
        <label>
          Future yearly impact (€)
          <input
            type="number"
            step="0.01"
            value={futureYearlyImpact}
            onChange={(e) => setFutureYearlyImpact(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl"
          />
        </label>
        <label>
          Years covered
          <input
            placeholder="2024-2025"
            value={yearsCovered}
            onChange={(e) => setYearsCovered(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl"
          />
        </label>
      </div>
      <button
        disabled={loading}
        className="btn-brand rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "..." : "Record result"}
      </button>
    </form>
  );
}
