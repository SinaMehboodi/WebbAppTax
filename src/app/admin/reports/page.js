// Phase 7+ — back-office reporting. Filters by date range, status, tax type,
// manager and free-text. Renders KPI tiles + a results table with CSV export.
//
// All filter state lives in the URL (?start=...&status=...) so reports are
// shareable / bookmarkable.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import SearchForm from "./SearchForm";
import StatusBadge from "@/components/StatusBadge";
import { can, PERMS } from "@/lib/permissions";

const STATUSES = [
  "DRAFT", "CONTRACT_PREPARING", "AWAITING_SIGNATURE", "SIGNED",
  "ACTIVE", "AWAITING_DOCUMENTS", "DOCUMENTS_RECEIVED",
  "ANALYZING", "DECISION_PENDING",
  "PROCEEDING", "NOT_PROCEEDING", "AUDIT_OFFERED",
  "ADMIN_RESPONSE", "RESULT_DELIVERED", "INVOICED", "PAID",
  "CLOSED", "STOPPED", "CANCELLED",
];
const TAX_TYPES = ["TF", "CFE", "AUDIT", "OTHER"];

function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function ReportsPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role)) redirect("/");
  if (!can(user, PERMS.REPORTS_VIEW)) redirect("/admin");
  const canExport = can(user, PERMS.REPORTS_EXPORT);

  const sp = (await searchParams) || {};
  const f = {
    start: parseDate(sp.start),
    end:   parseDate(sp.end),
    dateField: ["createdAt", "noticeDate", "resultAt"].includes(sp.dateField) ? sp.dateField : "createdAt",
    status: typeof sp.status === "string" && sp.status ? sp.status.split(",").filter(Boolean) : [],
    taxType: typeof sp.taxType === "string" && sp.taxType ? sp.taxType.split(",").filter(Boolean) : [],
    managerId: typeof sp.managerId === "string" && sp.managerId ? sp.managerId : null,
    q: typeof sp.q === "string" ? sp.q.trim() : "",
    archived: sp.archived === "1" ? true : sp.archived === "0" ? false : null,
    minSavings: sp.minSavings ? Number(sp.minSavings) : null,
    maxSavings: sp.maxSavings ? Number(sp.maxSavings) : null,
  };

  // Build Prisma where clause
  const where = {};
  if (f.start || f.end) {
    where[f.dateField] = {};
    if (f.start) where[f.dateField].gte = f.start;
    if (f.end)   where[f.dateField].lte = new Date(f.end.getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  if (f.status.length) where.status = { in: f.status };
  if (f.taxType.length) where.taxType = { in: f.taxType };
  if (f.managerId) where.managerId = f.managerId;
  if (f.archived !== null) where.archived = f.archived;
  if (f.minSavings != null || f.maxSavings != null) {
    where.estimatedSavings = {};
    if (f.minSavings != null) where.estimatedSavings.gte = f.minSavings;
    if (f.maxSavings != null) where.estimatedSavings.lte = f.maxSavings;
  }
  if (f.q) {
    where.OR = [
      { reference:    { contains: f.q, mode: "insensitive" } },
      { propertyName: { contains: f.q, mode: "insensitive" } },
      { propertyCity: { contains: f.q, mode: "insensitive" } },
      { owner: { email:     { contains: f.q, mode: "insensitive" } } },
      { owner: { firstName: { contains: f.q, mode: "insensitive" } } },
      { owner: { lastName:  { contains: f.q, mode: "insensitive" } } },
    ];
  }

  const [rows, employees, kpis] = await Promise.all([
    prisma.taxCase.findMany({
      where,
      orderBy: { [f.dateField === "createdAt" ? "createdAt" : f.dateField]: "desc" },
      take: 500,
      include: {
        owner:   { select: { firstName: true, lastName: true, email: true } },
        manager: { select: { firstName: true, lastName: true } },
        invoice: { select: { amountTTC: true, status: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "EMPLOYEE"] }, active: true },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
    computeKpis(where),
  ]);

  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(sp).filter(([_, v]) => typeof v === "string" && v.length > 0)
    )
  ).toString();
  const csvHref = `/api/admin/reports/export${queryString ? `?${queryString}` : ""}`;

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{fr ? "Rapports" : "Reports"}</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            {fr ? "Recherche avancée et statistiques sur l'ensemble des dossiers." : "Advanced search and stats across all cases."}
          </p>
        </div>
        {canExport && (
          <a
            href={csvHref}
            className="btn-soft rounded-full px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
            {fr ? "Exporter CSV" : "Export CSV"}
          </a>
        )}
      </header>

      {/* KPI tiles */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile label={fr ? "Dossiers" : "Cases"} value={kpis.count} tone="emerald" />
        <KpiTile
          label={fr ? "Économies estimées" : "Estimated savings"}
          value={formatEur(kpis.totalSavings)}
          tone="sky"
        />
        <KpiTile
          label={fr ? "CA facturé HT" : "Revenue HT"}
          value={formatEur(kpis.totalRevenueHT)}
          tone="amber"
        />
        <KpiTile
          label={fr ? "Encaissé TTC" : "Collected TTC"}
          value={formatEur(kpis.totalPaidTTC)}
          tone="violet"
        />
      </section>

      {/* Filters */}
      <SearchForm
        initial={f}
        statuses={STATUSES}
        taxTypes={TAX_TYPES}
        employees={employees}
        fr={fr}
      />

      {/* Results table — desktop */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left">
                <th className="p-3 font-medium">Réf.</th>
                <th className="p-3 font-medium">{fr ? "Client" : "Client"}</th>
                <th className="p-3 font-medium">{fr ? "Type" : "Type"}</th>
                <th className="p-3 font-medium">{fr ? "Année" : "Year"}</th>
                <th className="p-3 font-medium">{fr ? "Statut" : "Status"}</th>
                <th className="p-3 font-medium">{fr ? "Responsable" : "Manager"}</th>
                <th className="p-3 font-medium text-right">{fr ? "Économies" : "Savings"}</th>
                <th className="p-3 font-medium text-right">{fr ? "Facture TTC" : "Invoice TTC"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-[var(--fg-muted)]">{fr ? "Aucun résultat." : "No results."}</td></tr>
              ) : rows.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--surface-2)] transition">
                  <td className="p-3 font-mono text-xs">
                    <Link href={`/admin/cases/${c.id}`} className="text-[var(--brand-600)] hover:underline">
                      {c.reference}
                    </Link>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{c.owner.firstName} {c.owner.lastName}</div>
                    <div className="text-xs text-[var(--fg-muted)]">{c.owner.email}</div>
                  </td>
                  <td className="p-3"><span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">{c.taxType}</span></td>
                  <td className="p-3 tabular-nums">{c.taxYear}</td>
                  <td className="p-3"><StatusBadge status={c.status} t={t} /></td>
                  <td className="p-3 text-[var(--fg-muted)]">
                    {c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                    {c.estimatedSavings ? formatEur(Number(c.estimatedSavings)) : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {c.invoice
                      ? `${formatEur(Number(c.invoice.amountTTC))} (${c.invoice.status})`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card list — mobile */}
      <div className="space-y-2 md:hidden">
        {rows.length === 0 && (
          <div className="card p-6 text-center text-[var(--fg-muted)] text-sm">{fr ? "Aucun résultat." : "No results."}</div>
        )}
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/admin/cases/${c.id}`}
            className="block card card-interactive p-4 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-xs text-[var(--brand-600)]">{c.reference}</div>
              <StatusBadge status={c.status} t={t} />
            </div>
            <div className="font-medium">{c.owner.firstName} {c.owner.lastName}</div>
            <div className="text-xs text-[var(--fg-muted)] flex justify-between">
              <span>{c.taxType} · {c.taxYear}</span>
              {c.estimatedSavings && (
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {formatEur(Number(c.estimatedSavings))}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-[var(--fg-muted)] text-right">
        {fr ? `${rows.length} résultat(s) · limite 500` : `${rows.length} result(s) · limit 500`}
      </p>
    </div>
  );
}

async function computeKpis(where) {
  const [count, savings, invoiced, paid] = await Promise.all([
    prisma.taxCase.count({ where }),
    prisma.taxCase.aggregate({ where, _sum: { estimatedSavings: true } }),
    prisma.invoice.aggregate({
      where: { case: where },
      _sum: { amountHT: true },
    }),
    prisma.invoice.aggregate({
      where: { case: where, status: "PAID" },
      _sum: { amountTTC: true },
    }),
  ]);
  return {
    count,
    totalSavings: Number(savings._sum.estimatedSavings || 0),
    totalRevenueHT: Number(invoiced._sum.amountHT || 0),
    totalPaidTTC: Number(paid._sum.amountTTC || 0),
  };
}

function formatEur(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function KpiTile({ label, value, tone }) {
  const TONE = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    sky:     "from-sky-500/15 to-sky-500/5 text-sky-700 dark:text-sky-400",
    amber:   "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400",
    violet:  "from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-400",
  };
  return (
    <div className={`card p-4 bg-gradient-to-br ${TONE[tone] || TONE.sky}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="text-xl sm:text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
