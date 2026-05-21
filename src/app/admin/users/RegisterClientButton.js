"use client";

// Permission-gated button on /admin/users. Opens a modal where staff fills
// the client's basic info; the server creates the USER with no password and
// emails them an activation link.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterClientButton({ fr }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", companyName: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setHint(null);
    const res = await fetch("/api/admin/users/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        phone: form.phone.trim() || null,
        companyName: form.companyName.trim() || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d.error === "email.taken") {
        setError(fr ? "Cet e-mail est déjà associé à un compte." : "This email is already in use.");
      } else {
        setError(d.details?.[0] || (fr ? "Erreur — vérifiez les champs." : "Error — check the fields."));
      }
      return;
    }
    const data = await res.json();
    setHint(data.onboardingHint || null);
    setForm({ firstName: "", lastName: "", email: "", phone: "", companyName: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-soft rounded-full px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {fr ? "Inscrire un client" : "Register a client"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="card p-5 w-full max-w-md space-y-3 animate-rise">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{fr ? "Inscrire un client" : "Register a client"}</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-[var(--fg-muted)] text-xl leading-none">×</button>
        </div>

        <p className="text-xs text-[var(--fg-muted)]">
          {fr
            ? "Le client recevra un e-mail avec un lien d'activation (valide 7 jours). Il choisira son propre mot de passe."
            : "The client gets an email with an activation link (valid 7 days). They'll set their own password."}
        </p>

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
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Téléphone" : "Phone"}</span>
          <input value={form.phone} onChange={set("phone")} className="w-full mt-1 p-2.5 rounded-xl" />
        </label>

        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{fr ? "Société / SCI" : "Company / SCI"}</span>
          <input value={form.companyName} onChange={set("companyName")} className="w-full mt-1 p-2.5 rounded-xl" />
        </label>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 p-3 rounded-xl">
            {error}
          </p>
        )}

        {hint && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 p-3 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
            <p>
              ✓ {fr
                ? "Client inscrit. Un e-mail d'activation a été envoyé."
                : "Client registered. An activation email was sent."}
            </p>
            <p className="text-[10px] opacity-80">
              {fr ? "Lien (dev, à transmettre manuellement si l'email n'arrive pas) :" : "Link (dev — share manually if email doesn't arrive):"}
            </p>
            <code className="block break-all text-[10px] bg-white/60 dark:bg-black/30 p-2 rounded">{hint.link}</code>
            <button
              type="button"
              onClick={() => { setOpen(false); setHint(null); }}
              className="btn-brand rounded-full px-3 py-1 text-xs font-medium mt-1"
            >
              {fr ? "Fermer" : "Close"}
            </button>
          </div>
        )}

        {!hint && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn-soft rounded-full px-4 py-2 text-sm font-medium">
              {fr ? "Annuler" : "Cancel"}
            </button>
            <button type="submit" disabled={busy} className="btn-brand rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50">
              {busy ? "…" : (fr ? "Envoyer l'invitation" : "Send invitation")}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
