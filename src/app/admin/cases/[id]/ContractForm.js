"use client";

// Contract preparation. Two modes selectable via the source toggle:
//   - Template: auto-generate contract + mandate PDFs from the case data
//   - Upload:  attach your own pre-filled PDFs (one per document)
//
// The radio choice gates which sub-form is visible so it's unambiguous.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ContractForm({ caseId, defaults }) {
  const router = useRouter();
  const contractFileRef = useRef(null);
  const mandateFileRef = useRef(null);

  const [source, setSource] = useState("template"); // "template" | "upload"
  const [form, setForm] = useState({
    feeModel: defaults?.feeModel || "PERCENT",
    feePercent: defaults?.feePercent ?? 30,
    feeFlatAmount: defaults?.feeFlatAmount ?? "",
    propertyName: defaults?.propertyName || "",
    propertyAddress: defaults?.propertyAddress || "",
    propertyCity: defaults?.propertyCity || "",
    propertyZip: defaults?.propertyZip || "",
    cadastralRef: defaults?.cadastralRef || "",
    surface: defaults?.surface || "",
    useType: defaults?.useType || "",
    initialTaxAmount: defaults?.initialTaxAmount || "",
  });
  const [contractFile, setContractFile] = useState(null);
  const [mandateFile, setMandateFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (source === "upload" && (!contractFile || !mandateFile)) {
      setError("Please attach both the contract and mandate PDFs.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    // Fee model travels in both modes (used for invoicing later)
    fd.append("feeModel", form.feeModel);
    if (form.feeModel === "PERCENT" && form.feePercent) fd.append("feePercent", String(form.feePercent));
    if ((form.feeModel === "FLAT" || form.feeModel === "AUDIT") && form.feeFlatAmount) {
      fd.append("feeFlatAmount", String(form.feeFlatAmount));
    }
    if (source === "template") {
      for (const k of ["propertyName", "propertyAddress", "propertyCity", "propertyZip", "cadastralRef", "surface", "useType", "initialTaxAmount"]) {
        if (form[k] !== "" && form[k] != null) fd.append(k, String(form[k]));
      }
    } else {
      // Keep the property name as a friendly label even when uploading
      if (form.propertyName) fd.append("propertyName", form.propertyName);
      fd.append("contractFile", contractFile);
      fd.append("mandateFile", mandateFile);
    }
    const res = await fetch(`/api/cases/${caseId}/contract`, { method: "POST", body: fd });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "error");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-sm">
      {/* Source toggle */}
      <div className="grid sm:grid-cols-2 gap-2">
        <SourceCard
          active={source === "template"}
          onClick={() => setSource("template")}
          title="Generate from template"
          desc="Fill the property/fee form and we'll build a professional PDF for both contract and mandate."
          icon="📝"
        />
        <SourceCard
          active={source === "upload"}
          onClick={() => setSource("upload")}
          title="Upload my own PDFs"
          desc="Send your pre-filled contract and mandate PDFs as-is. The signature flow still embeds the audit page."
          icon="📎"
        />
      </div>

      {/* Property name (used in both modes) */}
      <Field label="Property name (visible to client)">
        <input value={form.propertyName} onChange={set("propertyName")} className={input} />
      </Field>

      {source === "template" && (
        <div className="space-y-3 card p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Property address" className="col-span-2">
              <input value={form.propertyAddress} onChange={set("propertyAddress")} className={input} />
            </Field>
            <Field label="City">
              <input value={form.propertyCity} onChange={set("propertyCity")} className={input} />
            </Field>
            <Field label="ZIP">
              <input value={form.propertyZip} onChange={set("propertyZip")} className={input} />
            </Field>
            <Field label="Cadastral ref">
              <input value={form.cadastralRef} onChange={set("cadastralRef")} className={input} />
            </Field>
            <Field label="Surface (m²)">
              <input type="number" step="0.01" value={form.surface} onChange={set("surface")} className={input} />
            </Field>
            <Field label="Use type">
              <input value={form.useType} onChange={set("useType")} placeholder="office, commercial, ..." className={input} />
            </Field>
            <Field label="Initial tax amount (€)">
              <input type="number" step="0.01" value={form.initialTaxAmount} onChange={set("initialTaxAmount")} className={input} />
            </Field>
          </div>
        </div>
      )}

      {source === "upload" && (
        <div className="card p-4 space-y-3">
          <p className="text-xs text-[var(--fg-muted)]">
            Both files are required. They will be sent to the client as-is for
            signature, and a SamTaxco attestation page is appended after signing.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FileButton
              label="Contract PDF *"
              file={contractFile}
              inputRef={contractFileRef}
              onChange={setContractFile}
            />
            <FileButton
              label="Mandate PDF *"
              file={mandateFile}
              inputRef={mandateFileRef}
              onChange={setMandateFile}
            />
          </div>
        </div>
      )}

      {/* Fee model is always relevant for the invoice down the line */}
      <div className="card p-4 space-y-2">
        <div className="font-medium">Fee model</div>
        <select value={form.feeModel} onChange={set("feeModel")} className={input}>
          <option value="PERCENT">% of savings</option>
          <option value="FLAT">Flat fee</option>
          <option value="AUDIT">Audit flat fee</option>
        </select>
        {form.feeModel === "PERCENT" ? (
          <Field label="Percent" className="mt-2">
            <input type="number" step="0.01" value={form.feePercent} onChange={set("feePercent")} className={input} />
          </Field>
        ) : (
          <Field label="Amount HT (€)" className="mt-2">
            <input type="number" step="0.01" value={form.feeFlatAmount} onChange={set("feeFlatAmount")} className={input} />
          </Field>
        )}
      </div>

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-brand w-full p-3 rounded-xl font-medium disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "Sending..." : "Prepare and send for signature →"}
      </button>
    </form>
  );
}

function SourceCard({ active, onClick, title, desc, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border-2 p-4 transition ${
        active
          ? "border-[var(--brand-500)] bg-emerald-50/40 dark:bg-emerald-950/20"
          : "border-[var(--border)] hover:border-[var(--brand-500)]/40"
      }`}
      aria-pressed={active}
    >
      <div className="flex items-start gap-3">
        <span className="h-9 w-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-base shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="font-medium text-sm flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-[var(--border)]"
              }`}
            />
            {title}
          </div>
          <div className="text-xs text-[var(--fg-muted)] mt-1 leading-relaxed">{desc}</div>
        </div>
      </div>
    </button>
  );
}

const input = "w-full mt-1 p-2.5 rounded-xl";

function Field({ label, className, children }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{label}</span>
      {children}
    </label>
  );
}

function FileButton({ label, file, inputRef, onChange }) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full text-left p-3 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand-500)] transition"
      >
        <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{label}</div>
        <div className="text-sm mt-0.5 truncate">
          {file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB` : "Click to attach PDF"}
        </div>
      </button>
    </div>
  );
}
