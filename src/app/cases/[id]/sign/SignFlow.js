"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/SignaturePad";

export default function SignFlow({ caseId, signerName, contract, mandate, labels }) {
  const router = useRouter();
  const [active, setActive] = useState(null); // "contract" | "mandate" | null
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const contractSigned = contract.status === "SIGNED";
  const mandateSigned = mandate.status === "SIGNED";
  const allSigned = contractSigned && mandateSigned;

  async function submitSignature(kind, dataUrl, meta) {
    setError("");
    setPending(true);
    const res = await fetch(`/api/cases/${caseId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        signatureDataUrl: dataUrl,
        consent: !!meta?.consent,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Signature failed");
      return;
    }
    setActive(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Step done={contractSigned} active={active === "contract"} label={labels.contract} />
        <div className="flex-1 h-px bg-[var(--border)]" />
        <Step done={mandateSigned} active={active === "mandate"} label={labels.mandate} />
      </div>

      <DocTile
        title={labels.contract}
        ctaSign={labels.signContract}
        signedLabel={labels.signed}
        signed={contractSigned}
        signedDocId={contract.signedDocumentId}
        previewDocId={contract.documentId}
        active={active === "contract"}
        onOpen={() => setActive("contract")}
        onCancel={() => setActive(null)}
        onCapture={(url, meta) => submitSignature("contract", url, meta)}
        signerName={signerName}
        pending={pending}
      />

      <DocTile
        title={labels.mandate}
        ctaSign={labels.signMandate}
        signedLabel={labels.signed}
        signed={mandateSigned}
        signedDocId={mandate.signedDocumentId}
        previewDocId={mandate.documentId}
        active={active === "mandate"}
        onOpen={() => setActive("mandate")}
        onCancel={() => setActive(null)}
        onCapture={(url, meta) => submitSignature("mandate", url, meta)}
        signerName={signerName}
        pending={pending}
      />

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">{error}</p>
      )}

      {allSigned && (
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lift animate-rise"
          style={{ background: "var(--brand-gradient)" }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="flex items-start gap-3 relative">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-xl">✓</div>
            <div>
              <p className="font-semibold text-lg">{labels.afterTitle}</p>
              <p className="text-sm text-white/90 mt-1">{labels.afterBody}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ done, active, label }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border ${
          done
            ? "bg-emerald-500 text-white border-emerald-500"
            : active
            ? "bg-amber-500 text-white border-amber-500"
            : "bg-[var(--surface-1)] text-[var(--fg-muted)] border-[var(--border)]"
        }`}
      >
        {done ? "✓" : active ? "•" : ""}
      </span>
      <span className={`text-xs ${done || active ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"}`}>{label}</span>
    </div>
  );
}

function DocTile({
  title, ctaSign, signedLabel, signed, signedDocId, previewDocId,
  active, onOpen, onCancel, onCapture, signerName, pending,
}) {
  const docToShow = signed && signedDocId ? signedDocId : previewDocId;
  return (
    <div className={`card overflow-hidden ${active ? "ring-2 ring-[var(--brand-500)]" : ""}`}>
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`h-11 w-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
              signed
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
            aria-hidden
          >
            {signed ? "✓" : "✎"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-[var(--fg-muted)] mt-0.5">
              {signed ? signedLabel : "PDF · prêt à signer"}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 sm:justify-end">
          {docToShow && (
            <a
              href={`/api/documents/${docToShow}`}
              target="_blank"
              rel="noreferrer"
              className="btn-soft rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm flex-1 sm:flex-none text-center"
            >
              Voir PDF
            </a>
          )}
          {!signed && !active && (
            <button
              type="button"
              onClick={onOpen}
              disabled={pending}
              className="btn-brand rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 flex-1 sm:flex-none"
            >
              {ctaSign}
            </button>
          )}
        </div>
      </div>

      {active && previewDocId && (
        <div className="grid md:grid-cols-2 gap-3 p-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <iframe
            title={title}
            src={`/api/documents/${previewDocId}#toolbar=0&navpanes=0`}
            className="w-full h-[360px] md:h-[420px] rounded-xl border border-[var(--border)] bg-white"
          />
          <SignaturePad
            signerName={signerName}
            onCapture={onCapture}
            onCancel={onCancel}
          />
        </div>
      )}
    </div>
  );
}
