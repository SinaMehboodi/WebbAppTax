// Server-only dictionary loader. Pick FR or EN based on the `locale` cookie.
import "server-only";
import { cookies } from "next/headers";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import { makeT } from "@/lib/i18n-core";

const DICTS = { fr, en };
export const SUPPORTED_LOCALES = ["fr", "en"];
export const DEFAULT_LOCALE = "fr";

// Raw message bundle for a locale — used to hydrate the client i18n provider.
export function getMessages(locale) {
  return DICTS[locale] || DICTS[DEFAULT_LOCALE];
}

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

export { makeT };
