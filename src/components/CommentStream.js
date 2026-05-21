"use client";

// Live comments thread. Server-rendered initial list is hydrated, then we
// poll /api/cases/{id}/comments every few seconds while the tab is visible.
// Posts append optimistically and revalidate.
import { useEffect, useRef, useState } from "react";

const POLL_MS = 5000;

export default function CommentStream({ caseId, initial, me, placeholder, submit }) {
  const [comments, setComments] = useState(initial || []);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef(initial?.[initial.length - 1]?.id || null);
  const wakeRef = useRef(0);

  async function refresh() {
    try {
      const res = await fetch(`/api/cases/${caseId}/comments`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments);
      lastIdRef.current = data.comments[data.comments.length - 1]?.id || null;
    } catch (_) {
      // network blips are fine; next tick will retry
    }
  }

  // Poll while visible
  useEffect(() => {
    let timer = null;
    function tick() { refresh(); }
    function start() {
      stop();
      timer = setInterval(tick, POLL_MS);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    function onVis() {
      if (document.visibilityState === "visible") {
        // catch up immediately on resume, but not too aggressively
        if (Date.now() - wakeRef.current > 1000) {
          wakeRef.current = Date.now();
          refresh();
        }
        start();
      } else {
        stop();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    if (document.visibilityState === "visible") start();
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function onSubmit(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const tempId = "tmp-" + Date.now();
    setComments((cs) => [
      ...cs,
      {
        id: tempId,
        body: text,
        internal: false,
        createdAt: new Date().toISOString(),
        authorId: me.id,
        authorName: me.name || "—",
        authorRole: me.role || "USER",
        pending: true,
      },
    ]);
    setBody("");
    const res = await fetch(`/api/cases/${caseId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setSending(false);
    if (res.ok) refresh();
    else setComments((cs) => cs.filter((c) => c.id !== tempId));
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {comments.length === 0 && (
          <li className="text-sm text-[var(--fg-muted)] text-center py-4">—</li>
        )}
        {comments.map((cm) => {
          const isMe = cm.authorId === me.id;
          const isStaff = cm.authorRole === "ADMIN" || cm.authorRole === "EMPLOYEE";
          return (
            <li
              key={cm.id}
              className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm transition-opacity ${
                cm.pending ? "opacity-60" : ""
              } ${
                isMe
                  ? "ml-auto bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40"
                  : isStaff
                  ? "bg-sky-50 border border-sky-200 dark:bg-sky-950/30 dark:border-sky-900/40"
                  : "bg-[var(--surface-1)] border border-[var(--border)]"
              }`}
            >
              <div className="text-xs text-[var(--fg-muted)] mb-1 flex items-center gap-2">
                <span>{cm.authorName}</span>
                {isStaff && (
                  <span className="text-[10px] uppercase tracking-wider bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-1.5 py-0.5 rounded-full">
                    SamTaxco
                  </span>
                )}
                <span>· {new Date(cm.createdAt).toLocaleString("fr-FR", { timeStyle: "short", dateStyle: "short" })}</span>
              </div>
              <div className="text-sm whitespace-pre-line">{cm.body}</div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={onSubmit} className="card p-2.5 flex flex-col sm:flex-row gap-2 items-end">
        <textarea
          rows={2}
          placeholder={placeholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full p-2.5 text-sm bg-transparent border-0 resize-none focus:outline-none"
          style={{ borderRadius: 0 }}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="btn-brand rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:shadow-none shrink-0 self-end"
        >
          {sending ? "…" : submit}
        </button>
      </form>
    </div>
  );
}
