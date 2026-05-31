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
  const search = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "updated_desc";

  const viewAll = can(me, PERMS.CASE_VIEW_ALL);

  // Where clause: status filter + search + (if not viewAll) restrict to
  // cases the viewer is the primary manager OR an assignee of.
  const where = {};
  if (statusFilter) where.status = { in: statusFilter };
  if (search) {
    where.AND = [
      {
        OR: [
          { reference: { contains: search, mode: "insensitive" } },
          { propertyName: { contains: search, mode: "insensitive" } },
          { owner: { firstName: { contains: search, mode: "insensitive" } } },
          { owner: { lastName: { contains: search, mode: "insensitive" } } },
        ],
      },
    ];
  }
  if (!viewAll) {
    where.OR = [
      { managerId: me.id },
      { assignments: { some: { userId: me.id } } },
    ];
  }

  const orderBy = {
    updated_desc: [{ updatedAt: "desc" }],
    updated_asc:  [{ updatedAt: "asc"  }],
    created_desc: [{ createdAt: "desc" }],
    created_asc:  [{ createdAt: "asc"  }],
    reference_asc:[{ reference: "asc"  }],
  }[sort] || [{ updatedAt: "desc" }];

  const cases = await prisma.taxCase.findMany({
    where,
    orderBy,
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

      {/* Filter bar — compact, professional. A native form submits via GET
          which keeps everything server-rendered (no extra JS). */}
      <form method="GET" className="card p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
        <div className="sm:col-span-5 relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder={fr ? "Rechercher (référence, bien, client…)" : "Search (reference, property, client…)"}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm"
          />
        </div>
        <label className="sm:col-span-4 text-sm">
          <select
            name="status"
            defaultValue={statusFilter ? statusFilter.join(",") : ""}
            className="w-full p-2 rounded-xl text-sm"
          >
            <option value="">{fr ? "Tous les statuts" : "All statuses"}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 text-sm">
          <select name="sort" defaultValue={sort} className="w-full p-2 rounded-xl text-sm">
            <option value="updated_desc">{fr ? "Récent" : "Recent"}</option>
            <option value="updated_asc">{fr ? "Ancien" : "Oldest"}</option>
            <option value="created_desc">{fr ? "Date création ↓" : "Created ↓"}</option>
            <option value="created_asc">{fr ? "Date création ↑" : "Created ↑"}</option>
            <option value="reference_asc">{fr ? "Référence" : "Reference"}</option>
          </select>
        </label>
        <div className="sm:col-span-1 flex gap-2">
          <button type="submit" className="btn-brand rounded-xl px-3 py-2 text-sm font-medium w-full sm:w-auto" title={fr ? "Filtrer" : "Filter"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 mx-auto"><path d="M4 4h16M7 12h10M10 20h4" /></svg>
          </button>
        </div>
        {(statusFilter || search || sort !== "updated_desc") && (
          <Link
            href="/admin/cases"
            className="sm:col-span-12 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] underline w-fit"
          >
            {fr ? "Réinitialiser les filtres" : "Reset filters"}
          </Link>
        )}
      </form>

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
              className="text-[11px] font-semibold inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800/60 tracking-tight"
              title={`${a.user.firstName} ${a.user.lastName}`}
            >
              {(a.user.firstName?.[0] || "?") + (a.user.lastName?.[0] || "")}
            </span>
          ))}
          {c.assignments.length > 4 && (
            <span className="text-[11px] text-[var(--fg-muted)] font-medium">+{c.assignments.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  );
}
