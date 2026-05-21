"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LocaleSwitcher({ locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next) {
    if (next === locale) return;
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  }

  const cls = (active) =>
    `px-2 py-1 rounded-full text-[11px] font-semibold transition ${
      active
        ? "btn-brand"
        : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
    }`;

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] p-0.5">
      <button type="button" onClick={() => setLocale("fr")} disabled={pending} className={cls(locale === "fr")}>FR</button>
      <button type="button" onClick={() => setLocale("en")} disabled={pending} className={cls(locale === "en")}>EN</button>
    </div>
  );
}
