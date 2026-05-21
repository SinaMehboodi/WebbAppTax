// All cases — server-rendered list.
//   - If the viewer can see every case (CASE_VIEW_ALL), cases are grouped
//     by primary manager: "My cases", then one section per teammate, then
//     "Unassigned". This is the manager view Samuel uses.
//   - Otherwise the viewer sees only cases assigned to them.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { can, PERMS } from "@/lib/permissions";
import StatusBadge from "@/components/StatusBadge";

const ALL_STATUSES = [
  "DRAFT","CONTRACT_PREPARING","AWAITING_SIGNATURE","SIGNED","ACTIVE",
  "AWAITING_DOCUMENTS","DOCUMENTS_RECEIVED","ANALYZING","DECISION_PENDING",
  "PROCEEDING","NOT_PROCEEDING","AUDIT_OFFERED","ADMIN_RESPONSE",
  "RESULT_DELIVERED","INVOICED","PAID","CLOSED","STOPPED","CANCELLED",
];

export default async function AllCases({ searchParams }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(me.role)) redirect("/");

  const sp = (await searchParams) || {};
  const statusFilter = typeof sp.status === "string"
    ? sp.status.split(",").filter((s) => ALL_STATUSES.includes(s))
    : null;

  const viewAll = can(me, PERMS.CASE_VIEW_ALL);

  // Where clause: status filter + (if not viewAll) restrict to cases the
  // viewer is the primary manager OR an assignee of.
  const where = {};
  if (statusFilter) where.status = { in: statusFilter };
  if (!viewAll) {
    where.OR = [
      { managerId: me.id },
      { assignments: { some: { userId: me.id } } },
    ];
  }

  const cases = await prisma.taxCase.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    include: {
      owner:   { select: { firstName: true, lastName: true, email: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      assignments: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  // Group cases by primary manager for the manager view.
  const groups = viewAll ? groupByManager(cases, me.id, fr) : null;

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("admin.cases")}</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          {viewAll
            ? (fr ? `${cases.length} dossier(s) sur l'ensemble de l'équipe` : `${cases.length} case(s) across the whole team`)
            : (fr ? `${cases.length} dossier(s) affectés à vous` : `${cases.length} case(s) assigned to you`)}
          {statusFilter && (fr ? ` · filtre actif` : ` · filtered`)}
        </p>
      </header>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/admin/cases"
          className={`text-xs px-2.5 py-1 rounded-full border ${
            !statusFilter
              ? "btn-brand border-transparent"
              : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand-500)]"
          }`}
        >
          {t("common.all")}
        </Link>
        {ALL_STATUSES.map((s) => {
          const on = statusFilter && statusFilter.includes(s);
          return (
            <Link
              key={s}
              href={`/admin/cases?status=${s}`}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                on
                  ? "btn-brand border-transparent"
                  : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand-500)]"
              }`}
            >
              {t(`status.${s}`)}
            </Link>
          );
        })}
      </div>

      {cases.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-xl">📁</div>
          <p className="text-sm text-[var(--fg-muted)] mt-3">—</p>
        </div>
      ) : viewAll ? (
        groups.map((g) => (
          <section key={g.id} className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                  g.tone === "self"
                    ? "btn-brand"
                    : g.tone === "unassigned"
                    ? "bg-[var(--surface-2)] text-[var(--fg-muted)] border border-[var(--border)]"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                }`}
              >
                {g.initials}
              </span>
              <h2 className="font-medium">{g.label}</h2>
              <span className="text-xs text-[var(--fg-muted)]">· {g.cases.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {g.cases.map((c) => <CaseCard key={c.id} c={c} fr={fr} t={t} />)}
            </div>
          </section>
        ))
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {cases.map((c) => <CaseCard key={c.id} c={c} fr={fr} t={t} />)}
        </div>
      )}
    </div>
  );
}

function groupByManager(cases, myId, fr) {
  const map = new Map();
  function bucket(id, label, initials, tone) {
    if (!map.has(id)) map.set(id, { id, label, initials, tone, cases: [] });
    return map.get(id);
  }
  // Always create "My cases" first
  bucket("__me", fr ? "Mes dossiers" : "My cases", fr ? "MOI" : "ME", "self");
  for (const c of cases) {
    if (c.managerId === myId) {
      bucket("__me", fr ? "Mes dossiers" : "My cases", fr ? "MOI" : "ME", "self").cases.push(c);
      continue;
    }
    if (c.manager) {
      const initials = (c.manager.firstName?.[0] || "?") + (c.manager.lastName?.[0] || "");
      bucket(c.manager.id, `${c.manager.firstName} ${c.manager.lastName}`, initials, "other").cases.push(c);
    } else {
      bucket("__none", fr ? "Non affectés" : "Unassigned", "—", "unassigned").cases.push(c);
    }
  }
  // Drop the empty "My cases" bucket and order: me, others alpha, unassigned
  const out = [...map.values()].filter((g) => g.cases.length > 0);
  out.sort((a, b) => {
    if (a.id === "__me") return -1;
    if (b.id === "__me") return 1;
    if (a.id === "__none") return 1;
    if (b.id === "__none") return -1;
    return a.label.localeCompare(b.label);
  });
  return out;
}

function CaseCard({ c, fr, t }) {
  return (
    <Link
      href={`/admin/cases/${c.id}`}
      className="card card-interactive p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{c.propertyName || c.reference}</div>
          <div className="text-xs text-[var(--fg-muted)] font-mono mt-0.5">{c.reference}</div>
        </div>
        <StatusBadge status={c.status} t={t} />
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--fg-muted)] pt-1 border-t border-[var(--border)]">
        <span className="truncate">{c.owner.firstName} {c.owner.lastName}</span>
        <span className="font-mono text-[10px] shrink-0 ml-2">{c.taxType} · {c.taxYear}</span>
      </div>
      {c.assignments.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {c.assignments.slice(0, 4).map((a) => (
            <span
              key={a.id}
              className="text-[10px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-muted)]"
              title={`${a.user.firstName} ${a.user.lastName}`}
            >
              {(a.user.firstName?.[0] || "?") + (a.user.lastName?.[0] || "")}
            </span>
          ))}
          {c.assignments.length > 4 && (
            <span className="text-[10px] text-[var(--fg-muted)]">+{c.assignments.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  );
}
