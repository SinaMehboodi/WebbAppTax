"use client";

// Registers /sw.js once per app load so the service worker is ready to receive
// push events even before the user visits the notifications page.
import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Only register over HTTPS or localhost; browsers block SW otherwise.
    const ok = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!ok) return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[sw] register failed:", err.message));
  }, []);
  return null;
}
