"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditForm({ initial }) {
  const router = useRouter();
  const [form, setForm] = useState({
    titleFr: initial.titleFr,
    titleEn: initial.titleEn,
    contentFr: initial.contentFr,
    contentEn: initial.contentEn,
    order: initial.order,
    isActive: initial.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/presentation/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, order: Number(form.order) }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Erreur — vérifiez les champs.");
      return;
    }
    router.push("/admin/presentation");
    router.refresh();
  }

  async function onDelete() {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/admin/presentation/${initial.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setError("Suppression impossible.");
      setConfirmDelete(false);
      return;
    }
    router.push("/admin/presentation");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Titre FR</span>
          <input value={form.titleFr} onChange={set("titleFr")} className="w-full mt-1 p-2.5 rounded-xl" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Titre EN</span>
          <input value={form.titleEn} onChange={set("titleEn")} className="w-full mt-1 p-2.5 rounded-xl" />
        </label>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Contenu FR (markdown)</span>
        <textarea
          rows={8}
          value={form.contentFr}
          onChange={set("contentFr")}
          className="w-full mt-1 p-2.5 rounded-xl"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Contenu EN (markdown)</span>
        <textarea
          rows={8}
          value={form.contentEn}
          onChange={set("contentEn")}
          className="w-full mt-1 p-2.5 rounded-xl"
        />
      </label>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Ordre</span>
          <input
            type="number"
            value={form.order}
            onChange={set("order")}
            className="w-24 mt-1 p-2.5 rounded-xl"
          />
        </label>
        <label className="flex items-center gap-2 mt-5">
          <input type="checkbox" checked={form.isActive} onChange={set("isActive")} className="h-4 w-4 accent-[color:var(--brand-500)]" />
          <span>Active</span>
        </label>
      </div>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        {confirmDelete ? (
          <span className="inline-flex gap-1.5">
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm disabled:opacity-50"
            >
              {deleting ? "..." : "Confirmer la suppression"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="btn-soft rounded-full px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-full border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 px-4 py-2 text-sm hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            Supprimer la slide
          </button>
        )}

        <button
          type="submit"
          disabled={saving || confirmDelete}
          className="btn-brand rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-50 disabled:shadow-none"
        >
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
