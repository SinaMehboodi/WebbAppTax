"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROTECTED = new Set(["CONTRACT", "MANDATE", "SIGNED_DOC", "INVOICE"]);

const KIND_COLOR = {
  TAX_NOTICE:     "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CONTRACT:       "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  MANDATE:        "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SIGNED_DOC:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  INVOICE:        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ADMIN_RESPONSE: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  PHOTO:          "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  PROPERTY_PLAN:  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  CADASTRAL:      "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

// Default English labels are used if `labels` prop is missing. Parent pages
// should pass localized labels via `getDictionary().t("doc.*")`.
const DEFAULT_LABELS = {
  view: "View",
  download: "Download",
  delete: "Delete",
  confirm: "Confirm",
  cancel: "Cancel",
  deleteError: "Could not delete this document.",
};

export default function DocumentTile({ doc, canDelete, labels }) {
  const router = useRouter();
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const isPdf = (doc.mimeType || "").includes("pdf");
  const isImage = (doc.mimeType || "").startsWith("image/");
  const url = `/api/documents/${doc.id}`;
  const size = doc.sizeBytes != null ? formatSize(doc.sizeBytes) : null;
  const allowDelete = canDelete && !PROTECTED.has(doc.kind);
  const kindColor = KIND_COLOR[doc.kind] || "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  async function onDelete() {
    if (!allowDelete) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || L.deleteError);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-3.5">
        <div className="min-w-0 flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0 ${kindColor}`}>
            {isPdf ? "PDF" : isImage ? "IMG" : "DOC"}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">{doc.kind.replace(/_/g, " ")}</div>
            <div className="text-sm font-medium truncate">{doc.filename}</div>
            <div className="text-xs text-[var(--fg-muted)] mt-0.5">
              {new Date(doc.createdAt).toLocaleString()}
              {size && ` · ${size}`}
              {doc.uploadedBy && ` · ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0 justify-end">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-2)]"
          >
            {L.view}
          </a>
          <a
            href={url}
            download={doc.filename}
            className="rounded-full btn-brand px-3 py-1.5 text-xs"
            title={L.download}
            aria-label={L.download}
          >
            ↓
          </a>
          {allowDelete && (
            confirming ? (
              <span className="inline-flex gap-1">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  className="rounded-full bg-rose-600 text-white px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {busy ? "…" : L.confirm}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
                  title={L.cancel}
                  aria-label={L.cancel}
                >
                  ✕
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-full border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 px-3 py-1.5 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                {L.delete}
              </button>
            )
          )}
        </div>
      </div>
      {error && (
        <div className="px-3 py-2 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 border-t border-rose-200 dark:border-rose-900/40">{error}</div>
      )}
      {isPdf && (
        <iframe
          title={doc.filename}
          src={`${url}#toolbar=0&navpanes=0`}
          className="w-full h-72 bg-white border-t border-[var(--border)]"
        />
      )}
      {isImage && (
        <a href={url} target="_blank" rel="noreferrer" className="block border-t border-[var(--border)]">
          <img src={url} alt={doc.filename} className="w-full max-h-72 object-contain bg-[var(--surface-2)]" />
        </a>
      )}
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
