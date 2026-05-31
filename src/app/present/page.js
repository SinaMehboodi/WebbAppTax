// Phase 1 — Locked sales presentation mode. Tablet-optimized, big type,
// designed to be projected or shown 1:1 to a prospect. Content is rendered
// from the PresentationSection table so only the admin back-office can
// update copy (spec §3 "the content of these sections must be locked").
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/dictionary";
import { paletteFor } from "@/lib/slideColors";
import RepQrPanel from "./RepQrPanel";

export const dynamic = "force-dynamic";

export default async function PresentPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const repId = typeof sp.rep === "string" ? sp.rep : null;

  const [sections, rep] = await Promise.all([
    prisma.presentationSection.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    repId
      ? prisma.user.findUnique({
          where: { id: repId },
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve(null),
  ]);

  const { t, locale } = await getDictionary();
  const title = (s) => (locale === "en" ? s.titleEn : s.titleFr);
  const content = (s) => (locale === "en" ? s.contentEn : s.contentFr);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero with layered gradient blobs */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 20% 20%, rgba(16,185,129,.18), transparent 60%)," +
              "radial-gradient(50% 60% at 80% 30%, rgba(245,158,11,.18), transparent 60%)," +
              "radial-gradient(70% 60% at 50% 100%, rgba(99,102,241,.16), transparent 60%)",
          }}
        />
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center">
          <p className="inline-block uppercase tracking-widest text-xs px-3 py-1 rounded-full bg-zinc-900/5 dark:bg-zinc-50/10 text-zinc-700 dark:text-zinc-300">
            {t("present.tabletMode")}
          </p>
          <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-tight">
            {t("app.tagline")}
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
            {t("present.intro")}
          </p>
          {rep && (
            <p className="mt-6 inline-flex items-center gap-2 text-sm bg-white/70 dark:bg-zinc-900/70 backdrop-blur rounded-full px-4 py-2 border border-zinc-200 dark:border-zinc-800">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 text-xs font-semibold">
                {rep.firstName[0]}
              </span>
              <span className="text-zinc-500">{t("present.yourContact")} :</span>
              <span className="font-medium">
                {rep.firstName} {rep.lastName}
              </span>
            </p>
          )}
        </div>
      </section>

      {/* Section cards */}
      <section className="max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="grid gap-4">
          {sections.map((s) => {
            const palette = paletteFor(s.order);
            const preview = (content(s) || "").split("\n").find((l) => l.trim()) || "";
            return (
              <Link
                key={s.id}
                href={`/present/${s.slug}${repId ? `?rep=${repId}` : ""}`}
                className="group relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 hover:border-zinc-400 dark:hover:border-zinc-600 transition shadow-sm hover:shadow-md"
              >
                <div
                  className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
                  style={{ background: palette.hex }}
                />
                <div className="relative flex items-start gap-5">
                  <div
                    className="shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center font-semibold text-lg shadow-lg"
                    style={{ background: palette.hex, color: "#fff" }}
                  >
                    {String(s.order).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                      {title(s)}
                    </h2>
                    {preview && (
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {preview}
                      </p>
                    )}
                  </div>
                  <span className="text-3xl text-zinc-300 dark:text-zinc-700 group-hover:translate-x-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition">
                    →
                  </span>
                </div>
              </Link>
            );
          })}

          {/* Final CTA card */}
          <Link
            href={repId ? `/signup?rep=${repId}` : "/signup"}
            className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 text-zinc-50 shadow-xl"
            style={{
              background:
                "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
            }}
          >
            <div
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full"
              style={{ background: "radial-gradient(closest-side, rgba(255,255,255,.15), transparent)" }}
            />
            <div className="relative flex items-center gap-5">
              <div className="shrink-0 h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center font-semibold text-lg">
                {String(sections.length + 1).padStart(2, "0")}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  {t("present.finish")}
                </h2>
                <p className="mt-2 text-sm text-zinc-300">
                  {t("landing.heroSubtitle")}
                </p>
              </div>
              <span className="text-3xl group-hover:translate-x-1 transition">→</span>
            </div>
          </Link>
        </div>
      </section>

      {/* QR strip */}
      <section className="max-w-5xl mx-auto px-6 pb-16 w-full">
        <RepQrPanel rep={rep} title={t("present.scanToDownload")} />
      </section>
    </div>
  );
}
