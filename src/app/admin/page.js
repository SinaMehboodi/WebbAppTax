// Admin workflow board — counts by status, KPIs, recent activity.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/dictionary";
import { getCurrentUser } from "@/lib/session";

const KPI_GROUPS = [
  { key: "awaitingContract",  statuses: ["CONTRACT_PREPARING"], tone: "amber",   icon: "📝" },
  { key: "awaitingSignature", statuses: ["AWAITING_SIGNATURE"], tone: "amber",   icon: "✍️" },
  { key: "awaitingDocs",      statuses: ["AWAITING_DOCUMENTS"], tone: "amber",   icon: "📎" },
  { key: "analyzing",         statuses: ["ANALYZING", "DOCUMENTS_RECEIVED"], tone: "violet", icon: "🔍" },
  { key: "decisionPending",   statuses: ["DECISION_PENDING"],   tone: "violet",  icon: "⚖" },
  { key: "invoiced",          statuses: ["INVOICED"],           tone: "amber",   icon: "€" },
];

// Role-tinted hello banner. Each role gets a distinct gradient that matches
// its role chip in /admin/users so the user instantly knows which permission
// context they're in.
const ROLE_BANNER = {
  SUPER_ADMIN: "linear-gradient(135deg,#fb7185 0%,#f43f5e 50%,#e11d48 100%)", // coral — matches the SUPER_ADMIN role chip
  ADMIN:       "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 50%,#6d28d9 100%)", // lavender/violet — matches the ADMIN role chip
  EMPLOYEE:    "linear-gradient(135deg,#2dd4bf 0%,#14b8a6 50%,#0d9488 100%)", // teal — matches the EMPLOYEE role chip
  USER:        "linear-gradient(135deg,#38bdf8 0%,#0ea5e9 50%,#0284c7 100%)", // blue — matches the USER role chip
};

export default async function AdminHome() {
  const { t, locale } = await getDictionary();
  const me = await getCurrentUser();
  const fr = locale === "fr";

  const [users, casesCount, paidAgg, recentActivity, byStatus] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.taxCase.count(),
    prisma.invoice.aggregate({
      where: { status: "PAID" },
      _sum: { amountHT: true },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { firstName: true, lastName: true, role: true } }, case: { select: { reference: true } } },
    }),
    prisma.taxCase.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(byStatus.map((b) => [b.status, b._count._all]));
  const revenue = Number(paidAgg._sum.amountHT || 0);

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6 animate-rise">
      {/* Welcome hero — tinted by role so SUPER_ADMIN / ADMIN / EMPLOYEE
          banners are visually distinct (matches role chip palette). */}
      <header
        className="relative overflow-hidden rounded-3xl p-6 sm:p-7 text-white shadow-lift"
        style={{ background: ROLE_BANNER[me?.role] || ROLE_BANNER.EMPLOYEE }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(400px circle at 80% 20%, rgba(255,255,255,.25), transparent 50%)," +
              // Neutral white sheen (not amber) so the overlay reads cleanly on
              // every role hue — coral / lavender / teal / blue alike.
              "radial-gradient(500px circle at 10% 90%, rgba(255,255,255,.18), transparent 55%)",
          }}
        />
        <div className="relative space-y-1">
          <p className="text-xs uppercase tracking-widest text-white/80">
            {new Date().toLocaleDateString(fr ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {fr ? "Bonjour " : "Hello "}{me?.firstName || ""}
          </h1>
          <p className="text-white/90 max-w-xl text-sm">
            {fr ? "Voici l'état du back-office." : "Here's the back-office snapshot."}
          </p>
        </div>
      </header>

      {/* Big KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiBig label={fr ? "Clients" : "Clients"} value={users} href="/admin/users?role=USER" tone="emerald" icon="👤" />
        <KpiBig label={fr ? "Dossiers" : "Cases"} value={casesCount} href="/admin/cases" tone="sky" icon="📁" />
        <KpiBig
          label={fr ? "CA encaissé HT" : "Revenue (paid HT)"}
          value={revenue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          href="/admin/reports"
          tone="amber"
          icon="€"
        />
      </section>

      {/* Status workload */}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-[var(--fg-muted)] mb-3">
          {fr ? "Charge de travail" : "Workload"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {KPI_GROUPS.map((g) => {
            const v = g.statuses.reduce((acc, s) => acc + (counts[s] || 0), 0);
            return (
              <KpiCard
                key={g.key}
                label={t(`admin.${g.key}`)}
                value={v}
                href={`/admin/cases?status=${g.statuses.join(",")}`}
                tone={g.tone}
                icon={g.icon}
              />
            );
          })}
        </div>
      </section>

      {/* Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-widest text-[var(--fg-muted)]">{fr ? "Activité récente" : "Recent activity"}</h2>
          <Link href="/admin/reports" className="text-xs underline text-[var(--fg-muted)] hover:text-[var(--fg)]">
            {fr ? "Voir les rapports →" : "View reports →"}
          </Link>
        </div>
        <ul className="card overflow-hidden divide-y divide-[var(--border)]">
          {recentActivity.length === 0 ? (
            <li className="p-4 text-sm text-[var(--fg-muted)]">—</li>
          ) : recentActivity.map((a) => (
            <li key={a.id} className="p-3 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-500)] shrink-0" />
                <span className="text-[var(--fg-muted)] text-xs tabular-nums shrink-0">
                  {new Date(a.createdAt).toLocaleString(fr ? "fr-FR" : "en-US", { timeStyle: "short", dateStyle: "short" })}
                </span>
                <span className="font-mono text-xs truncate">{a.action}</span>
                {a.case && (
                  <Link
                    href={`/admin/cases/${a.case.reference}`}
                    className="text-xs text-[var(--brand-600)] hover:underline shrink-0"
                  >
                    {a.case.reference}
                  </Link>
                )}
              </div>
              {a.actor && (
                <span className="text-xs text-[var(--fg-muted)] shrink-0">
                  {a.actor.firstName} {a.actor.lastName}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function KpiBig({ label, value, href, tone, icon }) {
  const TONE = {
    emerald: { bg: "from-emerald-500/15 to-emerald-500/0", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    sky:     { bg: "from-sky-500/15 to-sky-500/0",         chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
    amber:   { bg: "from-amber-500/15 to-amber-500/0",     chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  };
  const t = TONE[tone] || TONE.sky;
  return (
    <Link
      href={href}
      className={`card card-interactive p-5 bg-gradient-to-br ${t.bg}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide font-medium text-[var(--fg-muted)]">{label}</div>
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-base ${t.chip}`}>{icon}</div>
      </div>
      <div className="text-2xl sm:text-3xl font-semibold mt-2 tabular-nums">{value}</div>
    </Link>
  );
}

function KpiCard({ label, value, href, tone, icon }) {
  const TONE = {
    amber:  "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    violet: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300",
  };
  return (
    <Link href={href} className="card card-interactive p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide font-medium text-[var(--fg-muted)]">{label}</div>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-sm ${TONE[tone] || TONE.amber}`}>{icon}</div>
      </div>
      <div className="text-xl font-semibold mt-1 tabular-nums">{value}</div>
    </Link>
  );
}
