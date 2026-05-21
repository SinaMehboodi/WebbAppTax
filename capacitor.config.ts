// Capacitor configuration for SamTaxco.
//
// Strategy: SamTaxco is a server-rendered Next.js app (server actions, API
// routes, Prisma, auth, file uploads). It is NOT a static site, so we DON'T
// bundle the web assets into the .apk — instead the native shell loads the
// live URL via `server.url`. This lets us push web updates instantly
// without re-submitting the APK.
//
// Where the WebView loads from:
//   1. SAMTAXCO_PROD_URL env var (CI sets this from a GitHub secret)
//   2. Falls back to the LAN dev URL below so a debug APK built without any
//      env override loads your local `npm run dev` server.
//
// Cleartext (http://) is auto-enabled when the resolved URL is http://.
// HTTPS URLs (production) keep cleartext off.
import type { CapacitorConfig } from "@capacitor/cli";

// Default for "I just want to test the APK on my phone over Wi-Fi" — the dev
// server running on the PC. Change to your production URL via the
// SAMTAXCO_PROD_URL secret in GitHub when you deploy.
const DEFAULT_URL = "http://192.168.178.22:3000";

const URL = process.env.SAMTAXCO_PROD_URL || DEFAULT_URL;
const isCleartext = URL.startsWith("http://");

const config: CapacitorConfig = {
  appId: "app.samtaxco",
  appName: "SamTaxco",
  // webDir is required by Capacitor even when server.url is set — point it at
  // /public so it ships the app icon and manifest.
  webDir: "public",
  server: {
    url: URL,
    cleartext: isCleartext,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#10b981",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#10b981",
      androidScaleType: "CENTER_CROP",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#10b981",
    },
  },
};

export default config;
