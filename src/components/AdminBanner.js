"use client";

// Shared back-office banner shown at the top of EVERY /admin page.
// It is page-agnostic: just a warm greeting for the logged-in user + a live
// date/time + the role context. The page's own NAME is a heading rendered
// BELOW this banner by each page (so it isn't duplicated inside the banner).
import { useEffect, useState } from "react";

const ROLE_BANNER = {
  SUPER_ADMIN: "linear-gradient(135deg,#fb7185 0%,#f43f5e 50%,#e11d48 100%)", // coral
  ADMIN:       "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 50%,#6d28d9 100%)", // violet
  EMPLOYEE:    "linear-gradient(135deg,#2dd4bf 0%,#14b8a6 50%,#0d9488 100%)", // teal
  USER:        "linear-gradient(135deg,#38bdf8 0%,#0ea5e9 50%,#0284c7 100%)", // blue
};

const ROLE_LABEL = {
  fr: { SUPER_ADMIN: "Super-administrateur", ADMIN: "Administrateur", EMPLOYEE: "Collaborateur", USER: "Client" },
  en: { SUPER_ADMIN: "Super admin",          ADMIN: "Admin",          EMPLOYEE: "Employee",      USER: "Client" },
};

export default function AdminBanner({ role, firstName, lastName, locale }) {
  const fr = locale === "fr";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const roleLabel = (ROLE_LABEL[fr ? "fr" : "en"] || ROLE_LABEL.en)[role] || "";

  // Live date + time. Rendered client-side only (starts empty on SSR + first
  // client render → no hydration mismatch) and refreshed every 30s.
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const stamp = now
    ? now.toLocaleString(fr ? "fr-FR" : "en-US", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <header
      className="relative overflow-hidden text-white shadow-lift rounded-b-3xl safe-top"
      style={{ background: ROLE_BANNER[role] || ROLE_BANNER.EMPLOYEE }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(400px circle at 80% 20%, rgba(255,255,255,.25), transparent 50%)," +
            "radial-gradient(500px circle at 10% 90%, rgba(255,255,255,.18), transparent 55%)",
        }}
      />
      <div className="relative px-5 sm:px-7 pb-5 sm:pb-6">
        {/* Reserve room for the floating ☰ button so it never covers the text. */}
        <div className="h-14 md:hidden" />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {fr ? "Bonjour" : "Hello"} {fullName}
        </h1>
        <p className="text-white/90 text-sm mt-1 min-h-[1.25rem] tabular-nums first-letter:uppercase">
          {stamp}
        </p>
        {roleLabel && (
          <p className="text-white/70 text-[11px] mt-1.5 uppercase tracking-widest">
            Back-office · {roleLabel}
          </p>
        )}
      </div>
    </header>
  );
}
