"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCaseForm({ labels }) {
  const router = useRouter();
  const cameraRef = useRef(null);
  const pdfRef = useRef(null);
  const galleryRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 11 }, (_, i) => currentYear + 1 - i),
    [currentYear]
  );

  const [file, setFile] = useState(null);
  const [taxType, setTaxType] = useState("TF");
  const [taxYear, setTaxYear] = useState(currentYear);
  const [propertyName, setPropertyName] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function pickPhoto()    { cameraRef.current?.click(); }
  function pickPdf()      { pdfRef.current?.click(); }
  function pickGallery()  { galleryRef.current?.click(); }
  function clearFile() {
    setFile(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (pdfRef.current) pdfRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError(labels.fileRequired);
      return;
    }
    if (!propertyName.trim()) {
      setError(labels.propertyNameRequired);
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("taxType", taxType);
    fd.append("taxYear", String(taxYear));
    fd.append("propertyName", propertyName.trim());
    if (noticeDate) fd.append("noticeDate", noticeDate);
    try {
      const res = await fetch("/api/cases", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.message || `Upload failed (HTTP ${res.status})`);
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/cases"), 1500);
    } catch (err) {
      setError(err?.message || labels.generic);
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-2xl p-8 text-center space-y-2 text-white shadow-lift animate-rise"
        style={{ background: "var(--brand-gradient)" }}
      >
        <div className="mx-auto h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">✓</div>
        <p className="font-semibold text-lg">{labels.successTitle}</p>
        <p className="text-sm text-white/90">{labels.successBody}</p>
      </div>
    );
  }

  const uploadBtn = "flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--border)] p-4 hover:border-[var(--brand-500)] hover:bg-[var(--surface-2)] transition";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm block">
          <span className="text-[var(--fg-muted)] text-xs uppercase tracking-wider">{labels.taxType}</span>
          <select
            value={taxType}
            onChange={(e) => setTaxType(e.target.value)}
            className="w-full mt-1 p-3 rounded-xl text-base"
          >
            <option value="TF">{labels.TF}</option>
            <option value="CFE">{labels.CFE}</option>
            <option value="OTHER">{labels.OTHER}</option>
          </select>
        </label>
        <label className="text-sm block">
          <span className="text-[var(--fg-muted)] text-xs uppercase tracking-wider">{labels.taxYear}</span>
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value, 10))}
            className="w-full mt-1 p-3 rounded-xl text-base"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="text-sm block">
        <span className="text-[var(--fg-muted)] text-xs uppercase tracking-wider">{labels.propertyName}</span>
        <input
          type="text"
          required
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          placeholder={labels.propertyNamePlaceholder}
          className="w-full mt-1 p-3 rounded-xl text-base"
        />
        <span className="text-xs text-[var(--fg-muted)] mt-1 inline-block">{labels.propertyNameHint}</span>
      </label>

      <label className="text-sm block">
        <span className="text-[var(--fg-muted)] text-xs uppercase tracking-wider">{labels.noticeDate}</span>
        <input
          type="date"
          value={noticeDate}
          onChange={(e) => setNoticeDate(e.target.value)}
          className="w-full mt-1 p-3 rounded-xl text-base"
        />
      </label>

      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-2">{labels.documentLabel}</div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={pickPhoto} className={uploadBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 text-emerald-600"><path d="M3 8h3l2-2h8l2 2h3v12H3z" /><circle cx="12" cy="13" r="4" /></svg>
            <span className="text-xs font-medium">{labels.uploadPhoto}</span>
          </button>
          <button type="button" onClick={pickPdf} className={uploadBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 text-amber-600"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
            <span className="text-xs font-medium">{labels.uploadPdf}</span>
          </button>
          <button type="button" onClick={pickGallery} className={uploadBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 text-sky-600"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="m21 15-5-5-9 9" /></svg>
            <span className="text-xs font-medium">{labels.uploadGallery}</span>
          </button>
        </div>
      </div>

      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <input ref={pdfRef}     type="file" accept="application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <input ref={galleryRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />

      {file && (
        <div className="flex items-center justify-between gap-3 text-sm card p-3 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-emerald-600">📎</span>
            <span className="truncate">
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="text-xs text-rose-600 hover:underline shrink-0"
          >
            {labels.remove}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl whitespace-pre-line">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !file || !propertyName.trim()}
        className="btn-brand w-full p-3.5 rounded-xl text-base font-medium disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
