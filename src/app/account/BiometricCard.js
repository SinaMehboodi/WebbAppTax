"use client";

// "Biometric login" card on /account.
// - List enrolled devices (with last-used date) and revoke per row.
// - "Enable on this device" button calls /api/auth/passkey/register/begin
//   then hands off to navigator.credentials.create() via @simplewebauthn/browser
//   which triggers the platform's biometric prompt (Touch ID, Face ID,
//   Android fingerprint, Windows Hello).
import { useEffect, useState } from "react";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";

export default function BiometricCard({ fr }) {
  const [supported, setSupported] = useState(false);
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    // Defer the first state write so React doesn't see a synchronous setState
    // inside the effect body (lint rule react-hooks/set-state-in-effect).
    Promise.resolve().then(() => setSupported(browserSupportsWebAuthn()));
    refresh();
  }, []);

  async function refresh() {
    const res = await fetch("/api/auth/passkey/list");
    if (res.ok) {
      const data = await res.json();
      setList(data.passkeys || []);
    }
  }

  async function enroll() {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const beginRes = await fetch("/api/auth/passkey/register/begin", { method: "POST" });
      if (!beginRes.ok) throw new Error("begin failed");
      const begin = await beginRes.json();
      // Triggers Touch ID / Face ID / Windows Hello / Android fingerprint
      const attestation = await startRegistration({ optionsJSON: begin.options });
      const finishRes = await fetch("/api/auth/passkey/register/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: begin.handle, response: attestation }),
      });
      if (!finishRes.ok) {
        const d = await finishRes.json().catch(() => ({}));
        throw new Error(d.error || "verify failed");
      }
      const data = await finishRes.json();
      setDone(fr
        ? `✓ « ${data.deviceName} » enregistré. Vous pouvez maintenant vous connecter sans mot de passe sur cet appareil.`
        : `✓ "${data.deviceName}" enrolled. You can now sign in without a password on this device.`);
      await refresh();
    } catch (err) {
      // User pressed cancel on the OS prompt
      if (err?.name === "NotAllowedError") {
        // silent
      } else {
        setError(fr ? "Impossible d'enregistrer la biométrie sur cet appareil." : "Could not enrol biometric on this device.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/passkey/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) await refresh();
  }

  if (!supported) {
    return (
      <p className="text-xs text-[var(--fg-muted)]">
        {fr
          ? "La biométrie n'est pas disponible sur ce navigateur. Utilisez Chrome ou Safari sur un appareil avec Touch ID / Face ID / empreinte."
          : "Biometric login isn't available in this browser. Use Chrome or Safari on a device with Touch ID / Face ID / fingerprint."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--fg-muted)]">
        {fr
          ? "Activez votre empreinte (Face ID, Touch ID, empreinte Android, Windows Hello). Vous pourrez ensuite vous connecter sans mot de passe sur cet appareil."
          : "Enable your phone's biometric (Face ID, Touch ID, Android fingerprint, Windows Hello). You'll be able to sign in without a password on this device."}
      </p>

      {list.length > 0 && (
        <ul className="space-y-1.5">
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 text-sm card p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.deviceName || "Device"}</div>
                <div className="text-[10px] text-[var(--fg-muted)] tabular-nums">
                  {fr ? "Ajouté le" : "Added"} {new Date(p.createdAt).toLocaleDateString()}
                  {p.lastUsedAt && ` · ${fr ? "utilisé" : "used"} ${new Date(p.lastUsedAt).toLocaleDateString()}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revoke(p.id)}
                disabled={busy}
                className="rounded-full border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 px-3 py-1 text-[11px] hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
              >
                {fr ? "Retirer" : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
          {error}
        </p>
      )}
      {done && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40 p-3 rounded-xl">
          {done}
        </p>
      )}

      <button
        type="button"
        onClick={enroll}
        disabled={busy}
        className="btn-brand rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M6 11a6 6 0 0 1 12 0v3"/><path d="M9 13v2a3 3 0 0 0 6 0v-3"/><path d="M12 11v6"/></svg>
        {busy ? "…" : (fr ? "Activer sur cet appareil" : "Enable on this device")}
      </button>
    </div>
  );
}
