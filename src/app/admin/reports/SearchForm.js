"use client";

// Reports search filter form. Submits as a plain GET so filter state ends up
// in the URL — server component re-renders with the new params and runs the
// query.
import { useState } from "react";

export default function SearchForm({ initial, statuses, taxTypes, employees, fr }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    q: initial.q || "",
    dateField: initial.dateField || "createdAt",
    start: toDateInput(initial.start),
    end: toDateInput(initial.end),
    status: initial.status || [],
    taxType: initial.taxType || [],
    managerId: initial.managerId || "",
    archived: initial.archived === true ? "1" : initial.archived === false ? "0" : "",
    minSavings: initial.minSavings ?? "",
    maxSavings: initial.maxSavings ?? "",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleArr = (k, val) =>
    setForm((p) => {
      const arr = new Set(p[k]);
      arr.has(val) ? arr.delete(val) : arr.add(val);
      return { ...p, [k]: [...arr] };
    });

  function reset() {
    setForm({
      q: "", dateField: "createdAt", start: "", end: "",
      status: [], taxType: [], managerId: "", archived: "",
      minSavings: "", maxSavings: "",
    });
  }

  return (
    <form action="/admin/reports" method="GET" className="card p-4 space-y-3">
      {/* Quick search line */}
      <div className="flex gap-2 items-center">
        <input
          name="q"
          value={form.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder={fr ? "Rechercher (référence, ville, client, e-mail...)" : "Search (reference, city, client, email...)"}
          className="flex-1 p-2.5 rounded-xl text-sm"
        />
        <button type="submit" className="btn-brand rounded-full px-4 py-2 text-sm font-medium">
          {fr ? "Rechercher" : "Search"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn-soft rounded-full px-3 py-2 text-sm"
        >
          {open ? (fr ? "Moins" : "Less") : (fr ? "Avancée" : "Advanced")}
        </button>
      </div>

      {open && (
        <div className="space-y-4 pt-2 border-t border-[var(--border)]">
          {/* Date range */}
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Date — champ" : "Date field"}</span>
              <select
                name="dateField"
                value={form.dateField}
                onChange={(e) => set("dateField", e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl"
              >
                <option value="createdAt">{fr ? "Création du dossier" : "Case created"}</option>
                <option value="noticeDate">{fr ? "Date de l'avis" : "Notice date"}</option>
                <option value="resultAt">{fr ? "Date du résultat" : "Result date"}</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Du" : "From"}</span>
              <input
                type="date"
                name="start"
                value={form.start}
                onChange={(e) => set("start", e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Au" : "To"}</span>
              <input
                type="date"
                name="end"
                value={form.end}
                onChange={(e) => set("end", e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl"
              />
            </label>
          </div>

          {/* Status multi-select */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-1.5">{fr ? "Statuts" : "Statuses"}</div>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s) => {
                const on = form.status.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleArr("status", s)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border ${
                      on
                        ? "btn-brand border-transparent"
                        : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand-500)]"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="status" value={form.status.join(",")} />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {/* Tax type */}
            <div>
              <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-1.5">{fr ? "Type d'impôt" : "Tax type"}</div>
              <div className="flex flex-wrap gap-1.5">
                {taxTypes.map((tx) => {
                  const on = form.taxType.includes(tx);
                  return (
                    <button
                      type="button"
                      key={tx}
                      onClick={() => toggleArr("taxType", tx)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border ${
                        on
                          ? "btn-brand border-transparent"
                          : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand-500)]"
                      }`}
                    >
                      {tx}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="taxType" value={form.taxType.join(",")} />
            </div>

            {/* Manager */}
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Responsable" : "Manager"}</span>
              <select
                name="managerId"
                value={form.managerId}
                onChange={(e) => set("managerId", e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl"
              >
                <option value="">{fr ? "Tous" : "All"}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} {e.role === "ADMIN" ? "★" : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* Archived */}
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Archivés" : "Archived"}</span>
              <select
                name="archived"
                value={form.archived}
                onChange={(e) => set("archived", e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl"
              >
                <option value="">{fr ? "Tous" : "All"}</option>
                <option value="0">{fr ? "Actifs uniquement" : "Active only"}</option>
                <option value="1">{fr ? "Archivés uniquement" : "Archived only"}</option>
              </select>
            </label>
          </div>

          {/* Savings range */}
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Économies min (€)" : "Min savings (€)"}</span>
              <input
                type="number"
                name="minSavings"
                value={form.minSavings}
                onChange={(e) => set("minSavings", e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl"
                placeholder="0"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Économies max (€)" : "Max savings (€)"}</span>
              <input
                type="number"
                name="maxSavings"
                value={form.maxSavings}
                onChange={(e) => set("maxSavings", e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl"
                placeholder="∞"
              />
            </label>
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
            >
              {fr ? "Réinitialiser les filtres" : "Reset filters"}
            </button>
            <button type="submit" className="btn-brand rounded-full px-5 py-2 text-sm font-medium">
              {fr ? "Appliquer" : "Apply"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function toDateInput(d) {
  if (!d) return "";
  if (typeof d === "string") return d;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
