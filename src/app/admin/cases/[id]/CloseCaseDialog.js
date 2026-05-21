"use client";

// Inline 3-button close panel — Finish / Stop / Cancel. Stop and Cancel
// expand a textarea for the reason and disable submit until the reason is at
// least 3 chars.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CloseCaseDialog({ caseId, fr }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState(null); // "finish" | "stop" | "cancel" | null
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/cases/${caseId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, reason: reason.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "error");
      return;
    }
    setOutcome(null);
    setReason("");
    router.refresh();
  }

  if (!outcome) {
    return (
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setOutcome("finish")}
          className="rounded-xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 p-3 text-sm font-medium hover:border-emerald-400 transition"
        >
          ✓ {fr ? "Terminer avec succès" : "Finish successfully"}
        </button>
        <button
          type="button"
          onClick={() => setOutcome("stop")}
          className="rounded-xl border-2 border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 p-3 text-sm font-medium hover:border-amber-400 transition"
        >
          ⏸ {fr ? "Arrêter" : "Stop"}
        </button>
        <button
          type="button"
          onClick={() => setOutcome("cancel")}
          className="rounded-xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 p-3 text-sm font-medium hover:border-rose-400 transition"
        >
          ✕ {fr ? "Annuler" : "Cancel"}
        </button>
      </div>
    );
  }

  const needsReason = outcome === "stop" || outcome === "cancel";
  const canSubmit = !needsReason || reason.trim().length >= 3;

  const labels = {
    finish: fr ? "Terminer le dossier avec succès" : "Finish the case successfully",
    stop:   fr ? "Arrêter le dossier" : "Stop the case",
    cancel: fr ? "Annuler le dossier" : "Cancel the case",
  };
  const TONE = {
    finish: "emerald",
    stop:   "amber",
    cancel: "rose",
  };
  const tone = TONE[outcome];
  const toneCls = {
    emerald: "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20",
    amber:   "border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20",
    rose:    "border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20",
  }[tone];
  const btnCls = {
    finish: "bg-emerald-600 hover:bg-emerald-700",
    stop:   "bg-amber-600 hover:bg-amber-700",
    cancel: "bg-rose-600 hover:bg-rose-700",
  }[outcome];

  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${toneCls}`}>
      <div className="font-medium text-sm">{labels[outcome]}</div>

      {needsReason && (
        <label className="block text-xs">
          <span className="uppercase tracking-wider text-[var(--fg-muted)]">
            {fr ? "Raison (visible par le client)" : "Reason (visible to the client)"} *
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={fr
              ? "Ex. : Le client a retiré sa demande, dossier hors champ d'intervention…"
              : "e.g. Client withdrew the request, case outside our scope…"
            }
            className="w-full mt-1 p-2.5 rounded-xl text-sm"
            autoFocus
          />
        </label>
      )}

      {!needsReason && (
        <label className="block text-xs">
          <span className="uppercase tracking-wider text-[var(--fg-muted)]">
            {fr ? "Note (optionnelle)" : "Note (optional)"}
          </span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={fr ? "Ex. : Mission soldée, paiement reçu." : "e.g. Mission complete, payment received."}
            className="w-full mt-1 p-2.5 rounded-xl text-sm"
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOutcome(null); setReason(""); setError(""); }}
          disabled={busy}
          className="btn-soft rounded-full px-4 py-1.5 text-xs font-medium"
        >
          {fr ? "Retour" : "Back"}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !canSubmit}
          className={`rounded-full text-white px-4 py-1.5 text-xs font-medium disabled:opacity-50 ${btnCls}`}
        >
          {busy ? "…" : (fr ? "Confirmer" : "Confirm")}
        </button>
      </div>
    </div>
  );
}
