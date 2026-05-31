"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeSwitcher from "./ThemeSwitcher";

export default function AdminSidebar({ user, labels, locale, unreadCount = 0, canSupport = false, supportOpen = 0 }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NAV = [
    { href: "/admin",              label: labels.workflow,     icon: "🧭", exact: true },
    { href: "/admin/inbox",        label: labels.inbox,        icon: "📨" },
    { href: "/admin/cases",        label: labels.cases,        icon: "📁" },
    { href: "/admin/reports",      label: labels.reports,      icon: "📈" },
    { href: "/admin/users",        label: labels.users,        icon: "👥" },
    { href: "/admin/presentation", label: labels.presentation, icon: "🎬" },
    ...(canSupport
      ? [{
          href: "/admin/support",
          label: labels.support || "Support",
          icon: "🛟",
          badge: supportOpen > 0 ? (supportOpen > 99 ? "99+" : supportOpen) : null,
        }]
      : []),
    {
      href: "/notifications",
      label: labels.notifications || "Notifications",
      icon: "🔔",
      badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : null,
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
        className="md:hidden fixed left-3 z-30 rounded-full btn-brand w-10 h-10 text-lg shadow-brand"
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
        <div className="px-5 pt-5 pb-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-white font-semibold text-sm shadow-brand"
              style={{ background: "var(--brand-gradient)" }}
            >
              S
            </span>
            <span className="font-semibold tracking-tight">SamTaxco</span>
          </Link>
          <div className="text-xs text-[var(--fg-muted)] mt-1">{labels.backOffice}</div>
        </div>

        <nav className="px-3 py-2 space-y-1 flex-1 overflow-y-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`
                flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition
                ${active(item.href, item.exact)
                  ? "btn-brand"
                  : "text-[var(--fg)] hover:bg-[var(--surface-2)]"}
              `}
            >
              <span className="w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge != null && (
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-semibold ${
                    active(item.href, item.exact)
                      ? "bg-white/25 text-white"
                      : "bg-rose-500 text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-[var(--border)] text-sm">
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
