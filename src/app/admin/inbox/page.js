// Phase 3 §4 — "Document received — contract must be prepared". Lists cases
// in DRAFT or CONTRACT_PREPARING so staff can pick them up.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/dictionary";
import StatusBadge from "@/components/StatusBadge";

export default async function InboxPage() {
  const cases = await prisma.taxCase.findMany({
    where: { status: { in: ["DRAFT", "CONTRACT_PREPARING"] } },
    orderBy: { createdAt: "desc" },
    include: { owner: true, documents: true },
  });
  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("admin.inbox")}</h1>
        <p className="text-sm text-[var(--fg-muted)]">{t("admin.inboxSubtitle")}</p>
      </header>

      {cases.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xl">📥</div>
          <p className="text-sm text-[var(--fg-muted)] mt-3">{fr ? "Aucun dossier en attente de contrat." : "No cases waiting for contract."}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cases/${c.id}`}
              className="card card-interactive p-4 space-y-2 border-amber-200 dark:border-amber-900/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.propertyName || c.reference}</div>
                  <div className="text-xs text-[var(--fg-muted)] font-mono mt-0.5">{c.reference}</div>
                </div>
                <StatusBadge status={c.status} t={t} />
              </div>
              <div className="text-xs text-[var(--fg-muted)]">
                {c.owner.firstName} {c.owner.lastName} · {c.taxType} · {c.taxYear}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--fg-muted)]">
                  {c.documents?.length || 0} {fr ? "document(s) reçus" : "document(s) received"}
                </span>
                <span className="text-xs text-[var(--brand-600)] font-medium">{fr ? "Préparer →" : "Prepare →"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
