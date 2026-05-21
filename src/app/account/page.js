// Logged-in user account page. Shows profile basics + a change-password card.
// Works for every role — USER, EMPLOYEE, ADMIN, SUPER_ADMIN.
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import ChangePasswordForm from "./ChangePasswordForm";
import BiometricCard from "./BiometricCard";

export default async function AccountPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {fr ? "Mon compte" : "My account"}
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          {fr
            ? "Vérifiez vos informations et modifiez votre mot de passe."
            : "Review your details and change your password."}
        </p>
      </header>

      {/* Profile card */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-2xl text-white font-semibold flex items-center justify-center shadow-brand"
            style={{ background: "var(--brand-gradient)" }}
            aria-hidden
          >
            {(me.firstName?.[0] || "?") + (me.lastName?.[0] || "")}
          </div>
          <div className="min-w-0">
            <div className="font-medium">{me.firstName} {me.lastName}</div>
            <div className="text-sm text-[var(--fg-muted)] truncate">{me.email}</div>
          </div>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
            {me.role.replace("_", " ")}
          </span>
        </div>
        {me.phone && (
          <div className="text-sm text-[var(--fg-muted)]">📞 {me.phone}</div>
        )}
      </section>

      {/* Biometric login card */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">👆</span>
          <h2 className="font-semibold">
            {fr ? "Connexion biométrique" : "Biometric login"}
          </h2>
        </div>
        <BiometricCard fr={fr} />
      </section>

      {/* Change password card */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">🔑</span>
          <h2 className="font-semibold">
            {fr ? "Changer mon mot de passe" : "Change my password"}
          </h2>
        </div>
        <p className="text-xs text-[var(--fg-muted)]">
          {fr
            ? "Saisissez votre mot de passe actuel puis votre nouveau mot de passe (au moins 8 caractères)."
            : "Enter your current password, then your new password (at least 8 characters)."}
        </p>
        <ChangePasswordForm fr={fr} />
      </section>

      {/* Forgot? */}
      <div className="text-xs text-[var(--fg-muted)] text-center">
        {fr ? "Vous avez oublié votre mot de passe actuel ?" : "Forgot your current password?"}{" "}
        <Link href="/forgot-password" className="underline hover:text-[var(--fg)]">
          {fr ? "Recevoir un lien par e-mail" : "Get a reset link by email"}
        </Link>
      </div>
    </div>
  );
}
