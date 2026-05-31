"use client";

// Floating help widget for public pages (login / signup). A visitor who can't
// log in still has a channel to the company: they write here, we store an
// unguessable thread token in localStorage, and they can poll for our reply on
// any later visit. Back-office staff answer from /admin/support.
import { useCallback, useEffect, useRef, useState } from "react";
import { useT, useLocale } from "./I18nProvider";
import { supportStatusSoft } from "@/lib/uiColors";

const TOKEN_KEY = "stx_support_token";

export default function SupportWidget() {
  const t = useT();
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  // Restore an existing conversation token on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
    } catch {}
  }, []);

  const loadThread = useCallback(async (tk) => {
    try {
      const res = await fetch(`/api/support/thread/${encodeURIComponent(tk)}`);
      if (res.status === 404) {
        // token no longer valid — reset to the intro form
        try { localStorage.removeItem(TOKEN_KEY); } catch {}
        setToken(null);
        setMessages([]);
        setStatus(null);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      setStatus(data.thread?.status || null);
    } catch {}
  }, []);

  // Poll the thread while the panel is open.
  useEffect(() => {
    if (!open || !token) return;
    loadThread(token);
    const iv = setInterval(() => loadThread(token), 5000);
    return () => clearInterval(iv);
  }, [open, token, loadThread]);

  // Keep the transcript pinned to the latest message.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  async function submit(e) {
    e?.preventDefault?.();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          token
            ? { token, message: body }
            : { name: name.trim(), email: email.trim(), message: body, locale }
        ),
      });
      if (!res.ok) {
        setError(t("support.error"));
        setBusy(false);
        return;
      }
      const data = await res.json();
      if (data.token) {
        try { localStorage.setItem(TOKEN_KEY, data.token); } catch {}
        setToken(data.token);
      }
      setDraft("");
      // Optimistic: show our message immediately, then refresh from server.
      setMessages((m) => [
        ...m,
        { id: `local-${Date.now()}`, body, fromStaff: false, createdAt: new Date().toISOString() },
      ]);
      if (data.token) loadThread(data.token);
    } catch {
      setError(t("support.error"));
    }
    setBusy(false);
  }

  function startNew() {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    setToken(null);
    setMessages([]);
    setStatus(null);
    setDraft("");
  }

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("support.widgetButton")}
        className="fixed z-40 right-4 bottom-4 safe-bottom h-14 w-14 rounded-full btn-brand text-2xl flex items-center justify-center shadow-lift"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="fixed z-40 right-4 bottom-24 left-4 sm:left-auto sm:w-96 card shadow-lift overflow-hidden flex flex-col animate-rise" style={{ maxHeight: "min(70vh, 32rem)" }}>
          {/* Header */}
          <div className="px-4 py-3 bg-brand text-white">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{t("support.title")}</div>
              {status && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${supportStatusSoft(status)}`}>
                  {t(`supportStatus.${status}`)}
                </span>
              )}
            </div>
            <div className="text-xs text-white/85">{t("support.subtitle")}</div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[var(--surface-0)]">
            {messages.length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)] text-center py-6">{t("support.emptyHint")}</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.fromStaff ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.fromStaff
                        ? "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)]"
                        : "btn-brand text-white"
                    }`}
                  >
                    <div className="text-[10px] opacity-70 mb-0.5">
                      {m.fromStaff ? t("support.team") : t("support.you")}
                    </div>
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <form onSubmit={submit} className="border-t border-[var(--border)] p-3 space-y-2 bg-[var(--surface-1)]">
            {!token && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("support.namePlaceholder")}
                  className="px-2.5 py-1.5 rounded-lg text-sm"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("support.emailPlaceholder")}
                  className="px-2.5 py-1.5 rounded-lg text-sm"
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) submit(e);
                }}
                rows={2}
                placeholder={token ? t("support.replyPlaceholder") : t("support.messagePlaceholder")}
                className="flex-1 px-2.5 py-1.5 rounded-lg text-sm resize-none"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="btn-brand rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {busy ? t("support.sending") : t("support.send")}
              </button>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            {token && (
              <button
                type="button"
                onClick={startNew}
                className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
              >
                {t("support.newConversation")}
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
