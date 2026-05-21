import Link from "next/link";
import { getDictionary } from "@/lib/dictionary";
import ResetForm from "./ResetForm";

export default async function ResetPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const token = typeof sp.token === "string" ? sp.token : "";
  const onboarding = sp.onboarding === "1";
  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-hero">
      <div className="w-full max-w-md card p-7 sm:p-8 space-y-6 animate-rise">
        <div className="space-y-1">
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white font-semibold shadow-brand mb-2"
            style={{ background: "var(--brand-gradient)" }}
            aria-hidden
          >
            {onboarding ? "✓" : "🔑"}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {onboarding
              ? (fr ? "Activez votre compte" : "Activate your account")
              : t("reset.title")}
          </h1>
          {onboarding && (
            <p className="text-sm text-[var(--fg-muted)]">
              {fr
                ? "Choisissez votre mot de passe pour finaliser la création de votre compte SamTaxco."
                : "Choose your password to finish setting up your SamTaxco account."}
            </p>
          )}
        </div>

        <ResetForm
          token={token}
          onboarding={onboarding}
          labels={{
            password:     fr ? "Nouveau mot de passe (8+ caractères)" : "New password (8+ characters)",
            confirm:      fr ? "Confirmer le mot de passe" : "Confirm password",
            submit:       onboarding
              ? (fr ? "Activer mon compte" : "Activate my account")
              : t("reset.submit"),
            success:      onboarding
              ? (fr ? "Compte activé. Vous pouvez vous connecter." : "Account activated. You can log in.")
              : t("reset.success"),
            invalidToken: t("reset.invalidToken"),
            mismatch:     t("signup.passwordMismatch"),
            tooShort:     t("signup.passwordTooShort"),
          }}
        />

        <div className="text-xs text-[var(--fg-muted)] text-center">
          <Link href="/login" className="underline hover:text-[var(--fg)]">
            {fr ? "Retour à la connexion" : "Back to login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
