"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupForm({ reps, prefilledRepId, referredByCode, locale, labels }) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
    confirmPassword: "",
    referenceRepId: prefilledRepId || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devHint, setDevHint] = useState(null);

  function set(name) {
    return (e) => setForm({ ...form, [name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError(labels.passwordMismatch);
      return;
    }
    if (form.password.length < 8) {
      setError(labels.passwordTooShort);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          referenceRepId: form.referenceRepId || null,
          referredByCode,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          {
            "signup.emailTaken": labels.emailTaken,
            "signup.passwordMismatch": labels.passwordMismatch,
            "signup.passwordTooShort": labels.passwordTooShort,
          }[data.error] || labels.genericError
        );
        setLoading(false);
        return;
      }
      // Dev mode: the API returns the verification code/link directly so the
      // user can finish onboarding without a real mail server.
      if (data.verifyHint) {
        setDevHint({
          email: form.email,
          code: data.verifyHint.code,
          link: data.verifyHint.link,
        });
        setLoading(false);
        return;
      }
      router.push(`/signup/success?email=${encodeURIComponent(form.email)}`);
    } catch {
      setError(labels.networkError);
      setLoading(false);
    }
  }

  if (devHint) {
    return (
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-5 space-y-3">
        <div className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-300">
          Dev mode — no email server
        </div>
        <p className="text-sm">
          Your account was created. Use the code below to verify, or click the link.
        </p>
        <div className="font-mono text-2xl tracking-widest text-center bg-white dark:bg-zinc-900 rounded-lg py-3">
          {devHint.code}
        </div>
        <div className="flex gap-2">
          <a
            href={devHint.link}
            className="flex-1 text-center rounded-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 px-4 py-2 text-sm"
          >
            Verify now →
          </a>
          <a
            href={`/verify?email=${encodeURIComponent(devHint.email)}`}
            className="rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm"
          >
            Enter code
          </a>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          In production, this code is sent by email. Configure RESEND_API_KEY or SMTP_URL to send real emails.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          required
          placeholder={labels.firstName}
          value={form.firstName}
          onChange={set("firstName")}
          className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
        />
        <input
          type="text"
          required
          placeholder={labels.lastName}
          value={form.lastName}
          onChange={set("lastName")}
          className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
        />
      </div>
      <input
        type="email"
        required
        placeholder={labels.email}
        value={form.email}
        onChange={set("email")}
        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
      />
      <input
        type="tel"
        placeholder={labels.phone}
        value={form.phone}
        onChange={set("phone")}
        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
      />
      <input
        type="text"
        placeholder={labels.company}
        value={form.companyName}
        onChange={set("companyName")}
        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
      />

      <div>
        <label className="text-xs text-zinc-500 dark:text-zinc-400">{labels.referenceRepHint}</label>
        <select
          value={form.referenceRepId}
          onChange={set("referenceRepId")}
          className="w-full p-3 mt-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
        >
          <option value="">— {labels.referenceRep} —</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.firstName} {r.lastName}
            </option>
          ))}
        </select>
      </div>

      <input
        type="password"
        required
        placeholder={labels.password + " — " + labels.passwordHint}
        value={form.password}
        onChange={set("password")}
        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
      />
      <input
        type="password"
        required
        placeholder={labels.confirmPassword}
        value={form.confirmPassword}
        onChange={set("confirmPassword")}
        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
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
        {loading ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
