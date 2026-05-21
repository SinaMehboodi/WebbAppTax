"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEmployeeButton({ fr }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/users/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d.error === "email.taken") setError(fr ? "Cet e-mail est déjà utilisé." : "This email is already in use.");
      else setError(d.details?.[0] || (fr ? "Erreur — vérifiez les champs." : "Error — check the fields."));
      return;
    }
    const data = await res.json();
    setOpen(false);
    setForm({ firstName: "", lastName: "", email: "", password: "" });
    router.refresh();
    // Jump to the new employee's permissions page so the admin can grant access
    if (data.user?.id) router.push(`/admin/users/${data.user.id}/permissions`);
  }

  function randomPassword() {
    const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "";
    for (let i = 0; i < 14; i++) pwd += alphabet[Math.floor(Math.random() * alphabet.length)];
    setForm((p) => ({ ...p, password: pwd }));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-brand rounded-full px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        {fr ? "Nouvel employé" : "New employee"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="card p-5 w-full max-w-md space-y-3 animate-rise">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{fr ? "Créer un employé" : "Create employee"}</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-[var(--fg-muted)] text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Prénom" : "First name"} *</span>
            <input required value={form.firstName} onChange={set("firstName")} className="w-full mt-1 p-2.5 rounded-xl" />
          </label>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Nom" : "Last name"} *</span>
            <input required value={form.lastName} onChange={set("lastName")} className="w-full mt-1 p-2.5 rounded-xl" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Email *</span>
          <input required type="email" value={form.email} onChange={set("email")} className="w-full mt-1 p-2.5 rounded-xl" />
        </label>

        <label className="block text-sm">
          <span className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Mot de passe" : "Password"} *</span>
            <button type="button" onClick={randomPassword} className="text-[10px] text-[var(--brand-600)] hover:underline">
              {fr ? "Générer" : "Generate"}
            </button>
          </span>
          <input
            required
            type="text"
            value={form.password}
            onChange={set("password")}
            minLength={8}
            className="w-full mt-1 p-2.5 rounded-xl font-mono text-sm"
            placeholder={fr ? "Au moins 8 caractères" : "At least 8 characters"}
          />
          <span className="text-[10px] text-[var(--fg-muted)] mt-1 inline-block">
            {fr ? "Transmettez ce mot de passe à l'employé — il pourra le changer plus tard." : "Share this password with the employee — they can change it later."}
          </span>
        </label>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
            {error}
          </p>
        )}

        <p className="text-[10px] text-[var(--fg-muted)]">
          {fr
            ? "L'employé sera créé sans permission. Vous serez redirigé vers son écran de permissions juste après."
            : "The employee is created with no permissions. You'll be redirected to their permissions screen next."}
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn-soft rounded-full px-4 py-2 text-sm font-medium">
            {fr ? "Annuler" : "Cancel"}
          </button>
          <button type="submit" disabled={busy} className="btn-brand rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50">
            {busy ? "…" : (fr ? "Créer & paramétrer" : "Create & configure")}
          </button>
        </div>
      </form>
    </div>
  );
}
