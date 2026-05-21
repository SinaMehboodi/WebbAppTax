import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/dictionary";

const PALETTES = [
  { tone: "emerald", grad: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,.16)" },
  { tone: "sky", grad: "from-sky-500 to-indigo-600", glow: "rgba(56,189,248,.16)" },
  { tone: "amber", grad: "from-amber-500 to-orange-600", glow: "rgba(245,158,11,.18)" },
  { tone: "violet", grad: "from-violet-500 to-fuchsia-600", glow: "rgba(168,85,247,.18)" },
  { tone: "rose", grad: "from-rose-500 to-pink-600", glow: "rgba(244,63,94,.18)" },
];

export default async function PresentSectionPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const repId = typeof sp.rep === "string" ? sp.rep : null;

  const section = await prisma.presentationSection.findUnique({ where: { slug } });
  if (!section || !section.isActive) notFound();

  const all = await prisma.presentationSection.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { slug: true, order: true },
  });
  const idx = all.findIndex((s) => s.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const { t, locale } = await getDictionary();
  const title = locale === "en" ? section.titleEn : section.titleFr;
  const content = locale === "en" ? section.contentEn : section.contentFr;
  const palette = PALETTES[(section.order - 1 + PALETTES.length) % PALETTES.length];

  // Split into intro line + bullet-like lines (lines starting with "•" or "-")
  const lines = (content || "").split("\n");
  const bullets = lines.filter((l) => /^\s*[•\-]\s/.test(l)).map((l) => l.replace(/^\s*[•\-]\s/, ""));
  const intro = lines.filter((l) => !/^\s*[•\-]\s/.test(l)).join("\n").trim();

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero with the palette colour */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900" />
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{ background: `radial-gradient(60% 50% at 25% 20%, ${palette.glow}, transparent 60%)` }}
        />
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-8">
          <Link
            href={`/present${repId ? `?rep=${repId}` : ""}`}
            className="text-sm text-zinc-500 hover:underline"
          >
            ← {t("present.title")}
          </Link>
          <div className="mt-6 flex items-center gap-4">
            <div
              className={`shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br ${palette.grad} text-white flex items-center justify-center font-semibold text-lg shadow-lg`}
            >
              {String(section.order).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest text-zinc-500">
                {t("present.title")}
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
                {title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 pb-8 w-full space-y-6">
        {intro && (
          <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
            {intro}
          </p>
        )}
        {bullets.length > 0 && (
          <ul className="space-y-3">
            {bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${palette.grad}`}
                />
                <span className="text-zinc-800 dark:text-zinc-200">{b}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Bottom nav */}
      <section className="max-w-3xl mx-auto px-6 pb-16 w-full">
        <div className="flex items-center justify-between gap-3">
          {prev ? (
            <Link
              href={`/present/${prev.slug}${repId ? `?rep=${repId}` : ""}`}
              className="rounded-full border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ← {t("present.previous")}
            </Link>
          ) : (
            <Link
              href={`/present${repId ? `?rep=${repId}` : ""}`}
              className="rounded-full border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ← {t("present.title")}
            </Link>
          )}
          {next ? (
            <Link
              href={`/present/${next.slug}${repId ? `?rep=${repId}` : ""}`}
              className="rounded-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 px-5 py-2.5"
            >
              {t("present.next")} →
            </Link>
          ) : (
            <Link
              href={`/signup${repId ? `?rep=${repId}` : ""}`}
              className={`rounded-full px-5 py-2.5 text-white bg-gradient-to-br ${palette.grad} shadow-lg`}
            >
              {t("present.finish")} →
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
