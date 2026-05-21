// Client case detail. Covers Phases 3 → 6 visibility:
//   - status timeline
//   - documents (uploaded + signed)
//   - additional documents requested (Phase 4)
//   - decision (Phase 5)
//   - result + savings (Phase 6)
//   - invoice link if any
//   - comments (visible ones only)
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { isClientVisible, isPreContractStage } from "@/lib/workflow";
import StatusBadge from "@/components/StatusBadge";
import CommentStream from "@/components/CommentStream";
import AdditionalUpload from "@/components/AdditionalUpload";
import DocumentTile from "@/components/DocumentTile";

// A client can delete documents they uploaded as long as the case isn't
// past Phase 4. Server enforces the same rule on DELETE.
function canClientDelete(doc, caseRecord) {
  const PROTECTED = new Set(["CONTRACT", "MANDATE", "SIGNED_DOC", "INVOICE"]);
  if (PROTECTED.has(doc.kind)) return false;
  if (doc.kind === "TAX_NOTICE") {
    return ["DRAFT", "CONTRACT_PREPARING", "AWAITING_DOCUMENTS"].includes(caseRecord.status);
  }
  return !["INVOICED", "PAID", "CLOSED", "CANCELLED"].includes(caseRecord.status);
}

export default async function CaseDetail({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const c = await prisma.taxCase.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      },
      contract: true,
      mandate: true,
      docRequests: { orderBy: { createdAt: "asc" } },
      activity: { orderBy: { createdAt: "desc" }, take: 40, include: { actor: true } },
      comments: { where: { internal: false }, orderBy: { createdAt: "asc" }, include: { author: true } },
      invoice: true,
      manager: { select: { firstName: true, lastName: true } },
      assignments: {
        orderBy: { assignedAt: "asc" },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      },
    },
  });
  if (!c || c.ownerId !== user.id) notFound();
  if (!isClientVisible(c)) notFound();

  const { t, locale } = await getDictionary();
  const fr = locale === "fr";
  const pendingReqs = c.docRequests.filter((r) => !r.fulfilled);
  const signatureAudits = c.activity
    .filter((a) => a.action === "signature.audit" && a.details)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const team = c.assignments.map((a) => a.user);

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <Link href="/cases" className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <span aria-hidden>←</span> {t("common.back")}
      </Link>

      {/* Hero card */}
      <header
        className="relative overflow-hidden card p-5 sm:p-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand-50) 70%, var(--surface-1)) 0%, var(--surface-1) 70%)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">{c.reference}</div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
              {c.propertyName || c.reference}
            </h1>
            <p className="text-sm text-[var(--fg-muted)] mt-1">{c.taxType} · {c.taxYear}{c.manager ? ` · ${c.manager.firstName} ${c.manager.lastName}` : ""}</p>
          </div>
          <StatusBadge status={c.status} t={t} size="lg" audience="client" />
        </div>
      </header>

      {/* Assigned team — who's taking care of this case */}
      {(team.length > 0 || c.manager) && (
        <section className="card p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-2">
            {fr ? "Votre interlocuteur" : "Your contact"}{team.length > 1 ? (fr ? "s" : "s") : ""}
          </div>
          <ul className="flex flex-wrap gap-2">
            {(team.length > 0 ? team : (c.manager ? [{ id: "m", firstName: c.manager.firstName, lastName: c.manager.lastName, role: "EMPLOYEE" }] : [])).map((u) => {
              const isPrimary = u.id === c.managerId;
              return (
                <li
                  key={u.id}
                  className={`inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border ${
                    isPrimary
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40"
                      : "bg-[var(--surface-1)] border-[var(--border)]"
                  }`}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-gradient)] text-white text-[10px] font-semibold" style={{ background: "var(--brand-gradient)" }}>
                    {(u.firstName?.[0] || "?") + (u.lastName?.[0] || "")}
                  </span>
                  <span className="text-sm">
                    {u.firstName} {u.lastName}
                    {isPrimary && <span className="ml-1 text-amber-600 text-xs" title={fr ? "Responsable principal" : "Primary"}>★</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Pre-contract reassurance banner — before there's anything to act on */}
      {isPreContractStage(c.status) && (
        <section
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lift"
          style={{ background: "linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%)" }}
        >
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="flex items-start gap-3 relative">
            <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center text-lg shrink-0">⏳</div>
            <div>
              <p className="font-semibold text-lg">{t("pending.title")}</p>
              <p className="text-sm text-white/90 mt-1">{t("pending.body")}</p>
            </div>
          </div>
        </section>
      )}

      {/* Action banner for AWAITING_SIGNATURE */}
      {c.status === "AWAITING_SIGNATURE" && (
        <Link
          href={`/cases/${c.id}/sign`}
          className="block rounded-2xl p-5 text-white shadow-lift hover:shadow-brand transition"
          style={{ background: "linear-gradient(135deg,#f59e0b 0%,#ea580c 100%)" }}
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl">✎</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{t("sign.contractAndMandate")}</div>
              <div className="text-sm text-white/90 mt-0.5">{t("sign.explain")}</div>
            </div>
            <span aria-hidden className="text-xl">→</span>
          </div>
        </Link>
      )}

      {pendingReqs.length > 0 && (
        <section className="card p-5 space-y-3 border-amber-200 dark:border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center">📎</div>
            <h2 className="font-semibold">{t("cases.additionalDocsRequested")}</h2>
          </div>
          <ul className="space-y-1.5 pl-1">
            {pendingReqs.map((r) => (
              <li key={r.id} className="text-sm flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <div>
                  <span className="font-medium">{r.label}</span>
                  {r.description && <span className="text-[var(--fg-muted)]"> — {r.description}</span>}
                </div>
              </li>
            ))}
          </ul>
          <AdditionalUpload
            caseId={c.id}
            labels={{
              photo: t("cases.uploadPhoto"),
              gallery: t("cases.uploadGallery"),
              pdf: t("cases.uploadPdf"),
              remove: t("common.delete"),
              send: t("cases.sendDocument"),
              sending: t("cases.sendingDocument"),
              sent: t("cases.documentSent"),
              notePlaceholder: t("cases.uploadNotePlaceholder"),
              visitHint: t("cases.noPlans"),
              visitCta: t("cases.requestVisit"),
              generic: t("signup.genericError"),
            }}
          />
        </section>
      )}

      {/* Phase 5 decision */}
      {c.decisionAt && (
        <section className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 flex items-center justify-center">⚖</div>
            <h2 className="font-semibold">{t("cases.decision")}</h2>
          </div>
          <p className="text-[var(--fg)] whitespace-pre-line">
            {c.decisionNote || t("status." + c.status)}
          </p>
        </section>
      )}

      {/* Phase 6 result */}
      {c.resultAt && (
        <section
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lift"
          style={{ background: "var(--brand-gradient)" }}
        >
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <h2 className="text-sm uppercase tracking-widest text-white/80">{t("cases.result")}</h2>
          {c.estimatedSavings && (
            <p className="text-4xl sm:text-5xl font-semibold mt-2">
              {Number(c.estimatedSavings).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          )}
          {c.yearsCovered && (
            <p className="text-sm text-white/80 mt-1">{c.yearsCovered}</p>
          )}
          {c.resultSummary && (
            <p className="text-sm text-white/95 mt-3 whitespace-pre-line">{c.resultSummary}</p>
          )}
        </section>
      )}

      {/* Invoice */}
      {c.invoice && (
        <Link
          href={`/invoices/${c.invoice.id}`}
          className="card card-interactive flex items-center gap-4 p-5"
        >
          <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center">€</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{t("invoices.title")} — {c.invoice.number}</div>
            <div className="text-sm text-[var(--fg-muted)]">
              {Number(c.invoice.amountTTC).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </div>
          </div>
          <span aria-hidden className="text-[var(--fg-muted)]">→</span>
        </Link>
      )}

      {/* Signature audit trail (Phase 3 §7 — legal evidence) */}
      {signatureAudits.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 inline-flex items-center justify-center text-xs">✓</span>
            Trace de signature
          </h2>
          <div className="card p-4 space-y-3">
            {signatureAudits.map((a) => {
              const d = a.details || {};
              const ua = String(d.userAgent || "—");
              const shortUA = ua.length > 80 ? ua.slice(0, 80) + "…" : ua;
              return (
                <div key={a.id} className="border-l-2 border-emerald-500 pl-3 text-xs space-y-0.5">
                  <div className="font-semibold text-sm capitalize">{d.kind} signé</div>
                  <div className="text-[var(--fg-muted)]">
                    {d.signerName} · {d.signerEmail}
                  </div>
                  <div className="text-[var(--fg-muted)]">
                    {new Date(d.signedAtUtc || a.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · IP {d.ip}
                  </div>
                  <div className="text-[var(--fg-muted)] truncate" title={ua}>{shortUA}</div>
                  <div className="text-[var(--fg-muted)] font-mono text-[10px]">
                    SHA-256 signé : {String(d.signedSha256 || "").slice(0, 24)}…
                  </div>
                  {d.signedDocumentId && (
                    <a
                      href={`/api/documents/${d.signedDocumentId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-1 text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Voir l&apos;attestation PDF →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Documents */}
      <section>
        <h2 className="font-semibold mb-3">{t("cases.documents")}</h2>
        {c.documents.length === 0 ? (
          <p className="text-[var(--fg-muted)] text-sm">{t("cases.noDocs")}</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {c.documents.map((d) => (
              <DocumentTile
                key={d.id}
                doc={d}
                canDelete={canClientDelete(d, c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Activity */}
      <section>
        <h2 className="font-semibold mb-3">{t("cases.activity")}</h2>
        {c.activity.length === 0 ? (
          <p className="text-[var(--fg-muted)] text-sm">{t("cases.noActivity")}</p>
        ) : (
          <ul className="card p-4 space-y-2 text-sm">
            {c.activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-[var(--fg-muted)]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--brand-500)] shrink-0" />
                <span className="text-xs text-[var(--fg-muted)] tabular-nums shrink-0">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
                <span className="text-[var(--fg)]">{a.action}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Comments — live polling, chat-style */}
      <section className="space-y-3">
        <h2 className="font-semibold">{t("cases.comments")}</h2>
        <CommentStream
          caseId={c.id}
          me={{ id: user.id, name: `${user.firstName} ${user.lastName}`, role: user.role }}
          initial={c.comments.map((cm) => ({
            id: cm.id,
            body: cm.body,
            internal: cm.internal,
            createdAt: cm.createdAt.toISOString(),
            authorId: cm.authorId,
            authorName: `${cm.author.firstName} ${cm.author.lastName}`,
            authorRole: cm.author.role,
          }))}
          placeholder={t("cases.addComment")}
          submit={t("cases.addCommentSubmit")}
        />
      </section>
    </div>
  );
}
