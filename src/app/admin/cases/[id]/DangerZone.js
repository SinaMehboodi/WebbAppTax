"use client";

// SUPER_ADMIN-only: hard-delete a case. Two-step confirmation with the
// reference typed back as the safety check.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DangerZone({ caseId, reference, fr }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function del() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/cases/${caseId}/delete`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "error");
      return;
    }
    router.push("/admin/cases");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-1.5 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30"
      >
        {fr ? "Supprimer définitivement ce dossier" : "Permanently delete this case"}
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20 p-4 space-y-3">
      <div className="text-xs text-rose-900 dark:text-rose-200">
        {fr
          ? <>Cette action est <b>irréversible</b>. Tous les documents, factures et historiques associés seront détruits. Tapez la référence <code className="font-mono px-1.5 py-0.5 bg-white/60 dark:bg-black/30 rounded">{reference}</code> pour confirmer.</>
          : <>This action is <b>irreversible</b>. All documents, invoices and history will be destroyed. Type the reference <code className="font-mono px-1.5 py-0.5 bg-white/60 dark:bg-black/30 rounded">{reference}</code> to confirm.</>}
      </div>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={reference}
        className="w-full p-2.5 rounded-xl font-mono text-sm border border-rose-300"
        autoFocus
      />
      {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setConfirming(false); setTyped(""); }}
          disabled={busy}
          className="btn-soft rounded-full px-4 py-1.5 text-xs font-medium"
        >
          {fr ? "Annuler" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={busy || typed !== reference}
          className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {busy ? "…" : (fr ? "Supprimer" : "Delete forever")}
        </button>
      </div>
    </div>
  );
}
