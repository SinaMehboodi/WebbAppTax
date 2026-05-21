"use client";

// ADMIN-only switch. Toggling to inactive immediately kills the target's
// sessions on the server (see /api/admin/users/[id]/active).
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserActiveToggle({ userId, active, fr }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function toggle(next) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}/active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "error");
      setConfirming(false);
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (error) {
    return <span className="text-xs text-rose-600">{error}</span>;
  }

  if (active) {
    if (confirming) {
      return (
        <span className="inline-flex gap-1">
          <button
            type="button"
            onClick={() => toggle(false)}
            disabled={busy}
            className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-xs disabled:opacity-50"
          >
            {busy ? "…" : fr ? "Confirmer" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
          >
            ✕
          </button>
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 px-3 py-1 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30"
      >
        {fr ? "Désactiver" : "Deactivate"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(true)}
      disabled={busy}
      className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs disabled:opacity-50"
    >
      {busy ? "…" : fr ? "Réactiver" : "Reactivate"}
    </button>
  );
}
