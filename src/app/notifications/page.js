import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import MarkAllReadButton from "./MarkAllReadButton";
import PushOptIn from "@/components/PushOptIn";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";
import AdminBanner from "@/components/AdminBanner";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const { t, locale } = await getDictionary();
  const unread = items.filter((i) => !i.readAt).length;

  return (
    <>
      <AdminBanner role={user.role} firstName={user.firstName} lastName={user.lastName} locale={locale} containerClass="max-w-3xl" topInset={false} />
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("notifications.title")}</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-0.5">
            {unread > 0
              ? `${unread} ${locale === "fr" ? "à lire" : "unread"}`
              : (locale === "fr" ? "Tout est à jour ✓" : "All caught up ✓")}
          </p>
        </div>
        {unread > 0 && <MarkAllReadButton label={t("notifications.markAllRead")} />}
      </div>

      <InstallPwaPrompt />

      {/* Push opt-in card */}
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-sm">
            {locale === "fr" ? "Recevoir les alertes sur ce téléphone" : "Get alerts on this device"}
          </div>
          <div className="text-xs text-[var(--fg-muted)] mt-0.5">
            {locale === "fr"
              ? "Notifications push pour signature, demandes de pièces, factures."
              : "Push notifications for signatures, document requests, invoices."}
          </div>
        </div>
        <PushOptIn
          labels={{
            enable: locale === "fr" ? "Activer" : "Enable",
            disable: locale === "fr" ? "Désactiver" : "Disable",
            denied: locale === "fr" ? "Bloqué dans le navigateur" : "Blocked in browser",
            unsupported: locale === "fr" ? "Non pris en charge" : "Not supported",
          }}
        />
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xl">🔔</div>
          <p className="text-[var(--fg-muted)] text-sm mt-3">{t("notifications.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`card p-4 ${n.readAt ? "" : "border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10"}`}
            >
              <div className="text-xs text-[var(--fg-muted)] flex items-center gap-2">
                <span>{new Date(n.createdAt).toLocaleString()}</span>
                {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </div>
              <div className="font-medium mt-1">{t(n.titleKey, n.params || {})}</div>
              {n.bodyKey && (
                <div className="text-sm text-[var(--fg-muted)] mt-0.5">
                  {t(n.bodyKey, n.params || {})}
                </div>
              )}
              {n.link && (
                <Link href={n.link} className="text-sm text-[var(--brand-600)] mt-2 inline-flex items-center gap-1 hover:underline">
                  {t("common.open")} <span aria-hidden>→</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
    </>
  );
}
