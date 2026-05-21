"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetForm({ token, onboarding, labels }) {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (p1 !== p2) return setError(labels.mismatch);
    if (p1.length < 8) return setError(labels.tooShort);
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: p1 }),
    });
    if (!res.ok) {
      setError(labels.invalidToken);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.replace("/login"), 1800);
  }

  if (success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 p-4 text-sm text-emerald-800 dark:text-emerald-200">
        ✓ {labels.success}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block relative">
        <input
          type={show ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={labels.password}
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          className="w-full p-3.5 rounded-xl text-base pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide" : "Show"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          {show ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m3 3 18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c7 0 10 7 10 7a17.6 17.6 0 0 1-3.4 4.4M6.7 6.7C3.7 8.7 2 12 2 12s3 7 10 7a10.7 10.7 0 0 0 4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </label>

      <input
        type={show ? "text" : "password"}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder={labels.confirm}
        value={p2}
        onChange={(e) => setP2(e.target.value)}
        className="w-full p-3.5 rounded-xl text-base"
      />

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-brand w-full p-3.5 rounded-xl font-medium text-base disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "…" : labels.submit}
      </button>
    </form>
  );
}
