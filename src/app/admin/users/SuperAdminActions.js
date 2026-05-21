"use client";

// SUPER_ADMIN-only user actions: edit name/email, reset password (returns the
// new password as a one-time copy box), hard-delete account.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminActions({ user, fr }) {
  const router = useRouter();
  const [open, setOpen] = useState(null); // "edit" | "reset" | "delete" | null
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email });
  const [pwd, setPwd] = useState("");
  const [resetResult, setResetResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() { setOpen(null); setError(""); setPwd(""); setResetResult(""); }

  async function saveEdit() {
    setBusy(true); setError("");
    const res = await fetch(`/api/admin/users/${user.id}/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d.error === "email.taken") setError(fr ? "Cet e-mail est déjà utilisé." : "This email is already in use.");
      else setError(d.error || "error");
      return;
    }
    close();
    router.refresh();
  }

  async function doReset() {
    setBusy(true); setError(""); setResetResult("");
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pwd ? { password: pwd } : {}),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "error");
      return;
    }
    const d = await res.json();
    setResetResult(d.password);
  }

  async function doDelete() {
    setBusy(true); setError("");
    const res = await fetch(`/api/admin/users/${user.id}/delete`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "error");
      return;
    }
    close();
    router.refresh();
  }

  if (!open) {
    return (
      <span className="inline-flex gap-1">
        <button
          type="button"
          onClick={() => setOpen("edit")}
          className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
        >
          {fr ? "Éditer" : "Edit"}
        </button>
        <span className="text-[var(--fg-muted)]">·</span>
        <button
          type="button"
          onClick={() => setOpen("reset")}
          className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
        >
          {fr ? "Mot de passe" : "Password"}
        </button>
        <span className="text-[var(--fg-muted)]">·</span>
        <button
          type="button"
          onClick={() => setOpen("delete")}
          className="text-[10px] text-rose-600 hover:underline"
        >
          {fr ? "Supprimer" : "Delete"}
        </button>
      </span>
    );
  }

  // Render a small modal for each action
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card p-5 w-full max-w-md space-y-3 animate-rise">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {open === "edit"   && (fr ? "Modifier l'utilisateur" : "Edit user")}
            {open === "reset"  && (fr ? "Réinitialiser le mot de passe" : "Reset password")}
            {open === "delete" && (fr ? "Supprimer définitivement" : "Permanently delete")}
          </h2>
          <button type="button" onClick={close} className="text-[var(--fg-muted)] text-xl leading-none">×</button>
        </div>

        {open === "edit" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Prénom" : "First name"}</span>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full mt-1 p-2.5 rounded-xl" />
              </label>
              <label className="block text-sm">
                <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Nom" : "Last name"}</span>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full mt-1 p-2.5 rounded-xl" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mt-1 p-2.5 rounded-xl" />
            </label>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className="btn-soft rounded-full px-4 py-2 text-sm">{fr ? "Annuler" : "Cancel"}</button>
              <button type="button" onClick={saveEdit} disabled={busy} className="btn-brand rounded-full px-5 py-2 text-sm disabled:opacity-50">
                {busy ? "…" : (fr ? "Enregistrer" : "Save")}
              </button>
            </div>
          </div>
        )}

        {open === "reset" && (
          <div className="space-y-3">
            {!resetResult ? (
              <>
                <p className="text-xs text-[var(--fg-muted)]">
                  {fr
                    ? "Définissez un mot de passe ou laissez vide pour générer un mot de passe aléatoire fort. Toutes les sessions actives seront détruites."
                    : "Set a password or leave empty to generate a strong random one. All active sessions will be killed."}
                </p>
                <label className="block text-sm">
                  <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Nouveau mot de passe (facultatif)" : "New password (optional)"}</span>
                  <input
                    type="text"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    minLength={8}
                    placeholder={fr ? "Vide = généré" : "Empty = generated"}
                    className="w-full mt-1 p-2.5 rounded-xl font-mono text-sm"
                  />
                </label>
                {error && <p className="text-xs text-rose-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} className="btn-soft rounded-full px-4 py-2 text-sm">{fr ? "Annuler" : "Cancel"}</button>
                  <button type="button" onClick={doReset} disabled={busy} className="btn-brand rounded-full px-5 py-2 text-sm disabled:opacity-50">
                    {busy ? "…" : (fr ? "Réinitialiser" : "Reset")}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  ✓ {fr ? "Mot de passe modifié. Transmettez-le par un canal sécurisé :" : "Password updated. Share it via a secure channel:"}
                </p>
                <div className="font-mono text-base bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 text-center select-all">
                  {resetResult}
                </div>
                <p className="text-[10px] text-[var(--fg-muted)]">
                  {fr ? "Ce mot de passe ne sera plus affiché. Copiez-le maintenant." : "This password won't be shown again. Copy it now."}
                </p>
                <div className="flex justify-end">
                  <button type="button" onClick={close} className="btn-brand rounded-full px-5 py-2 text-sm">{fr ? "Fermer" : "Close"}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {open === "delete" && (
          <div className="space-y-3">
            <p className="text-sm text-rose-700 dark:text-rose-300">
              {fr
                ? `Cette action est irréversible. Tous les dossiers, documents et données de ${user.firstName} ${user.lastName} seront détruits.`
                : `This is irreversible. All cases, documents and data for ${user.firstName} ${user.lastName} will be destroyed.`}
            </p>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className="btn-soft rounded-full px-4 py-2 text-sm">{fr ? "Annuler" : "Cancel"}</button>
              <button type="button" onClick={doDelete} disabled={busy} className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-sm font-medium disabled:opacity-50">
                {busy ? "…" : (fr ? "Supprimer définitivement" : "Delete permanently")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
