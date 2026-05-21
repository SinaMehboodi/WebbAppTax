// Phase 7 — full history of the client's cases (including archived).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { isClientVisible } from "@/lib/workflow";
import StatusBadge from "@/components/StatusBadge";

export default async function CasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "USER") redirect("/admin/cases");

  const all = await prisma.taxCase.findMany({
    where: { ownerId: user.id },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
  });
  const cases = all.filter(isClientVisible);
  const { t } = await getDictionary();

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6 animate-rise">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("cases.title")}</h1>
        <Link
          href="/cases/new"
          className="btn-brand rounded-full px-4 py-2 text-sm font-medium"
        >
          + {t("dashboard.newCase")}
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-2xl">📂</div>
          <p className="text-[var(--fg-muted)]">{t("dashboard.noCases")}</p>
          <Link href="/cases/new" className="btn-brand inline-block rounded-full px-5 py-2.5 text-sm font-medium">
            + {t("dashboard.newCase")}
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-[var(--border)]">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="block p-4 hover:bg-[var(--surface-2)] transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold text-[var(--fg-muted)] shrink-0">
                    {c.taxType}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {c.propertyName || c.reference}
                    </div>
                    <div className="text-xs text-[var(--fg-muted)] truncate">
                      {c.taxYear} · {c.reference}
                      {c.archived ? ` · ${t("status.CLOSED")}` : ""}
                    </div>
                  </div>
                </div>
                <StatusBadge status={c.status} t={t} audience="client" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
