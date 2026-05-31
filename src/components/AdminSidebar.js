"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import BrandLogo from "./BrandLogo";

export default function AdminSidebar({ user, labels, locale, unreadCount = 0, canSupport = false, supportOpen = 0 }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Grouped nav with a coloured icon tile per item (Set3 palette) — distinct,
  // OpenML-style left menu. `c` = Set3 colour index (see globals.css).
  const GROUPS = [
    {
      title: null,
      items: [
        { href: "/admin",         label: labels.workflow, icon: "🧭", c: 1, exact: true },
        { href: "/admin/inbox",   label: labels.inbox,    icon: "📨", c: 5 },
        { href: "/admin/cases",   label: labels.cases,    icon: "📁", c: 6 },
        { href: "/admin/reports", label: labels.reports,  icon: "📈", c: 7 },
        { href: "/admin/reviews", label: labels.reviews,  icon: "⭐", c: 2 },
      ],
    },
    {
      title: locale === "fr" ? "Gestion" : "Manage",
      items: [
        { href: "/admin/users",        label: labels.users,        icon: "👥", c: 3 },
        { href: "/admin/presentation", label: labels.presentation, icon: "🎬", c: 8 },
        ...(canSupport
          ? [{
              href: "/admin/support",
              label: labels.support || "Support",
              icon: "🛟",
              c: 4,
              badge: supportOpen > 0 ? (supportOpen > 99 ? "99+" : supportOpen) : null,
            }]
          : []),
      ],
    },
    {
      title: null,
      items: [
        {
          href: "/admin/notifications",
          label: labels.notifications || "Notifications",
          icon: "🔔",
          c: 2,
          badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : null,
        },
      ],
    },
  ];

  function active(href, exact) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`fixed left-3 z-30 rounded-full btn-brand w-10 h-10 text-lg shadow-brand ${open ? "hidden" : "md:hidden"}`}
        style={{ top: "calc(var(--safe-top) + 0.5rem)" }}
        aria-label="Menu"
      >
        ☰
      </button>

      <aside
        className={`
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          fixed md:sticky top-0 left-0 z-20
          h-screen w-64 shrink-0
          surface-glass border-r flex flex-col transition-transform safe-top
        `}
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-2">
          <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 min-w-0">
            <BrandLogo className="h-9 w-9 shrink-0" />
            <span className="min-w-0">
              <span className="block font-semibold tracking-tight truncate">SamTaxco</span>
              <span className="block text-xs text-[var(--fg-muted)] truncate">{labels.backOffice}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden -mr-1 rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <nav className="px-3 py-2 space-y-3 flex-1 overflow-y-auto">
          {GROUPS.map((group, gi) => (
            <div key={gi} className="space-y-1">
              {group.title && (
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--fg-muted)]">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const on = active(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition ${
                      on ? "btn-brand" : "text-[var(--fg)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[15px] ${
                        on ? "bg-white/20" : `set3-soft-${item.c}`
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge != null && (
                      <span
                        className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-semibold ${
                          on ? "bg-white/25 text-white" : "bg-rose-500 text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-5 pt-4 border-t border-[var(--border)] text-sm" style={{ paddingBottom: "calc(var(--safe-bottom) + 0.6rem)" }}>
          <div className="font-medium truncate">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-[var(--fg-muted)] truncate">{user.email}</div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Link
              href="/account"
              className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] hover:underline"
            >
              {labels.account || "Mon compte"}
            </Link>
            <span className="text-[var(--fg-muted)]">·</span>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/";
              }}
              className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] hover:underline"
            >
              {labels.logout}
            </button>
            <span className="text-[var(--fg-muted)]">·</span>
            <LocaleButtons locale={locale} />
          </div>
          <div className="mt-3">
            <ThemeSwitcher compact />
          </div>
          {labels.version && (
            <div className="mt-3 text-[10px] text-[var(--fg-muted)] tabular-nums">
              SamTaxco {labels.version}
            </div>
          )}
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-10 md:hidden"
        />
      )}
    </>
  );
}

function LocaleButtons({ locale }) {
  async function set(next) {
    if (next === locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    window.location.reload();
  }
  const cls = (active) =>
    `px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      active ? "btn-brand" : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
    }`;
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] p-0.5">
      <button type="button" onClick={() => set("fr")} className={cls(locale === "fr")}>FR</button>
      <button type="button" onClick={() => set("en")} className={cls(locale === "en")}>EN</button>
    </div>
  );
}
