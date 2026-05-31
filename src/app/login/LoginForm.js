"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";

export default function LoginForm({ labels }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  function handleAuthResult(data) {
    if (data.role === "ADMIN" || data.role === "EMPLOYEE" || data.role === "SUPER_ADMIN") {
      router.replace("/admin");
    } else if (!data.firstLoginTutorialSeen) {
      router.replace("/tutorial");
    } else {
      router.replace("/dashboard");
    }
    router.refresh();
  }

  function mapError(code) {
    if (code === "login.notVerified") return labels.notVerified;
    if (code === "login.deactivated") return labels.deactivated || labels.invalid;
    if (code === "rate.tooManyAttempts") return labels.tooManyAttempts || labels.invalid;
    return labels.invalid;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(mapError(data.error));
        setLoading(false);
        return;
      }
      handleAuthResult(data);
    } catch {
      setError(labels.invalid);
      setLoading(false);
    }
  }

  async function onBiometric() {
    setError("");
    if (!form.email) {
      setError(labels.emailNeededForBiometric || labels.invalid);
      return;
    }
    setBiometricBusy(true);
    try {
      // 1. Ask the server for a challenge + allowCredentials
      const beginRes = await fetch("/api/auth/passkey/login/begin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const begin = await beginRes.json();
      if (!beginRes.ok || !begin.hasPasskey) {
        setError(labels.biometricNotEnrolled || labels.invalid);
        setBiometricBusy(false);
        return;
      }
      // 2. Hand off to the platform's authenticator
      const assertion = await startAuthentication({ optionsJSON: begin.options });
      // 3. Send the signed assertion back
      const finishRes = await fetch("/api/auth/passkey/login/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: begin.handle, response: assertion, rememberMe }),
      });
      const data = await finishRes.json();
      if (!finishRes.ok) {
        setError(mapError(data.error));
        setBiometricBusy(false);
        return;
      }
      handleAuthResult(data);
    } catch (err) {
      // User cancelled the biometric prompt → just clear the spinner
      if (err?.name !== "NotAllowedError") {
        setError(labels.biometricFailed || labels.invalid);
      }
      setBiometricBusy(false);
    }
  }

  // Whether the browser supports WebAuthn/passkeys. This MUST start as `false`
  // on both the server and the client's first render: reading `window` during
  // render makes the server (no `window`) and client disagree, which triggers a
  // hydration mismatch that regenerates the whole form — breaking the password
  // eye toggle and the submit button until React finishes re-rendering. We flip
  // it on after mount, where `window` is always available.
  const [biometricSupported, setBiometricSupported] = useState(false);
  useEffect(() => {
    setBiometricSupported(typeof window.PublicKeyCredential !== "undefined");
  }, []);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="sr-only">{labels.email}</span>
        <input
          type="email"
          required
          autoComplete="email username webauthn"
          inputMode="email"
          placeholder={labels.email}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full p-3.5 rounded-xl text-base"
        />
      </label>

      <label className="block relative">
        <span className="sr-only">{labels.password}</span>
        <input
          type={showPw ? "text" : "password"}
          required
          autoComplete="current-password webauthn"
          placeholder={labels.password}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full p-3.5 rounded-xl text-base pr-12"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          {showPw ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m3 3 18 18" /><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c7 0 10 7 10 7a17.6 17.6 0 0 1-3.4 4.4M6.7 6.7C3.7 8.7 2 12 2 12s3 7 10 7a10.7 10.7 0 0 0 4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </label>

      <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 accent-[color:var(--brand-500)]"
        />
        <span className="text-[var(--fg-muted)]">{labels.rememberMe}</span>
      </label>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || biometricBusy}
        className="btn-brand w-full p-3.5 rounded-xl font-medium text-base disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? labels.submitting : labels.submit}
      </button>

      {biometricSupported && (
        <>
          <div className="relative my-2 flex items-center text-xs text-[var(--fg-muted)]">
            <div className="flex-1 border-t border-[var(--border)]" />
            <span className="px-2">{labels.or || "or"}</span>
            <div className="flex-1 border-t border-[var(--border)]" />
          </div>
          <button
            type="button"
            onClick={onBiometric}
            disabled={loading || biometricBusy}
            className="btn-soft w-full p-3 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M6 11a6 6 0 0 1 12 0v3" /><path d="M9 13v2a3 3 0 0 0 6 0v-3" /><path d="M12 11v6" /><path d="M4 19c1-1.5 2.5-3 5-3" /><path d="M20 19c-1-1.5-2.5-3-5-3" /></svg>
            {biometricBusy ? "…" : (labels.biometric || "Use Face ID / Touch ID / fingerprint")}
          </button>
        </>
      )}

      <div className="text-right">
        <Link href="/forgot-password" className="text-sm underline text-[var(--fg-muted)] hover:text-[var(--fg)]">
          {labels.forgot}
        </Link>
      </div>
    </form>
  );
}
