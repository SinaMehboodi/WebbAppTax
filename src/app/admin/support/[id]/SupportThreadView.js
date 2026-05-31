"use client";

// Interactive view for one support thread. Staff messages render on the right
// (us), visitor messages on the left. Polls the public thread endpoint so new
// visitor messages appear live. Reply box gated by canReply; status controls by
// canManage (both decided server-side).
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT, useLocale } from "@/components/I18nProvider";
import { supportStatusSolid, avatarSolid, initialsOf, roleSolid } from "@/lib/uiColors";

const STATUSES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

export default function SupportThreadView({ id, token, meta, initialMessages, canReply, canManage }) {
  const t = useT();
  const locale = useLocale();
  const fr = locale === "fr";
  const router = useRouter();

  const [messages, setMessages] = useState(initialMessages || []);
  const [status, setStatus] = useState(meta.status);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const who = meta.name || meta.email || (fr ? "Visiteur anonyme" : "Anonymous visitor");

  const loadThread = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/thread/${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      if (data.thread?.status) setStatus(data.thread.status);
    } catch {}
  }, [token]);

  // Live-refresh new visitor messages.
  useEffect(() => {
    const iv = setInterval(loadThread, 7000);
    return () => clearInterval(iv);
  }, [loadThread]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function reply(e) {
    e?.preventDefault?.();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/support/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setError(t("support.error"));
        setBusy(false);
        return;
      }
      setDraft("");
      setMessages((m) => [
        ...m,
        { id: `local-${Date.now()}`, body, fromStaff: true, createdAt: new Date().toISOString() },
      ]);
      setStatus("PENDING");
      await loadThread();
      router.refresh();
    } catch {
      setError(t("support.error"));
    }
    setBusy(false);
  }

  async function setThreadStatus(next, assignToMe = false) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/support/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, assignToMe }),
      });
      if (!res.ok) {
        setError(t("support.error"));
      } else {
        setStatus(next);
        router.refresh();
      }
    } catch {
      setError(t("support.error"));
    }
    setBusy(false);
  }

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-4 animate-rise">
      <Link href="/admin/support" className="text-sm underline text-[var(--fg-muted)]">
        ← {t("common.back")}
      </Link>

      {/* Thread header */}
      <header className="card p-4 flex items-start gap-3">
        <span className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${avatarSolid(who)}`}>
          {meta.name ? initialsOf(...meta.name.split(" ")) : "👤"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate">{who}</h1>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${supportStatusSolid(status)}`}>
              {t(`supportStatus.${status}`)}
            </span>
          </div>
          {meta.subject && <div className="text-sm text-[var(--fg-muted)]">{meta.subject}</div>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)] mt-1.5">
            {meta.email && <a href={`mailto:${meta.email}`} className="hover:underline">{meta.email}</a>}
            <span>{t("support.opened")} {new Date(meta.createdAt).toLocaleString(fr ? "fr-FR" : "en-GB")}</span>
            {meta.assignedTo && <span>· {t("support.assignedTo")} {meta.assignedTo}</span>}
            {meta.ipAddress && <span className="font-mono opacity-70">· {meta.ipAddress}</span>}
          </div>
          {meta.linkedUser && (
            <div className="mt-2">
              <Link
                href={`/admin/users?q=${encodeURIComponent(meta.linkedUser.name)}`}
                className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${roleSolid(meta.linkedUser.role)}`}
              >
                {t("support.linkedAccount")}: {meta.linkedUser.name}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Status controls */}
      {canManage && (
        <div className="card p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--fg-muted)] mr-1">{t("support.statusLabel")}:</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy || s === status}
              onClick={() => setThreadStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-100 ${
                s === status ? supportStatusSolid(s) : "border border-[var(--border)] hover:border-[var(--brand-500)]"
              }`}
            >
              {t(`supportStatus.${s}`)}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => setThreadStatus(status, true)}
            className="text-xs px-3 py-1.5 rounded-full btn-soft font-medium ml-auto"
          >
            {t("support.assignMe")}
          </button>
        </div>
      )}

      {/* Transcript */}
      <div ref={scrollRef} className="card p-3 space-y-2 max-h-[50vh] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.fromStaff ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.fromStaff
                  ? "btn-brand text-white"
                  : "bg-[var(--surface-2)] border border-[var(--border)]"
              }`}
            >
              <div className="text-[10px] opacity-70 mb-0.5">
                {m.fromStaff ? t("support.team") : who} · {new Date(m.createdAt).toLocaleString(fr ? "fr-FR" : "en-GB")}
              </div>
              <div className="whitespace-pre-wrap break-words">{m.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply composer */}
      {canReply ? (
        <form onSubmit={reply} className="card p-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" && (e.metaKey || e.ctrlKey))) reply(e);
            }}
            rows={3}
            placeholder={t("support.replyPlaceholder")}
            className="w-full px-3 py-2 rounded-xl text-sm resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            {error ? <p className="text-xs text-rose-600">{error}</p> : <span className="text-[11px] text-[var(--fg-muted)]">⌘/Ctrl + ↵</span>}
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="btn-brand rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy ? t("support.sending") : t("support.replySend")}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-[var(--fg-muted)] text-center py-2">{t("support.noReplyPerm")}</p>
      )}
    </div>
  );
}
