import { getDictionary } from "@/lib/dictionary";
import ForgotForm from "./ForgotForm";

export default async function ForgotPage() {
  const { t } = await getDictionary();
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("forgot.title")}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("forgot.subtitle")}</p>
        </div>
        <ForgotForm
          labels={{
            email: t("forgot.email"),
            submit: t("forgot.submit"),
            submitting: t("forgot.submitting"),
            success: t("forgot.success"),
          }}
        />
      </div>
    </div>
  );
}
