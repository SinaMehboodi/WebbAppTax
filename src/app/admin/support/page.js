// Back-office support inbox. Visitor/client help requests from the login-page
// widget land here. Gated by support.view (ADMIN/SUPER_ADMIN always pass).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { can, PERMS } from "@/lib/permissions";
import { supportStatusSolid, avatarSolid, initialsOf } from "@/lib/uiColors";

const STATUSES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

export default async function SupportInbox({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, PERMS.SUPPORT_VIEW)) redirect("/admin");

  const sp = (await searchParams) || {};
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status) ? sp.status : null;
  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  const [threads, grouped] = await Promise.all([
    prisma.supportThread.findMany({
      where: status ? { status } : {},
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    }),
    prisma.supportThread.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = { ALL: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.ALL += g._count._all;
  }

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("admin.support")}</h1>
        <p className="text-sm text-[var(--fg-muted)]">{t("support.inboxSubtitle")}</p>
      </header>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/admin/support"
          className={`text-xs px-3 py-1.5 rounded-full border ${
            !status ? "btn-brand border-transparent" : "border-[var(--border)] hover:border-[var(--brand-500)]"
          }`}
        >
          {fr ? "Tous" : "All"} ({counts.ALL || 0})
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/support?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${
              status === s ? supportStatusSolid(s) : "border border-[var(--border)] hover:border-[var(--brand-500)]"
            }`}
          >
            {t(`supportStatus.${s}`)} ({counts[s] || 0})
          </Link>
        ))}
      </div>

      {threads.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xl">🛟</div>
          <p className="text-sm text-[var(--fg-muted)] mt-3">{t("support.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((th) => {
            const last = th.messages[0];
            const who = th.name || th.email || (fr ? "Visiteur anonyme" : "Anonymous visitor");
            return (
              <Link
                key={th.id}
                href={`/admin/support/${th.id}`}
                className="card card-interactive p-4 flex items-start gap-3"
              >
                <span className={`shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${avatarSolid(who)}`}>
                  {th.name ? initialsOf(...th.name.split(" ")) : "👤"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{who}</div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${supportStatusSolid(th.status)}`}>
                      {t(`supportStatus.${th.status}`)}
                    </span>
                  </div>
                  {th.subject && <div className="text-xs text-[var(--fg-muted)] truncate">{th.subject}</div>}
                  {last && (
                    <div className="text-sm text-[var(--fg-muted)] truncate mt-0.5">
                      {last.fromStaff ? (fr ? "Vous : " : "You: ") : ""}
                      {last.body}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)] mt-1">
                    <span>{new Date(th.lastMessageAt).toLocaleString(fr ? "fr-FR" : "en-GB")}</span>
                    <span>· {th._count.messages} msg</span>
                    {th.assignedTo && (
                      <span>· {fr ? "Attribué à" : "Assigned"} {th.assignedTo.firstName}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
