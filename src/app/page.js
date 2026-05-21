import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === "ADMIN" || user.role === "EMPLOYEE") redirect("/admin");
    if (!user.firstLoginTutorialSeen) redirect("/tutorial");
    redirect("/dashboard");
  }
  const { t } = await getDictionary();
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero -z-10" />
        <div className="absolute inset-0 -z-10 opacity-60 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(800px circle at 10% 10%, rgba(16,185,129,.18), transparent 40%)," +
              "radial-gradient(800px circle at 90% 30%, rgba(245,158,11,.18), transparent 40%)",
          }}
        />
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center animate-rise">
          <p className="inline-flex items-center gap-2 uppercase tracking-widest text-[11px] px-3 py-1 rounded-full bg-[var(--surface-1)] border border-[var(--border)] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-500)] animate-pulse" />
            {t("app.subtitle")}
          </p>
          <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg,#059669 0%,#0d9488 45%,#0f766e 100%)" }}
            >
              {t("landing.heroTitle")}
            </span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-[var(--fg-muted)] max-w-2xl mx-auto leading-relaxed">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="btn-brand rounded-full px-6 py-3 font-medium text-base"
            >
              {t("landing.ctaSignup")} →
            </Link>
            <Link
              href="/present"
              className="btn-soft rounded-full px-6 py-3 font-medium text-base"
            >
              {t("landing.ctaPresent")}
            </Link>
            <Link
              href="/login"
              className="text-sm underline text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              {t("landing.ctaLogin")}
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="max-w-5xl mx-auto px-6 -mt-6 sm:-mt-10 mb-14 w-full">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { n: "01", text: t("landing.trust1"), grad: "from-emerald-500 to-teal-600", ring: "ring-emerald-500/20" },
            { n: "02", text: t("landing.trust2"), grad: "from-sky-500 to-indigo-600",  ring: "ring-sky-500/20" },
            { n: "03", text: t("landing.trust3"), grad: "from-amber-500 to-orange-600",ring: "ring-amber-500/20" },
          ].map((item, i) => (
            <div
              key={i}
              className={`card card-interactive p-5 ring-1 ${item.ring}`}
            >
              <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${item.grad} text-white flex items-center justify-center text-sm font-semibold mb-3 shadow-card`}>
                {item.n}
              </div>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">
          {t("present.title")}
        </h2>
        <p className="text-center text-[var(--fg-muted)] mt-2">{t("present.intro")}</p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: "📤", title: t("tutorial.step1Title"), body: t("tutorial.step1Body"), tint: "bg-emerald-50 dark:bg-emerald-950/30" },
            { icon: "🔎", title: t("tutorial.step2Title"), body: t("tutorial.step2Body"), tint: "bg-sky-50 dark:bg-sky-950/30" },
            { icon: "✍️", title: t("tutorial.step3Title"), body: t("tutorial.step3Body"), tint: "bg-amber-50 dark:bg-amber-950/30" },
            { icon: "🔔", title: t("tutorial.step4Title"), body: t("tutorial.step4Body"), tint: "bg-violet-50 dark:bg-violet-950/30" },
          ].map((s, i) => (
            <div key={i} className="card card-interactive p-5">
              <div className={`text-3xl h-12 w-12 rounded-2xl ${s.tint} flex items-center justify-center`}>
                {s.icon}
              </div>
              <div className="font-semibold mt-3">{s.title}</div>
              <p className="text-sm text-[var(--fg-muted)] mt-1 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
