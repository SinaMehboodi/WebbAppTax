"use client";

import { useState } from "react";

const ERR_FR = {
  "password.currentWrong": "Mot de passe actuel incorrect.",
  "password.mismatch":     "Les deux nouveaux mots de passe ne correspondent pas.",
  "password.tooShort":     "Le nouveau mot de passe doit faire au moins 8 caractères.",
  "password.sameAsOld":    "Le nouveau mot de passe doit être différent de l'ancien.",
  "password.invalid":      "Champs invalides.",
  "rate.tooManyAttempts":  "Trop de tentatives. Réessayez dans quelques minutes.",
};
const ERR_EN = {
  "password.currentWrong": "Current password is incorrect.",
  "password.mismatch":     "The two new passwords don't match.",
  "password.tooShort":     "New password must be at least 8 characters.",
  "password.sameAsOld":    "The new password must be different from the old one.",
  "password.invalid":      "Invalid fields.",
  "rate.tooManyAttempts":  "Too many attempts. Try again in a few minutes.",
};

export default function ChangePasswordForm({ fr }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function err(code) {
    return (fr ? ERR_FR[code] : ERR_EN[code]) || code;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setDone(false);
    if (next.length < 8) return setError(err("password.tooShort"));
    if (next !== confirm) return setError(err("password.mismatch"));
    setBusy(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(err(d.error || "password.invalid"));
      return;
    }
    setDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">
        <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">
          {fr ? "Mot de passe actuel" : "Current password"}
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full mt-1 p-3 rounded-xl text-base"
        />
      </label>

      <label className="block text-sm relative">
        <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">
          {fr ? "Nouveau mot de passe" : "New password"}
        </span>
        <input
          type={showNext ? "text" : "password"}
          required
          autoComplete="new-password"
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full mt-1 p-3 rounded-xl text-base pr-12"
        />
        <button
          type="button"
          onClick={() => setShowNext((v) => !v)}
          className="absolute right-2 top-[1.85rem] p-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
          aria-label={showNext ? (fr ? "Masquer" : "Hide") : (fr ? "Afficher" : "Show")}
        >
          {showNext ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m3 3 18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c7 0 10 7 10 7a17.6 17.6 0 0 1-3.4 4.4M6.7 6.7C3.7 8.7 2 12 2 12s3 7 10 7a10.7 10.7 0 0 0 4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </label>

      <label className="block text-sm">
        <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">
          {fr ? "Confirmer le nouveau mot de passe" : "Confirm new password"}
        </span>
        <input
          type={showNext ? "text" : "password"}
          required
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full mt-1 p-3 rounded-xl text-base"
        />
      </label>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
          {error}
        </p>
      )}
      {done && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40 p-3 rounded-xl">
          ✓ {fr ? "Mot de passe modifié avec succès." : "Password changed successfully."}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-brand w-full p-3 rounded-xl font-medium text-base disabled:opacity-50 disabled:shadow-none"
      >
        {busy ? "…" : (fr ? "Enregistrer" : "Save new password")}
      </button>
    </form>
  );
}
