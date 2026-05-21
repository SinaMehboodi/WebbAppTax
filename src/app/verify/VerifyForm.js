"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyForm({ defaultToken, defaultEmail, labels }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState(defaultEmail || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-verify when arriving with ?token=...
  useEffect(() => {
    if (defaultToken) {
      (async () => {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: defaultToken }),
        });
        if (res.ok) setSuccess(true);
        else setError(labels.invalidCode);
      })();
    }
  }, [defaultToken, labels.invalidCode]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email }),
    });
    if (res.ok) setSuccess(true);
    else setError(labels.invalidCode);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl">✓</div>
        <p className="font-medium">{labels.success}</p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 px-5 py-2.5"
        >
          {labels.successCta}
        </Link>
      </div>
    );
  }

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
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        required
        placeholder={labels.code}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 tracking-widest text-center font-mono"
      />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 p-3 rounded-lg font-medium disabled:opacity-50"
      >
        {labels.submit}
      </button>
    </form>
  );
}
