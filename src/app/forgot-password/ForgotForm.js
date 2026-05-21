"use client";

import { useState } from "react";

export default function ForgotForm({ labels }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  }

  if (sent) return <p className="text-sm text-emerald-700 dark:text-emerald-400">{labels.success}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email"
        required
        placeholder={labels.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 p-3 rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
