import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { getDictionary, getMessages } from "@/lib/dictionary";
import I18nProvider from "@/components/I18nProvider";
import Header from "@/components/Header";
import HideOnAdmin from "@/components/HideOnAdmin";
import BottomNav from "@/components/BottomNav";
import SwRegister from "@/components/SwRegister";
import { getCurrentUser } from "@/lib/session";

// Resolve the user's theme pref (cookie) into the actual data-theme value to
// SSR onto <html>. "auto" / missing leaves the attribute off — a tiny inline
// script then sets it based on prefers-color-scheme before paint.
async function getThemeAttrs() {
  const jar = await cookies();
  const pref = jar.get("theme")?.value;
  if (pref === "light" || pref === "dark") {
    return { dataTheme: pref, pref };
  }
  return { dataTheme: undefined, pref: "auto" };
}

// Resolves the active theme onto <html> before first paint so there is no
// flash of the wrong theme. Inlined (not an external file) on purpose: it runs
// with zero network latency on the very first paint — exactly when a no-cookie
// "auto" visitor would otherwise flash light->dark.
//
// Heads-up for future me: Next 16 / React 19 logs a DEV-ONLY console.error
// ("Encountered a script tag while rendering React component") for ANY
// executable <script> in the component tree — inline OR external `src` alike
// (React keys the check on the script's `type` and never runs
// component-rendered scripts during the client pass). It is harmless here: this
// tag lives in the SSR HTML, so the browser executes it before paint on the
// initial load; the message is stripped from production builds and does not
// affect the theme. Moving it to an external file does NOT remove the warning.
const THEME_BOOT = `
(function () {
  try {
    var html = document.documentElement;
    if (!html.getAttribute('data-theme')) {
      html.setAttribute(
        'data-theme',
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      );
    }
  } catch (e) {}
})();
`;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "SamTaxco — Gestion des impôts directs locaux",
  description:
    "Analyse, contestation et optimisation de la Taxe Foncière et de la CFE.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SamTaxco",
  },
};

// Next.js 16 — themeColor moved out of metadata into the viewport export.
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)",  color: "#0b0d0c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  const { locale, t } = await getDictionary();
  const messages = getMessages(locale);
  const user = await getCurrentUser();
  const showBottomNav = user && user.role === "USER";
  const { dataTheme, pref } = await getThemeAttrs();
  return (
    <html
      lang={locale}
      data-theme={dataTheme}
      data-theme-pref={pref}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs before first paint (it ships in the SSR HTML) so the resolved
            theme is on <html> before anything renders — no flash. See
            THEME_BOOT above for why the dev-only React "script tag" console
            message it triggers is harmless. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} messages={messages}>
          <Header user={user} t={t} locale={locale} />
          <main className={`flex-1 flex flex-col ${showBottomNav ? "pb-nav" : ""}`}>
            {children}
          </main>
          <HideOnAdmin>
            <footer className="text-xs text-[var(--fg-muted)] px-4 py-6 text-center safe-bottom">
              © {new Date().getFullYear()} SamTaxco · {t("app.tagline")}
            </footer>
          </HideOnAdmin>
          <SwRegister />
          {showBottomNav && (
            <BottomNav
              labels={{
                dashboard:     t("nav.dashboard"),
                cases:         t("nav.cases"),
                newCase:       t("dashboard.newCase"),
                notifications: t("nav.notifications"),
                referral:      t("nav.referral"),
              }}
            />
          )}
        </I18nProvider>
      </body>
    </html>
  );
}
