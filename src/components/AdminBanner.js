"use client";

// Greeting banner for back-office pages AND the shared Notifications page.
// Modern, glassy treatment: initials avatar + "Hello <name>", glass chips for a
// live date & time and the role, a mesh-gradient backdrop and a faint brand
// watermark. Page-agnostic — the page's own NAME is a heading BELOW the banner.
import { useEffect, useState } from "react";

const ROLE_BANNER = {
  SUPER_ADMIN: "linear-gradient(135deg,#fb7185 0%,#f43f5e 48%,#be123c 100%)", // coral
  ADMIN:       "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 48%,#5b21b6 100%)", // violet
  EMPLOYEE:    "linear-gradient(135deg,#2dd4bf 0%,#0d9488 48%,#0f766e 100%)", // teal
  USER:        "linear-gradient(135deg,#38bdf8 0%,#0ea5e9 48%,#0369a1 100%)", // blue
};

const ROLE_LABEL = {
  fr: { SUPER_ADMIN: "Super-administrateur", ADMIN: "Administrateur", EMPLOYEE: "Collaborateur", USER: "Client" },
  en: { SUPER_ADMIN: "Super admin",          ADMIN: "Admin",          EMPLOYEE: "Employee",      USER: "Client" },
};

export default function AdminBanner({ role, firstName, lastName, locale, containerClass = "max-w-6xl", topInset = true }) {
  const fr = locale === "fr";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const initials = ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "•";
  const isStaff = role === "ADMIN" || role === "EMPLOYEE" || role === "SUPER_ADMIN";
  const roleLabel = (ROLE_LABEL[fr ? "fr" : "en"] || ROLE_LABEL.en)[role] || "";

  // Live date + time, client-only (empty on SSR + first client render → no
  // hydration mismatch), refreshed every 30s.
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const dateStr = now ? now.toLocaleDateString(fr ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long" }) : "";
  const timeStr = now ? now.toLocaleTimeString(fr ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <header
      className={`relative isolate overflow-hidden text-white rounded-b-[1.75rem] shadow-lift ${topInset ? "safe-top" : ""}`}
      style={{ background: ROLE_BANNER[role] || ROLE_BANNER.EMPLOYEE }}
    >
      {/* mesh highlights */}
      <div
        className="absolute inset-0 -z-10 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(620px circle at 88% 6%, rgba(255,255,255,.30), transparent 46%)," +
            "radial-gradient(520px circle at 4% 104%, rgba(255,255,255,.16), transparent 52%)",
        }}
      />
      <div className={`relative ${containerClass} mx-auto px-4 pb-5 sm:pb-6 ${topInset ? "" : "pt-5"}`}>
        {/* Reserve room for the floating menu button on mobile. */}
        {topInset && <div className="h-14 md:hidden" />}

        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur text-lg font-semibold tracking-tight">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
              {isStaff ? "Back-office" : (fr ? "Espace client" : "Client area")}
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight truncate">
              {fr ? "Bonjour" : "Hello"} {fullName}
            </h1>
          </div>
          {/* Minimal brand mark — mirrors the avatar on the right, glass style. */}
          <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <span className="absolute h-7 w-7 rounded-full ring-1 ring-white/30" />
            <span className="relative text-[12px] font-bold tracking-tight text-white">S.co</span>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-white/90">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 ring-1 ring-white/15 px-2.5 py-1 text-xs backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
              <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
            </svg>
            <span className="capitalize">{dateStr || " "}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 ring-1 ring-white/15 px-2.5 py-1 text-xs tabular-nums backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_2px_rgba(110,231,183,.55)]" />
            {timeStr || " "}
          </span>
          {isStaff && roleLabel && (
            <span className="inline-flex items-center rounded-full bg-white/15 ring-1 ring-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">
              {roleLabel}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
