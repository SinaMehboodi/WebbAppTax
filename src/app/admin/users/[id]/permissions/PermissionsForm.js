"use client";

// Tabs (one per category) + red/green light toggles inside each tab.
// Sticky save bar at the bottom — never lose your changes when scrolling.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PermissionsForm({ userId, initial, groups, fr }) {
  const router = useRouter();
  const [tab, setTab] = useState(groups[0].key);
  const [perms, setPerms] = useState(new Set(initial));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = !setsEqual(perms, new Set(initial));

  function toggle(key) {
    setPerms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setSaved(false);
  }

  function setAllInGroup(group, value) {
    setPerms((prev) => {
      const next = new Set(prev);
      for (const p of group.perms) value ? next.add(p.key) : next.delete(p.key);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch(`/api/admin/users/${userId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: [...perms] }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  const active = groups.find((g) => g.key === tab) || groups[0];
  const activeOn = active.perms.filter((p) => perms.has(p.key)).length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--border)]">
        {groups.map((g) => {
          const on = g.perms.filter((p) => perms.has(p.key)).length;
          const isActive = g.key === tab;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setTab(g.key)}
              className={`relative px-3 py-2 text-sm font-medium -mb-px border-b-2 transition ${
                isActive
                  ? "border-[var(--brand-500)] text-[var(--fg)]"
                  : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              <span className="mr-1.5">{g.icon}</span>
              {fr ? g.labelFr : g.labelEn}
              <span className={`ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] rounded-full ${
                on > 0
                  ? "bg-emerald-500 text-white"
                  : "bg-[var(--surface-2)] text-[var(--fg-muted)] border border-[var(--border)]"
              }`}>
                {on}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active tab */}
      <section className="card p-5 space-y-1">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-semibold">{fr ? active.labelFr : active.labelEn}</h2>
            <div className="text-xs text-[var(--fg-muted)] mt-0.5">
              {activeOn} / {active.perms.length} {fr ? "accordées" : "granted"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAllInGroup(active, true)}
              className="text-[10px] uppercase tracking-wider text-emerald-700 hover:underline"
            >
              {fr ? "Tout activer" : "Enable all"}
            </button>
            <span className="text-[var(--fg-muted)]">·</span>
            <button
              type="button"
              onClick={() => setAllInGroup(active, false)}
              className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] hover:underline"
            >
              {fr ? "Tout désactiver" : "Disable all"}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {active.perms.map((p) => {
            const on = perms.has(p.key);
            return (
              <li key={p.key} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{fr ? p.labelFr : p.labelEn}</div>
                  <div className="font-mono text-[10px] text-[var(--fg-muted)] mt-0.5">{p.key}</div>
                </div>
                <LightToggle on={on} onChange={() => toggle(p.key)} fr={fr} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-[var(--surface-0)] border-t border-[var(--border)] flex items-center justify-between gap-3">
        <div className="text-xs text-[var(--fg-muted)]">
          {saved
            ? <span className="text-emerald-600">✓ {fr ? "Enregistré" : "Saved"}</span>
            : dirty
            ? (fr ? "Modifications non enregistrées" : "Unsaved changes")
            : (fr ? `${perms.size} permission(s) au total` : `${perms.size} permission(s) total`)}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="btn-brand rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "…" : (fr ? "Enregistrer" : "Save permissions")}
        </button>
      </div>
    </div>
  );
}

// Red/green light pill — visually unambiguous.
function LightToggle({ on, onChange, fr }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      className={`shrink-0 inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 border transition ${
        on
          ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200"
          : "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300"
      }`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${
          on
            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
            : "bg-rose-500"
        }`}
      />
      <span className="text-[11px] uppercase tracking-wider font-semibold">
        {on ? (fr ? "Activé" : "On") : (fr ? "Bloqué" : "Off")}
      </span>
    </button>
  );
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
