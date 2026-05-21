"use client";

// Mobile-first bottom tab bar for the USER role.
// Hidden on /admin/* (HideOnAdmin) and on screens >= md (so desktop keeps the
// top header nav). Sits above the iOS home indicator (safe-area).
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" />
    </svg>
  ),
  cases: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M3 7h18v13H3z" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
};

function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav({ labels }) {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/admin")) return null;
  // Hide on full-bleed onboarding flows where bottom nav would be confusing.
  const HIDE_ON = ["/login", "/signup", "/verify", "/forgot-password", "/reset-password", "/present", "/tutorial"];
  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  const items = [
    { href: "/dashboard",     icon: ICONS.home,  label: labels.dashboard },
    { href: "/cases",         icon: ICONS.cases, label: labels.cases },
    { href: "/cases/new",     icon: ICONS.add,   label: labels.newCase, highlight: true },
    { href: "/notifications", icon: ICONS.bell,  label: labels.notifications },
    { href: "/referral",      icon: ICONS.user,  label: labels.referral },
  ];

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 surface-glass border-t bottom-nav-pad"
    >
      <ul className="max-w-md mx-auto grid grid-cols-5 px-2 pt-2">
        {items.map((it) => {
          const active = isActive(pathname, it.href);
          if (it.highlight) {
            return (
              <li key={it.href} className="flex justify-center">
                <Link
                  href={it.href}
                  className="-mt-6 inline-flex items-center justify-center h-14 w-14 rounded-full btn-brand shadow-brand"
                  aria-label={it.label}
                >
                  {it.icon}
                </Link>
              </li>
            );
          }
          return (
            <li key={it.href} className="flex">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl text-[11px] font-medium ${
                  active
                    ? "text-[var(--brand-600)]"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                <span className={active ? "scale-110 transition-transform" : ""}>{it.icon}</span>
                <span className="truncate max-w-[64px]">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
