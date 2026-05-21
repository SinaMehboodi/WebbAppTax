// Capacitor configuration for SamTaxco.
//
// Strategy: SamTaxco is a server-rendered Next.js app (server actions, API
// routes, Prisma, auth, file uploads). It is NOT a static site, so we DON'T
// bundle the web assets into the .apk — instead the native shell loads the
// live URL over HTTPS via `server.url`. This lets us push web updates
// instantly without re-submitting the APK.
//
// For local development on an Android emulator, override server.url with
// "http://10.0.2.2:3000" (the emulator's loopback to the host machine) and
// enable cleartext temporarily. For production, set SAMTAXCO_PROD_URL.
import type { CapacitorConfig } from "@capacitor/cli";

const PROD_URL = process.env.SAMTAXCO_PROD_URL || "https://samtaxco.app";
const isDev = process.env.SAMTAXCO_USE_DEV === "1";

const config: CapacitorConfig = {
  appId: "app.samtaxco",
  appName: "SamTaxco",
  // webDir is required by Capacitor even when server.url is set — point it at
  // /public so it ships the app icon, manifest and offline fallback page.
  webDir: "public",
  server: {
    // Where the WebView loads its content. Change SAMTAXCO_PROD_URL or
    // SAMTAXCO_USE_DEV at build time to point at staging/dev.
    url: isDev ? "http://10.0.2.2:3000" : PROD_URL,
    // Required for HTTP (dev) URLs. Always false in production.
    cleartext: isDev,
    // Make the WebView treat the URL as same-origin so cookies, push,
    // and biometric (WebAuthn) all behave like the regular web site.
    androidScheme: "https",
  },
  android: {
    // Allow WebAuthn / passkey requests inside the WebView.
    allowMixedContent: false,
    // Show a brief splash while the WebView loads the URL.
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
