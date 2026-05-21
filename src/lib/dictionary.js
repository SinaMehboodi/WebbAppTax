// Server-only dictionary loader. Pick FR or EN based on the `locale` cookie.
import "server-only";
import { cookies } from "next/headers";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";

const DICTS = { fr, en };
export const SUPPORTED_LOCALES = ["fr", "en"];
export const DEFAULT_LOCALE = "fr";

export async function getLocale() {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale;
  return DEFAULT_LOCALE;
}

export async function getDictionary(localeOverride) {
  const locale = localeOverride || (await getLocale());
  return { locale, t: makeT(DICTS[locale] || DICTS[DEFAULT_LOCALE]) };
}

// t("a.b.c") looks up dict.a.b.c. If missing, returns the key (handy in dev).
// t("a.b.c", { name: "Sina" }) interpolates {name}.
export function makeT(dict) {
  return function t(key, params) {
    const parts = key.split(".");
    let cur = dict;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in cur) cur = cur[p];
      else return key;
    }
    if (typeof cur !== "string") return key;
    if (!params) return cur;
    return cur.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
  };
}
