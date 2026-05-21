"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSlideButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    titleFr: "",
    titleEn: "",
    contentFr: "",
    contentEn: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function autoSlug(value) {
    // Strip accents + lowercase + replace non a-z0-9 with dashes
    return value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const slug = form.slug || autoSlug(form.titleEn || form.titleFr);
    const res = await fetch("/api/admin/presentation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, slug }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d.error === "slug.taken") setError("Ce slug existe déjà / Slug already exists.");
      else setError(d.details?.[0] || "Erreur — vérifiez tous les champs.");
      return;
    }
    setOpen(false);
    setForm({ slug: "", titleFr: "", titleEn: "", contentFr: "", contentEn: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-brand rounded-full px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        Nouvelle slide
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="card p-5 w-full max-w-lg space-y-3 animate-rise"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Nouvelle slide</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-[var(--fg-muted)] text-xl leading-none">×</button>
        </div>

        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Slug (auto si vide)</span>
          <input
            value={form.slug}
            onChange={set("slug")}
            placeholder={form.titleEn ? autoSlug(form.titleEn) : "ma-slide"}
            className="w-full mt-1 p-2.5 rounded-xl font-mono text-xs"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Titre FR *</span>
            <input required value={form.titleFr} onChange={set("titleFr")} className="w-full mt-1 p-2.5 rounded-xl" />
          </label>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Titre EN *</span>
            <input required value={form.titleEn} onChange={set("titleEn")} className="w-full mt-1 p-2.5 rounded-xl" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Contenu FR (markdown) *</span>
          <textarea required rows={5} value={form.contentFr} onChange={set("contentFr")} className="w-full mt-1 p-2.5 rounded-xl" />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Contenu EN (markdown) *</span>
          <textarea required rows={5} value={form.contentEn} onChange={set("contentEn")} className="w-full mt-1 p-2.5 rounded-xl" />
        </label>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="btn-soft rounded-full px-4 py-2 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-brand rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? "..." : "Créer la slide"}
          </button>
        </div>
      </form>
    </div>
  );
}
