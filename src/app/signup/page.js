import { getDictionary } from "@/lib/dictionary";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SignupForm from "./SignupForm";
import Link from "next/link";

// `searchParams` carries `?rep=<userId>&ref=<referralCode>` set by the
// presentation QR redirect and referral links (Phase 1 §7 and Phase 7).
export default async function SignupPage({ searchParams }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const sp = (await searchParams) || {};
  const repIdParam = typeof sp.rep === "string" ? sp.rep : null;
  const refCode = typeof sp.ref === "string" ? sp.ref : null;

  const reps = await prisma.user.findMany({
    where: { role: { in: ["EMPLOYEE", "ADMIN"] } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }],
  });

  // Validate the prefilled rep id against the actual list
  const prefilledRepId = repIdParam && reps.find((r) => r.id === repIdParam) ? repIdParam : "";

  const { t, locale } = await getDictionary();

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("signup.title")}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("signup.subtitle")}</p>
        </div>

        <SignupForm
          reps={reps}
          prefilledRepId={prefilledRepId}
          referredByCode={refCode}
          locale={locale}
          labels={{
            firstName: t("signup.firstName"),
            lastName: t("signup.lastName"),
            email: t("signup.email"),
            phone: t("signup.phoneOptional"),
            company: t("signup.company"),
            password: t("signup.password"),
            passwordHint: t("signup.passwordHint"),
            confirmPassword: t("signup.confirmPassword"),
            referenceRep: t("signup.referenceRep"),
            referenceRepHint: t("signup.referenceRepHint"),
            submit: t("signup.submit"),
            submitting: t("signup.submitting"),
            passwordMismatch: t("signup.passwordMismatch"),
            passwordTooShort: t("signup.passwordTooShort"),
            networkError: t("signup.networkError"),
            genericError: t("signup.genericError"),
            emailTaken: t("signup.emailTaken"),
          }}
        />

        <div className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
          {t("signup.haveAccount")}{" "}
          <Link href="/login" className="underline">{t("signup.loginLink")}</Link>
        </div>
      </div>
    </div>
  );
}
