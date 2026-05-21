import { getDictionary } from "@/lib/dictionary";
import Link from "next/link";

export default async function SignupSuccess({ searchParams }) {
  const sp = (await searchParams) || {};
  const email = typeof sp.email === "string" ? sp.email : null;
  const { t } = await getDictionary();
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-hero">
      <div className="max-w-md w-full card p-8 text-center space-y-4 animate-rise">
        <div
          className="mx-auto h-14 w-14 rounded-2xl text-white text-2xl flex items-center justify-center shadow-brand"
          style={{ background: "var(--brand-gradient)" }}
          aria-hidden
        >
          ✉
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("signup.successTitle")}</h1>
        <p className="text-[var(--fg-muted)]">{t("signup.successBody")}</p>
        <div className="pt-2 flex gap-3 justify-center flex-wrap">
          <Link
            href={email ? `/verify?email=${encodeURIComponent(email)}` : "/verify"}
            className="btn-brand rounded-full px-5 py-2.5 text-sm font-medium"
          >
            {t("verify.submit")}
          </Link>
          <Link href="/login" className="btn-soft rounded-full px-5 py-2.5 text-sm font-medium">
            {t("signup.successCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
