"use client";

// Shared back-office banner shown at the top of EVERY /admin page (not just the
// workflow board). Role-tinted gradient + greeting + current page name + date.
// Full-bleed so it sits cleanly behind the phone status bar; a top spacer keeps
// the floating ☰ menu button from overlapping the text on mobile.
import { usePathname } from "next/navigation";

const ROLE_BANNER = {
  SUPER_ADMIN: "linear-gradient(135deg,#fb7185 0%,#f43f5e 50%,#e11d48 100%)", // coral
  ADMIN:       "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 50%,#6d28d9 100%)", // violet
  EMPLOYEE:    "linear-gradient(135deg,#2dd4bf 0%,#14b8a6 50%,#0d9488 100%)", // teal
  USER:        "linear-gradient(135deg,#38bdf8 0%,#0ea5e9 50%,#0284c7 100%)", // blue
};

// Longest-prefix match → the human label for the current admin route.
function currentTitle(pathname, labels) {
  const map = [
    ["/admin/inbox",        labels.inbox],
    ["/admin/cases",        labels.cases],
    ["/admin/reports",      labels.reports],
    ["/admin/users",        labels.users],
    ["/admin/presentation", labels.presentation],
    ["/admin/support",      labels.support],
    ["/admin",              labels.workflow],
  ];
  for (const [href, label] of map) {
    if (pathname === href || pathname.startsWith(href + "/")) return label || labels.backOffice;
  }
  return labels.backOffice;
}

export default function AdminBanner({ role, firstName, locale, labels }) {
  const pathname = usePathname();
  const fr = locale === "fr";
  const title = currentTitle(pathname, labels);
  const dateStr = new Date().toLocaleDateString(fr ? "fr-FR" : "en-US", {
    weekday: "long", day: "numeric", month: "long",
  });
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
        {/* Reserve room for the floating ☰ button so it never covers the title. */}
        <div className="h-14 md:hidden" />
        <p className="text-xs uppercase tracking-widest text-white/80">{title}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-0.5">
          {fr ? "Bonjour" : "Hello"} {firstName || ""}
        </h1>
        <p className="text-white/90 text-sm mt-1">{dateStr}</p>
      </div>
    </header>
  );
}
