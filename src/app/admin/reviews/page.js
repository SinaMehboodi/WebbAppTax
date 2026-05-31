// Client-satisfaction report — average rating, star distribution, and every
// review left after a successful case. A year-end view of how happy clients are.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { can, PERMS } from "@/lib/permissions";
import Stars from "@/components/Stars";

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role)) redirect("/");
  if (!can(user, PERMS.REPORTS_VIEW)) redirect("/admin");

  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      case: {
        select: {
          reference: true,
          propertyName: true,
          owner: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, n: reviews.filter((r) => r.rating === star).length }));

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("reviews.title")}</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">{t("reviews.subtitle")}</p>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide font-medium text-[var(--fg-muted)]">{t("reviews.average")}</div>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-semibold tabular-nums">{avg ? avg.toFixed(1) : "—"}</span>
            <Stars value={Math.round(avg)} className="text-xl mb-1.5" />
          </div>
          <div className="text-xs text-[var(--fg-muted)] mt-1 tabular-nums">{count} {t("reviews.count")}</div>
        </div>
        <div className="card p-5 sm:col-span-2">
          <div className="text-xs uppercase tracking-wide font-medium text-[var(--fg-muted)] mb-2">{t("reviews.distribution")}</div>
          <div className="space-y-1.5">
            {dist.map(({ star, n }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 tabular-nums">{star}</span>
                <span className="text-amber-400">★</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: count ? `${(n / count) * 100}%` : "0%" }} />
                </div>
                <span className="w-6 text-right tabular-nums text-[var(--fg-muted)]">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        {reviews.length === 0 ? (
          <div className="card p-8 text-center text-[var(--fg-muted)] text-sm">{t("reviews.empty")}</div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <Stars value={r.rating} className="text-lg" />
                <span className="text-xs text-[var(--fg-muted)] tabular-nums">
                  {new Date(r.createdAt).toLocaleDateString(fr ? "fr-FR" : "en-US")}
                </span>
              </div>
              {r.comment && <p className="text-sm mt-2 whitespace-pre-line">{r.comment}</p>}
              <div className="text-xs text-[var(--fg-muted)] mt-2">
                {r.case?.owner?.firstName} {r.case?.owner?.lastName}
                {" · "}
                <Link href={`/admin/cases/${r.caseId}`} className="text-[var(--brand-600)] hover:underline">
                  {r.case?.reference}
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
