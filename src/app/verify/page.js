import { getDictionary } from "@/lib/dictionary";
import VerifyForm from "./VerifyForm";

export default async function VerifyPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const token = typeof sp.token === "string" ? sp.token : "";
  const email = typeof sp.email === "string" ? sp.email : "";
  const { t } = await getDictionary();
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("verify.title")}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("verify.instructions")}</p>
        </div>
        <VerifyForm
          defaultToken={token}
          defaultEmail={email}
          labels={{
            code: t("verify.code"),
            email: t("login.email"),
            submit: t("verify.submit"),
            invalidCode: t("verify.invalidCode"),
            success: t("verify.success"),
            successCta: t("verify.successCta"),
          }}
        />
      </div>
    </div>
  );
}
