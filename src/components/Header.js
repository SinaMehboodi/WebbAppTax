// Top nav for non-admin routes. Admin has its own sidebar layout. On mobile,
// primary navigation lives in BottomNav — the header keeps just brand + locale
// + auth shortcuts so the top bar stays light.
import Link from "next/link";
import LocaleSwitcher from "./LocaleSwitcher";
import LogoutButton from "./LogoutButton";
import HideOnAdmin from "./HideOnAdmin";
import HideOnPath from "./HideOnPath";
import ThemeSwitcher from "./ThemeSwitcher";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <span
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-2xl text-white font-semibold text-sm shadow-brand"
        style={{ background: "var(--brand-gradient)" }}
        aria-hidden
      >
        <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-white/10" />
        S
      </span>
      <span className="font-semibold tracking-tight">SamTaxco</span>
    </Link>
  );
}

export default function Header({ user, t, locale }) {
  return (
    <HideOnAdmin>
      <header className="surface-glass border-b sticky top-0 z-20 safe-top">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <BrandMark />

          <nav className="flex items-center gap-2 sm:gap-3 text-sm">
            {!user && (
              <>
                <Link
                  href="/present"
                  className="hidden sm:inline text-[var(--fg-muted)] hover:text-[var(--fg)]"
                >
                  {t("nav.present")}
                </Link>
                {/* "Log in" is redundant in the header on the landing page —
                    the hero already has an "I already have an account" link
                    right next to its Create-account / Discover CTAs. */}
                <HideOnPath paths={["/"]}>
                  <Link
                    href="/login"
                    className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  >
                    {t("nav.login")}
                  </Link>
                </HideOnPath>
                {/* The landing page already has a big "Create my account" CTA in
                    the hero, and the login page has its own "Create account"
                    button below the form — so the signup pill is duplicate noise
                    on both. Hide it on / and /login; show it everywhere else. */}
                <HideOnPath paths={["/", "/login"]}>
                  <Link
                    href="/signup"
                    className="btn-brand rounded-full px-3.5 py-1.5 text-sm font-medium"
                  >
                    {t("nav.signup")}
                  </Link>
                </HideOnPath>
              </>
            )}

            {/* Desktop links for clients — duplicated by BottomNav on mobile */}
            {user && user.role === "USER" && (
              <>
                <Link href="/dashboard" className="hidden md:inline text-[var(--fg-muted)] hover:text-[var(--fg)]">{t("nav.dashboard")}</Link>
                <Link href="/cases"     className="hidden md:inline text-[var(--fg-muted)] hover:text-[var(--fg)]">{t("nav.cases")}</Link>
                <Link href="/invoices"  className="hidden md:inline text-[var(--fg-muted)] hover:text-[var(--fg)]">{t("nav.invoices")}</Link>
                <Link href="/referral"  className="hidden md:inline text-[var(--fg-muted)] hover:text-[var(--fg)]">{t("nav.referral")}</Link>
              </>
            )}

            {user && ["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role) && (
              <Link
                href="/admin"
                className="rounded-full px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--brand-500)]"
              >
                {t("nav.admin")}
              </Link>
            )}

            {user && (
              <Link
                href="/account"
                className="hidden sm:inline-flex items-center gap-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                title={t("nav.account")}
                aria-label={t("nav.account")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              </Link>
            )}

            {user && <LogoutButton label={t("nav.logout")} />}
            <ThemeSwitcher compact />
            <LocaleSwitcher locale={locale} />
          </nav>
        </div>
      </header>
    </HideOnAdmin>
  );
}
