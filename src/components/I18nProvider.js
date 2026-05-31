"use client";

// Client-side i18n. The root layout (a server component) reads the active
// locale's message bundle and hands it to this provider, which exposes a
// `t(key, params)` identical to the server's. Any client component can then
// call useT() and translate without prop-threading every string — this is
// what guarantees ALL client UI text switches when the language changes.
import { createContext, useContext, useMemo } from "react";
import { makeT } from "@/lib/i18n-core";

const I18nContext = createContext({ locale: "fr", t: (k) => k });

export default function I18nProvider({ locale, messages, children }) {
  const value = useMemo(
    () => ({ locale, t: makeT(messages || {}) }),
    [locale, messages]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext).t;
}

export function useLocale() {
  return useContext(I18nContext).locale;
}
