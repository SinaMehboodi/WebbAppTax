// Phase 3 §2 — upload a tax notice. One upload = one future case (after the
// company prepares contract+mandate and the client signs).
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import NewCaseForm from "./NewCaseForm";

export default async function NewCasePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getDictionary();
  return (
    <div className="flex-1 max-w-xl w-full mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t("cases.newTitle")}</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mt-1">{t("cases.newSubtitle")}</p>

      <div className="mt-6">
        <NewCaseForm
          labels={{
            taxType: t("cases.taxType"),
            taxYear: t("cases.taxYear"),
            propertyName: t("cases.propertyName"),
            propertyNamePlaceholder: t("cases.propertyNamePlaceholder"),
            propertyNameHint: t("cases.propertyNameHint"),
            propertyNameRequired: t("cases.propertyNameRequired"),
            noticeDate: t("cases.noticeDate"),
            documentLabel: t("cases.documentLabel"),
            fileRequired: t("cases.fileRequired"),
            remove: t("common.delete"),
            TF: t("cases.taxTypeTF"),
            CFE: t("cases.taxTypeCFE"),
            AUDIT: t("cases.taxTypeAUDIT"),
            OTHER: t("cases.taxTypeOTHER"),
            uploadPhoto: t("cases.uploadPhoto"),
            uploadPdf: t("cases.uploadPdf"),
            uploadGallery: t("cases.uploadGallery"),
            submit: t("cases.submit"),
            submitting: t("cases.submitting"),
            successTitle: t("cases.successTitle"),
            successBody: t("cases.successBody"),
            generic: t("signup.genericError"),
          }}
        />
      </div>
    </div>
  );
}
