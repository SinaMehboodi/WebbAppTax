// Locale-agnostic translation lookup, safe to import on the server OR client.
// (dictionary.js is server-only because it reads cookies; this file isn't.)
//
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
