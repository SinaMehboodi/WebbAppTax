"use client";

// Multi-employee assignment widget for the admin case workspace.
//   - Shows current assignees with a "primary" star for the manager
//   - "Assign myself" button (if user has CASE_ASSIGN_SELF)
//   - Add-others picker (if user has CASE_ASSIGN_OTHERS)
//   - Remove button per assignee
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssignmentManager({
  caseId,
  meId,
  primaryId,
  assignees,
  staffOptions,
  canSelf,
  canOthers,
  fr,
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const assignedIds = new Set(assignees.map((a) => a.id));
  const availableOthers = staffOptions.filter((u) => !assignedIds.has(u.id) && u.id !== meId);
  const meAlreadyAssigned = assignedIds.has(meId);

  async function add(userId, role = "team") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/cases/${caseId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "error");
      return;
    }
    setPicking(false);
    router.refresh();
  }

  async function remove(userId) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/cases/${caseId}/assignments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "error");
      return;
    }
    router.refresh();
  }

  async function setPrimary(userId) {
    // Re-add with role=primary so it sets the manager
    await add(userId, "primary");
  }

  return (
    <div className="space-y-3">
      {assignees.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">
          {fr ? "Aucun responsable affecté pour le moment." : "No one assigned yet."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {assignees.map((a) => {
            const isPrimary = a.id === primaryId;
            const isMe = a.id === meId;
            const canRemove = isMe ? canSelf : canOthers;
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                      isPrimary
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-[var(--surface-2)] text-[var(--fg-muted)] border border-[var(--border)]"
                    }`}
                    title={isPrimary ? (fr ? "Responsable principal" : "Primary manager") : ""}
                  >
                    {(a.firstName?.[0] || "?") + (a.lastName?.[0] || "")}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {a.firstName} {a.lastName}
                      {isPrimary && <span className="ml-1.5 text-amber-600">★</span>}
                      {isMe && <span className="ml-1.5 text-xs text-[var(--fg-muted)]">({fr ? "moi" : "you"})</span>}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">{a.role}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!isPrimary && canOthers && (
                    <button
                      type="button"
                      onClick={() => setPrimary(a.id)}
                      disabled={busy}
                      className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
                    >
                      {fr ? "Principal" : "Primary"}
                    </button>
                  )}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      disabled={busy}
                      className="rounded-full border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-[10px] hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      {fr ? "Retirer" : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
        {canSelf && !meAlreadyAssigned && (
          <button
            type="button"
            onClick={() => add(meId)}
            disabled={busy}
            className="btn-soft rounded-full px-3 py-1.5 text-xs font-medium"
          >
            {fr ? "+ M'affecter à ce dossier" : "+ Assign myself"}
          </button>
        )}
        {canOthers && availableOthers.length > 0 && !picking && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            disabled={busy}
            className="btn-soft rounded-full px-3 py-1.5 text-xs font-medium"
          >
            {fr ? "+ Ajouter un membre" : "+ Add member"}
          </button>
        )}
      </div>

      {picking && (
        <div className="flex gap-2">
          <select
            id="assign-pick"
            className="flex-1 p-2 rounded-xl text-sm"
            defaultValue=""
          >
            <option value="" disabled>{fr ? "Choisir une personne…" : "Pick someone…"}</option>
            {availableOthers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} · {u.role}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const sel = document.getElementById("assign-pick");
              if (sel?.value) add(sel.value);
            }}
            disabled={busy}
            className="btn-brand rounded-full px-3 py-1.5 text-xs font-medium"
          >
            {fr ? "Ajouter" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setPicking(false)}
            disabled={busy}
            className="btn-soft rounded-full px-3 py-1.5 text-xs font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
