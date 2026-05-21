"use client";

// Cross-platform "Install the app" affordance:
//   - On Android/desktop Chrome, listens for `beforeinstallprompt` and shows
//     a one-tap install button.
//   - On iOS Safari (no install API), shows a short guide once a day.
// Auto-hides when running in standalone mode (already installed).
import { useEffect, useState } from "react";

const DISMISS_KEY = "mindset.installHint.dismissedAt";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari historical flag
  if (window.navigator?.standalone === true) return true;
  return false;
}

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  // iPadOS 13+ reports as Mac; sniff for touch points to disambiguate.
  const iOS = /iPhone|iPad|iPod/.test(ua);
  const macTouch = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  return iOS || macTouch;
}

export default function InstallPwaPrompt() {
  const [installEvt, setInstallEvt] = useState(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissed < DISMISS_TTL_MS) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Defer initial visibility flip past the current render to avoid the
    // cascading-render lint warning.
    Promise.resolve().then(() => {
      setIos(isIos());
      setHidden(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (_) {}
    setHidden(true);
  }

  async function install() {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice.catch(() => {});
    setInstallEvt(null);
    dismiss();
  }

  if (hidden) return null;
  if (!installEvt && !ios) return null;

  return (
    <div className="card p-4 space-y-2 border-emerald-200 dark:border-emerald-900/40">
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-2xl text-white flex items-center justify-center text-lg shadow-brand"
          style={{ background: "var(--brand-gradient)" }}
          aria-hidden
        >
          ↓
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Installer SamTaxco sur votre téléphone</div>
          <div className="text-xs text-[var(--fg-muted)] mt-0.5">
            {ios
              ? "Sur iPhone : appuyez sur le bouton de partage puis « Sur l'écran d'accueil ». Les notifications push deviennent alors disponibles."
              : "Un raccourci s'ajoute à votre écran d'accueil et vous recevez les alertes même hors de l'application."}
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-[var(--fg-muted)] hover:text-[var(--fg)] text-lg leading-none px-1"
          aria-label="Masquer"
        >
          ×
        </button>
      </div>
      <div className="flex justify-end gap-2">
        {installEvt && (
          <button
            type="button"
            onClick={install}
            className="btn-brand rounded-full px-4 py-2 text-xs font-medium"
          >
            Installer maintenant
          </button>
        )}
        {ios && !installEvt && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--fg-muted)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M5 20h14" /></svg>
            puis « Sur l&apos;écran d&apos;accueil »
          </span>
        )}
      </div>
    </div>
  );
}
