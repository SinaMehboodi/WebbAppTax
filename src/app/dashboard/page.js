// Phase 2 §6 — Client home. Shows welcome name, reference rep, open cases and
// next actions. Hidden DRAFT/CONTRACT_PREPARING cases (per Phase 3 §9 — those
// must not be visible until signature).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { isClientVisible } from "@/lib/workflow";
import StatusBadge from "@/components/StatusBadge";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN" || user.role === "EMPLOYEE") redirect("/admin");
  if (!user.firstLoginTutorialSeen) redirect("/tutorial");

  const [allCases, ref, unreadCount] = await Promise.all([
    prisma.taxCase.findMany({
      where: { ownerId: user.id, archived: false },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        docRequests: { where: { fulfilled: false } },
        contract: true,
        mandate: true,
      },
    }),
    user.referenceRepId
      ? prisma.user.findUnique({
          where: { id: user.referenceRepId },
          select: { firstName: true, lastName: true, email: true },
        })
      : Promise.resolve(null),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const cases = allCases.filter(isClientVisible);
  const { t } = await getDictionary();

  const actions = buildActions(cases, t);

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-7 animate-rise">
      {/* Welcome hero */}
      <header
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-lift"
        style={{ background: "var(--brand-gradient)" }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(400px circle at 80% 20%, rgba(255,255,255,.25), transparent 50%)," +
              "radial-gradient(500px circle at 10% 90%, rgba(245,158,11,.35), transparent 55%)",
          }}
        />
        <div className="relative space-y-2">
          <p className="text-xs uppercase tracking-widest text-white/80">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            {t("dashboard.welcome", { name: user.firstName })}
          </h1>
          <p className="text-white/90 max-w-xl">
            {ref
              ? t("dashboard.yourContact", { name: `${ref.firstName} ${ref.lastName}` })
              : t("dashboard.noContact")}
          </p>
        </div>
      </header>

      {/* Quick stat tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/cases/new"
          className="group relative overflow-hidden rounded-2xl p-5 text-white shadow-card hover:shadow-lift transition"
          style={{ background: "linear-gradient(135deg,#f59e0b 0%,#ea580c 100%)" }}
        >
          <div className="text-xs uppercase tracking-widest opacity-90">+ {t("dashboard.newCase")}</div>
          <div className="text-2xl font-semibold mt-2">{t("cases.taxTypeTF")} / {t("cases.taxTypeCFE")}</div>
          <span className="absolute -right-3 -bottom-3 h-20 w-20 rounded-full bg-white/15 blur-xl group-hover:bg-white/25 transition" />
        </Link>

        <Link
          href="/cases"
          className="card card-interactive p-5"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">{t("dashboard.openCases")}</div>
            <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M3 7h18v13H3z" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </div>
          </div>
          <div className="text-3xl font-semibold mt-2">{cases.length}</div>
        </Link>

        <Link
          href="/notifications"
          className="card card-interactive p-5 relative"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">{t("nav.notifications")}</div>
            <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
            </div>
          </div>
          <div className="text-3xl font-semibold mt-2">{unreadCount}</div>
          {unreadCount > 0 && (
            <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
          )}
        </Link>
      </section>

      {/* Actions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t("dashboard.actions")}</h2>
        </div>
        {actions.length === 0 ? (
          <div className="card p-5 text-sm text-[var(--fg-muted)] flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">✓</div>
            {t("dashboard.nothingToDo")}
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className="card card-interactive flex items-center gap-4 p-4 border-amber-200 dark:border-amber-900/40"
                style={{ background: "linear-gradient(135deg, color-mix(in srgb,#fef3c7 60%,var(--surface-1)) 0%, var(--surface-1) 100%)" }}
              >
                <span className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg">⚡</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="text-sm text-[var(--fg-muted)] truncate">{a.subtitle}</div>
                </div>
                <span className="text-[var(--fg-muted)]" aria-hidden>→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Cases list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t("cases.title")}</h2>
          <Link href="/cases" className="text-sm underline text-[var(--fg-muted)] hover:text-[var(--fg)]">
            {t("dashboard.viewAll")}
          </Link>
        </div>
        {cases.length === 0 ? (
          <div className="card p-5 text-sm text-[var(--fg-muted)]">{t("dashboard.noCases")}</div>
        ) : (
          <div className="card overflow-hidden divide-y divide-[var(--border)]">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="block p-4 hover:bg-[var(--surface-2)] transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {c.propertyName || c.reference}
                    </div>
                    <div className="text-sm text-[var(--fg-muted)] truncate">
                      {c.taxType} · {c.taxYear} · {c.reference}
                    </div>
                  </div>
                  <StatusBadge status={c.status} t={t} audience="client" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-[var(--fg-muted)]">
        <Link href="/tutorial" className="underline">{t("dashboard.tutorialReplay")}</Link>
      </p>
    </div>
  );
}

function buildActions(cases, t) {
  const out = [];
  for (const c of cases) {
    if (c.status === "AWAITING_SIGNATURE") {
      out.push({
        title: t("status.AWAITING_SIGNATURE"),
        subtitle: `${c.reference} — ${t("sign.contractAndMandate")}`,
        href: `/cases/${c.id}/sign`,
      });
    } else if (c.status === "AWAITING_DOCUMENTS" || (c.docRequests && c.docRequests.length > 0)) {
      out.push({
        title: t("cases.additionalDocsRequested"),
        subtitle: `${c.reference}`,
        href: `/cases/${c.id}`,
      });
    } else if (c.status === "RESULT_DELIVERED" || c.status === "INVOICED") {
      out.push({
        title: t("status." + c.status),
        subtitle: c.reference,
        href: `/cases/${c.id}`,
      });
    }
  }
  return out;
}
