import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { getDictionary } from "@/lib/dictionary";
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

// Inline script — runs synchronously before paint. Resolves "auto" using
// matchMedia and slaps data-theme on <html> so no flash.
const THEME_BOOT = `
(function() {
  try {
    var html = document.documentElement;
    var pref = html.getAttribute('data-theme-pref') || 'auto';
    var resolved = html.getAttribute('data-theme');
    if (!resolved) {
      resolved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
      html.setAttribute('data-theme', resolved);
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
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-full flex flex-col">
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
      </body>
    </html>
  );
}
