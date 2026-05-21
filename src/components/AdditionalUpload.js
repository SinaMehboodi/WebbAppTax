"use client";

// Phase 4 — client adds additional documents to a case.
//
// UX mirrors NewCaseForm: pick a file (camera / gallery / pdf), preview it,
// then explicitly tap "Send". This way the client always sees what they're
// about to upload and can remove it before sending — fixing the confusion
// where a file would silently disappear into the global document list.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdditionalUpload({
  caseId,
  labels = {},
}) {
  const router = useRouter();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const pdfRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentAt, setSentAt] = useState(null);

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setError("");
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
    if (pdfRef.current) pdfRef.current.value = "";
  }
  function onPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setError("");
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  async function send() {
    if (!file) return;
    setSending(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "OTHER");
    if (note.trim()) fd.append("notes", note.trim());
    const res = await fetch(`/api/cases/${caseId}/documents`, { method: "POST", body: fd });
    setSending(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || labels.generic || "Upload failed");
      return;
    }
    setSentAt(new Date());
    clearFile();
    setNote("");
    router.refresh();
    setTimeout(() => setSentAt(null), 3000);
  }

  async function requestVisit() {
    await fetch(`/api/cases/${caseId}/request-visit`, { method: "POST" });
    router.refresh();
  }

  const btn =
    "flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--border)] p-4 bg-[var(--surface-1)] hover:border-[var(--brand-500)] transition disabled:opacity-50";

  return (
    <div className="space-y-3">
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />
      <input ref={pdfRef}     type="file" accept="application/pdf" hidden onChange={onPick} />

      {/* Picker buttons — only shown when nothing is staged */}
      {!file && (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={sending} className={btn} aria-label={labels.photo || "Photo"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 text-emerald-600"><path d="M3 8h3l2-2h8l2 2h3v12H3z" /><circle cx="12" cy="13" r="4" /></svg>
            <span className="text-xs font-medium">{labels.photo || "Photo"}</span>
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()} disabled={sending} className={btn} aria-label={labels.gallery || "Galerie"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 text-sky-600"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="m21 15-5-5-9 9" /></svg>
            <span className="text-xs font-medium">{labels.gallery || "Galerie"}</span>
          </button>
          <button type="button" onClick={() => pdfRef.current?.click()} disabled={sending} className={btn} aria-label={labels.pdf || "PDF"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 text-amber-600"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
            <span className="text-xs font-medium">{labels.pdf || "PDF"}</span>
          </button>
        </div>
      )}

      {/* Staged file preview + remove */}
      {file && (
        <div className="card p-3 space-y-3 border-emerald-200 dark:border-emerald-900/40">
          <div className="flex items-start gap-3">
            {previewUrl ? (
              <img src={previewUrl} alt={file.name} className="h-16 w-16 rounded-xl object-cover border border-[var(--border)] shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center text-xs font-semibold shrink-0">
                PDF
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{file.name}</div>
              <div className="text-xs text-[var(--fg-muted)] mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </div>
              <button
                type="button"
                onClick={clearFile}
                disabled={sending}
                className="text-xs text-rose-600 hover:underline mt-1"
              >
                {labels.remove || "Retirer le fichier"}
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder={labels.notePlaceholder || "Note (facultative)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={sending}
            className="w-full p-2.5 rounded-xl text-sm"
          />

          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="btn-brand w-full p-3 rounded-xl font-medium text-sm disabled:opacity-50 disabled:shadow-none inline-flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {labels.sending || "Envoi en cours..."}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>
                {labels.send || "Envoyer le document"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Success toast */}
      {sentAt && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 p-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-rise">
          <span className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
          {labels.sent || "Document envoyé"}
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
          {error}
        </p>
      )}

      <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
        {labels.visitHint}{" "}
        <button type="button" onClick={requestVisit} className="underline hover:text-[var(--fg)]">
          {labels.visitCta}
        </button>
      </div>
    </div>
  );
}
