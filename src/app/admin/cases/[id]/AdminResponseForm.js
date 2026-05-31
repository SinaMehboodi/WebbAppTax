"use client";

// Post-payment step: upload the tax administration's decision letter, which is
// stored as an ADMIN_RESPONSE document, then mark the case as having received
// the response (milestone) — which notifies the client.
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

export default function AdminResponseForm({ caseId, hasLetter = false }) {
  const router = useRouter();
  const t = useT();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const file = fileRef.current?.files?.[0];
    if (!file && !hasLetter) {
      setError(t("adminResp.letterRequired"));
      return;
    }
    setLoading(true);
    try {
      // 1) Upload the administration's letter as an ADMIN_RESPONSE document.
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("kind", "ADMIN_RESPONSE");
        const up = await fetch(`/api/cases/${caseId}/documents`, { method: "POST", body: fd });
        if (!up.ok) throw new Error("upload");
      }
      // 2) Record the response → milestone + notify the client.
      const res = await fetch(`/api/cases/${caseId}/admin-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("record");
      router.refresh();
    } catch {
      setError(t("adminResp.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      <p className="text-xs text-[var(--fg-muted)]">{t("adminResp.hint")}</p>
      <label className="block">
        <span className="text-xs font-medium">{t("adminResp.letterLabel")}</span>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="w-full mt-1 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[var(--surface-2)] file:px-3 file:py-1.5 file:text-xs file:font-medium"
        />
      </label>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        disabled={loading}
        className="btn-brand rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "..." : t("adminResp.submit")}
      </button>
    </form>
  );
}
