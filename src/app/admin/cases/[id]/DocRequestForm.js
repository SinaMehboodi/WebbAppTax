"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

export default function DocRequestForm({ caseId }) {
  const router = useRouter();
  const t = useT();
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!label.trim()) return;
    setLoading(true);
    await fetch(`/api/cases/${caseId}/doc-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, description }),
    });
    setLabel("");
    setDescription("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 text-sm">
      <input
        placeholder={t("caseForm.labelPlaceholder")}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1 p-2.5 rounded-xl"
      />
      <input
        placeholder={t("caseForm.descriptionPlaceholder")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-1 p-2.5 rounded-xl"
      />
      <button
        disabled={loading || !label.trim()}
        className="btn-brand rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:shadow-none"
      >
        + {t("caseForm.requestBtn")}
      </button>
    </form>
  );
}
