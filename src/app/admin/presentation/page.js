// Phase 1 §3 — presentation content is locked, editable only from admin.
// Admins can add, edit, reorder and delete slides. The list orders by `order`
// asc; the "Add slide" button is always visible at the top.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/dictionary";
import NewSlideButton from "./NewSlideButton";

export default async function PresentationManagerPage() {
  const sections = await prisma.presentationSection.findMany({ orderBy: { order: "asc" } });
  const { t } = await getDictionary();
  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("admin.presentation")}</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">{t("admin.presentationSubtitle")}</p>
        </div>
        <NewSlideButton />
      </header>

      {sections.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xl">📚</div>
          <p className="text-[var(--fg-muted)] text-sm">{t("admin.noSlides")}</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-[var(--border)]">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/admin/presentation/${s.id}`}
              className="block p-4 hover:bg-[var(--surface-2)] transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-mono text-[var(--fg-muted)] shrink-0">
                    {String(s.order).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.titleFr}</div>
                    <div className="text-xs text-[var(--fg-muted)] truncate">{s.slug} · {s.titleEn}</div>
                  </div>
                </div>
                {!s.isActive && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700 shrink-0">
                    {t("admin.slideInactive")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
