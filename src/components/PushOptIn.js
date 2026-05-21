"use client";

// Pill-button users can tap to enable push notifications on their device.
// Registers the service worker, asks for permission, posts the subscription
// to /api/push/subscribe. Shows current state.
import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushOptIn({ labels }) {
  // state: loading | denied | granted | default | unsupported
  // We deliberately start with "loading" on BOTH server and client so the
  // initial HTML matches — then resolve to the real value after mount.
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [hasSub, setHasSub] = useState(false);
  const supported = state !== "loading" && state !== "unsupported";

  useEffect(() => {
    let cancelled = false;
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!VAPID_PUBLIC;
    // Defer state writes to a microtask so React doesn't see synchronous
    // setState inside the effect body (avoids react-hooks/set-state-in-effect
    // while still letting us read window APIs only after hydration).
    Promise.resolve().then(() => {
      if (cancelled) return;
      if (!ok) {
        setState("unsupported");
        return;
      }
      setState(typeof Notification !== "undefined" ? Notification.permission : "default");
      navigator.serviceWorker.register("/sw.js").then((reg) =>
        reg.pushManager.getSubscription().then((s) => {
          if (!cancelled) setHasSub(!!s);
        })
      );
    });
    return () => { cancelled = true; };
  }, []);

  async function enable() {
    if (!supported) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setState(perm);
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setHasSub(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setHasSub(false);
    } finally {
      setBusy(false);
    }
  }

  // While loading, render a stable placeholder so SSR HTML matches the first
  // client render (avoids hydration warnings).
  if (state === "loading") {
    return <span className="inline-block h-7 w-32 rounded-full bg-[var(--surface-2)] animate-pulse" aria-hidden />;
  }

  if (state === "unsupported") {
    return (
      <p className="text-xs text-[var(--fg-muted)]">
        {labels?.unsupported || "Les notifications push ne sont pas disponibles sur ce navigateur."}
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-xs text-[var(--fg-muted)]">
        {labels?.denied || "Notifications bloquées dans les paramètres du navigateur."}
      </p>
    );
  }

  if (hasSub) {
    return (
      <button
        type="button"
        onClick={disable}
        disabled={busy}
        className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
      >
        {busy ? "…" : labels?.disable || "Désactiver les notifications"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={busy}
      className="btn-brand rounded-full px-4 py-2 text-xs font-medium disabled:opacity-50 inline-flex items-center gap-2"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
      {busy ? "…" : labels?.enable || "Activer les notifications"}
    </button>
  );
}
