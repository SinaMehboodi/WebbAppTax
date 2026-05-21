"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignActions({ caseId, contractStatus, mandateStatus, labels }) {
  const router = useRouter();
  const [pending, setPending] = useState(null);

  async function sign(kind) {
    setPending(kind);
    await fetch(`/api/cases/${caseId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    setPending(null);
    router.refresh();
  }

  const contractSigned = contractStatus === "SIGNED";
  const mandateSigned = mandateStatus === "SIGNED";
  const allSigned = contractSigned && mandateSigned;

  return (
    <div className="space-y-3">
      <SignTile
        title={labels.signContract}
        signed={contractSigned}
        pending={pending === "contract"}
        signedLabel={labels.signed}
        previewLabel={labels.previewContract}
        onSign={() => sign("contract")}
      />
      <SignTile
        title={labels.signMandate}
        signed={mandateSigned}
        pending={pending === "mandate"}
        signedLabel={labels.signed}
        previewLabel={labels.previewMandate}
        onSign={() => sign("mandate")}
      />

      {allSigned && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-5">
          <p className="font-semibold">{labels.afterTitle}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{labels.afterBody}</p>
        </div>
      )}
    </div>
  );
}

function SignTile({ title, signed, pending, previewLabel, signedLabel, onSign }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center justify-between gap-3">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{previewLabel}</div>
      </div>
      {signed ? (
        <span className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">✓ {signedLabel}</span>
      ) : (
        <button
          type="button"
          onClick={onSign}
          disabled={pending}
          className="rounded-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 px-4 py-2 text-sm disabled:opacity-50"
        >
          {pending ? "..." : title}
        </button>
      )}
    </div>
  );
}
