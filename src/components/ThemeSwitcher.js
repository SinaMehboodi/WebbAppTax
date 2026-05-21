"use client";

// Light / Dark / Auto switch. Three pill buttons in a rounded group.
// Writes the choice to the `theme` cookie via /api/theme and immediately
// updates <html data-theme=...> so the page reflects the new theme without
// a reload.
import { useEffect, useState } from "react";

const ICONS = {
  light: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>),
  dark:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>),
  auto:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M12 2a10 10 0 1 0 0 20Z" /></svg>),
};
const ORDER = ["light", "auto", "dark"];

function readCookieTheme() {
  if (typeof document === "undefined") return "auto";
  const m = document.cookie.match(/(?:^|;\s*)theme=(light|dark|auto)/);
  return m ? m[1] : "auto";
}

function resolveAuto() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const resolved = theme === "auto" ? resolveAuto() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-pref", theme);
}

export default function ThemeSwitcher({ compact = false }) {
  const [theme, setTheme] = useState("auto");

  useEffect(() => {
    // Defer initial state read past render to satisfy
    // react-hooks/set-state-in-effect.
    Promise.resolve().then(() => setTheme(readCookieTheme()));
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSys = () => {
      if (readCookieTheme() === "auto") applyTheme("auto");
    };
    mq?.addEventListener?.("change", onSys);
    return () => mq?.removeEventListener?.("change", onSys);
  }, []);

  async function pick(next) {
    setTheme(next);
    applyTheme(next);
    fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  }

  const labels = { light: "Clair", dark: "Sombre", auto: "Auto" };

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] p-0.5`}>
      {ORDER.map((opt) => {
        const active = theme === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => pick(opt)}
            aria-pressed={active}
            title={labels[opt]}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition ${
              active
                ? "btn-brand"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {ICONS[opt]}
            {!compact && <span>{labels[opt]}</span>}
          </button>
        );
      })}
    </div>
  );
}
