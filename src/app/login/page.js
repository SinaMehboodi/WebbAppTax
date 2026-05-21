import { getDictionary } from "@/lib/dictionary";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";
import Link from "next/link";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const { t } = await getDictionary();
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-hero">
      <div className="w-full max-w-md card p-7 sm:p-8 space-y-6 animate-rise">
        <div className="space-y-1">
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white font-semibold shadow-brand mb-2"
            style={{ background: "var(--brand-gradient)" }}
            aria-hidden
          >
            M
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
          <p className="text-sm text-[var(--fg-muted)]">{t("login.subtitle")}</p>
        </div>
        <LoginForm
          labels={{
            email: t("login.email"),
            password: t("login.password"),
            submit: t("login.submit"),
            submitting: t("login.submitting"),
            forgot: t("login.forgot"),
            invalid: t("login.invalid"),
            notVerified: t("login.notVerified"),
            tooManyAttempts: t("login.tooManyAttempts"),
            deactivated: t("login.deactivated"),
            rememberMe: t("login.rememberMe"),
            or: t("login.or"),
            biometric: t("login.biometric"),
            biometricNotEnrolled: t("login.biometricNotEnrolled"),
            biometricFailed: t("login.biometricFailed"),
            emailNeededForBiometric: t("login.emailNeededForBiometric"),
          }}
        />
        <div className="text-sm text-[var(--fg-muted)] text-center">
          {t("login.noAccount")}{" "}
          <Link href="/signup" className="text-[var(--brand-600)] font-medium hover:underline">
            {t("login.signupLink")}
          </Link>
        </div>
      </div>
    </div>
  );
}
