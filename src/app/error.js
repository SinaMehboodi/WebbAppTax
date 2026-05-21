"use client";

// Root-level error boundary. Catches uncaught render/data errors and renders
// a brand-aware page with a Retry button.
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[error boundary]", error);
    }
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-hero">
      <div className="max-w-md w-full card p-8 text-center space-y-4 animate-rise">
        <div
          className="mx-auto h-14 w-14 rounded-2xl text-white text-2xl flex items-center justify-center shadow-brand"
          style={{ background: "linear-gradient(135deg,#f59e0b 0%,#ea580c 100%)" }}
          aria-hidden
        >
          !
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Une erreur est survenue
        </h1>
        <p className="text-[var(--fg-muted)] text-sm">
          Nos équipes ont été notifiées. Vous pouvez réessayer immédiatement —
          si le problème persiste, contactez votre interlocuteur SamTaxco.
        </p>
        {error?.digest && (
          <p className="text-[10px] font-mono text-[var(--fg-muted)]">ref · {error.digest}</p>
        )}
        <div className="pt-2 flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={reset}
            className="btn-brand rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Réessayer
          </button>
          <Link href="/" className="btn-soft rounded-full px-5 py-2.5 text-sm font-medium">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
