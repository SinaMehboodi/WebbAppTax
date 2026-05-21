// Admin case workspace. All the tools for Phases 3-6, gated by per-user
// permissions (see src/lib/permissions.js).
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { can, PERMS } from "@/lib/permissions";
import StatusBadge from "@/components/StatusBadge";
import ContractForm from "./ContractForm";
import DocRequestForm from "./DocRequestForm";
import AnalysisForm from "./AnalysisForm";
import DecisionForm from "./DecisionForm";
import ResultForm from "./ResultForm";
import InvoiceActions from "./InvoiceActions";
import CloseCaseDialog from "./CloseCaseDialog";
import AssignmentManager from "./AssignmentManager";
import DangerZone from "./DangerZone";
import DocumentTile from "@/components/DocumentTile";

const TERMINAL = new Set(["CLOSED", "STOPPED", "CANCELLED"]);

export default async function AdminCaseDetail({ params }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [c, staffOptions] = await Promise.all([
    prisma.taxCase.findUnique({
      where: { id },
      include: {
        owner: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        contract: true,
        mandate: true,
        documents: {
          orderBy: { createdAt: "desc" },
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        },
        docRequests: { orderBy: { createdAt: "asc" } },
        analyses: { orderBy: { createdAt: "desc" } },
        activity: { orderBy: { createdAt: "desc" }, take: 30, include: { actor: true } },
        comments: { orderBy: { createdAt: "asc" }, include: { author: true } },
        invoice: true,
        assignments: {
          orderBy: { assignedAt: "asc" },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "EMPLOYEE", "SUPER_ADMIN"] }, active: true },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
  ]);
  if (!c) notFound();
  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  const assignees = c.assignments.map((a) => a.user);
  const isTerminal = TERMINAL.has(c.status);

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 animate-rise">
      <Link href="/admin/cases" className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-4">
        <span aria-hidden>←</span> {t("admin.cases")}
      </Link>

      {/* Hero */}
      <header
        className="relative overflow-hidden card p-5 sm:p-6 mb-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand-50) 70%, var(--surface-1)) 0%, var(--surface-1) 70%)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-[var(--fg-muted)] font-mono">{c.reference}</div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1 truncate">
              {c.propertyName || c.reference}
            </h1>
            <p className="text-sm text-[var(--fg-muted)] mt-1 truncate">
              {c.owner.firstName} {c.owner.lastName} · <a href={`mailto:${c.owner.email}`} className="hover:underline">{c.owner.email}</a> · {c.taxType} · {c.taxYear}
            </p>
          </div>
          <StatusBadge status={c.status} t={t} size="lg" />
        </div>
        {c.closeReason && isTerminal && (
          <div className="mt-3 text-xs text-[var(--fg-muted)] border-l-2 border-[var(--border)] pl-3">
            <span className="uppercase tracking-wider">{fr ? "Raison" : "Reason"} :</span> {c.closeReason}
          </div>
        )}
      </header>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Phase 3 — Contract preparation */}
          {!isTerminal && (c.status === "DRAFT" || c.status === "CONTRACT_PREPARING") && can(me, PERMS.CASE_PREPARE_CONTRACT) && (
            <Card title={t("admin.prepareContract")} icon="📝" tone="amber">
              <ContractForm caseId={c.id} defaults={c} />
            </Card>
          )}

          {c.contract && (
            <Card title={t("sign.contractAndMandate")} icon="✍️" tone="amber">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <MiniStat label={fr ? "Contrat" : "Contract"} value={c.contract.status} tone={c.contract.status === "SIGNED" ? "emerald" : "amber"} />
                <MiniStat label={fr ? "Mandat" : "Mandate"} value={c.mandate?.status || "—"} tone={c.mandate?.status === "SIGNED" ? "emerald" : "amber"} />
              </div>
              <div className="text-xs text-[var(--fg-muted)] mt-3">
                {t("admin.feeModel")}: <b>{c.contract.feeModel}</b>
                {c.contract.feePercent && ` · ${Number(c.contract.feePercent)}%`}
                {c.contract.feeFlatAmount && ` · ${Number(c.contract.feeFlatAmount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`}
              </div>
            </Card>
          )}

          {/* Phase 4 — Additional documents */}
          {!isTerminal && (c.status === "ACTIVE" || c.status === "AWAITING_DOCUMENTS" || c.status === "DOCUMENTS_RECEIVED") && can(me, PERMS.CASE_REQUEST_DOCS) && (
            <Card title={t("admin.requestDocs")} icon="📎" tone="amber">
              {c.docRequests.length > 0 && (
                <ul className="space-y-1.5 mb-3 text-sm">
                  {c.docRequests.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${r.fulfilled ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                        {r.fulfilled ? "✓" : "•"}
                      </span>
                      <span className={r.fulfilled ? "line-through text-[var(--fg-muted)]" : ""}>
                        {r.label}
                        {r.description && <span className="text-[var(--fg-muted)]"> — {r.description}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <DocRequestForm caseId={c.id} />
            </Card>
          )}

          {/* Phase 5 — Analysis */}
          {!isTerminal && (c.status === "DOCUMENTS_RECEIVED" || c.status === "ANALYZING" || c.status === "ACTIVE") && can(me, PERMS.CASE_ANALYZE) && (
            <Card title={t("admin.analyze")} icon="🔍" tone="violet">
              <AnalysisForm caseId={c.id} />
            </Card>
          )}

          {/* Phase 5 — Decision */}
          {!isTerminal && (c.status === "DECISION_PENDING" || c.status === "ANALYZING") && can(me, PERMS.CASE_DECIDE) && (
            <Card title={t("admin.decision")} icon="⚖" tone="violet">
              <DecisionForm caseId={c.id} />
            </Card>
          )}

          {/* Phase 6 — Result */}
          {!isTerminal && (c.status === "PROCEEDING" || c.status === "ADMIN_RESPONSE") && can(me, PERMS.CASE_RECORD_RESULT) && (
            <Card title={t("admin.recordResult")} icon="🏁" tone="emerald">
              <ResultForm caseId={c.id} initial={c} />
            </Card>
          )}

          {/* Phase 6 — Invoicing */}
          {!isTerminal && (c.status === "RESULT_DELIVERED" || c.status === "INVOICED" || c.invoice) && (can(me, PERMS.CASE_INVOICE) || can(me, PERMS.CASE_MARK_PAID)) && (
            <Card title={c.invoice ? `${t("invoices.title")} ${c.invoice.number}` : t("admin.issueInvoice")} icon="€" tone="amber">
              <InvoiceActions
                caseId={c.id}
                invoice={c.invoice}
                feeModel={c.feeModel}
                feePercent={c.feePercent}
                estimatedSavings={c.estimatedSavings}
                feeFlatAmount={c.feeFlatAmount}
              />
            </Card>
          )}

          {/* Close case */}
          {!isTerminal && can(me, PERMS.CASE_CLOSE) && (
            <Card title={fr ? "Clôturer ce dossier" : "Close this case"} icon="⏹" tone="rose">
              <p className="text-xs text-[var(--fg-muted)] mb-3">
                {fr
                  ? "Le client est notifié et le dossier passe en lecture seule."
                  : "The client is notified and the case becomes read-only."}
              </p>
              <CloseCaseDialog caseId={c.id} fr={fr} />
            </Card>
          )}

          {/* Documents */}
          <Card title={t("cases.documents")} icon="📂" tone="sky">
            {c.documents.length === 0 ? (
              <p className="text-[var(--fg-muted)] text-sm">—</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {c.documents.map((d) => (
                  <DocumentTile key={d.id} doc={d} canDelete={true} />
                ))}
              </div>
            )}
          </Card>

          {/* Danger zone — SUPER_ADMIN only */}
          {can(me, PERMS.CASE_DELETE) && (
            <Card title={fr ? "Zone dangereuse" : "Danger zone"} icon="⚠" tone="rose">
              <DangerZone caseId={c.id} reference={c.reference} fr={fr} />
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          {/* Assignments */}
          <Card title={fr ? "Équipe affectée" : "Assigned team"} icon="👥" tone="emerald" compact>
            <AssignmentManager
              caseId={c.id}
              meId={me.id}
              primaryId={c.managerId}
              assignees={assignees}
              staffOptions={staffOptions}
              canSelf={can(me, PERMS.CASE_ASSIGN_SELF)}
              canOthers={can(me, PERMS.CASE_ASSIGN_OTHERS)}
              fr={fr}
            />
          </Card>

          <Card title={t("cases.activity")} icon="⏱" tone="emerald" compact>
            {c.activity.length === 0 ? (
              <p className="text-[var(--fg-muted)] text-sm">—</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {c.activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-500)] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[var(--fg-muted)] tabular-nums">
                        {new Date(a.createdAt).toLocaleString(fr ? "fr-FR" : "en-US", { timeStyle: "short", dateStyle: "short" })}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--fg)] truncate">{a.action}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("cases.comments")} icon="💬" tone="sky" compact>
            {c.comments.length === 0 ? (
              <p className="text-[var(--fg-muted)] text-sm">—</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {c.comments.map((cm) => {
                  const isStaff = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(cm.author.role);
                  return (
                    <li
                      key={cm.id}
                      className={`rounded-xl p-2.5 border ${
                        cm.internal
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40"
                          : isStaff
                          ? "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900/40"
                          : "bg-[var(--surface-2)] border-[var(--border)]"
                      }`}
                    >
                      <div className="text-[10px] text-[var(--fg-muted)] flex items-center gap-1.5 mb-1">
                        <span>{cm.author.firstName} {cm.author.lastName}</span>
                        {cm.internal && (
                          <span className="px-1 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                            internal
                          </span>
                        )}
                      </div>
                      <div className="text-xs whitespace-pre-line">{cm.body}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children, icon, tone, compact }) {
  const TONE = {
    amber:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    violet:  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    sky:     "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    rose:    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };
  return (
    <section className={`card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center gap-2.5 mb-3">
        {icon && (
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm ${TONE[tone] || TONE.sky}`}>
            {icon}
          </span>
        )}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, tone }) {
  const TONE = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-200",
    amber:   "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-200",
  };
  return (
    <div className={`rounded-xl border p-3 ${TONE[tone] || TONE.amber}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
