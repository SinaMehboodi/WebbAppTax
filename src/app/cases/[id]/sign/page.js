// Phase 3 §7–§9 — Electronic signature flow.
// The client sees a side-by-side PDF preview and signature pad. After signing
// both contract and mandate, the case is auto-activated (Phase 4 begins).
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import SignFlow from "./SignFlow";

export default async function SignPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const c = await prisma.taxCase.findUnique({
    where: { id },
    include: {
      contract: { include: { case: false } },
      mandate: true,
      owner: true,
    },
  });
  if (!c || c.ownerId !== user.id) notFound();
  if (!c.contract || !c.mandate) {
    return (
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <p>This case is not yet ready for signature.</p>
        <Link href={`/cases/${c.id}`} className="underline">Back</Link>
      </div>
    );
  }

  const { t } = await getDictionary();
  const fm = c.contract.feeModel;
  const feeText =
    fm === "PERCENT"
      ? t("sign.feeModelPercent", { percent: String(c.contract.feePercent || 0) })
      : fm === "AUDIT"
      ? t("sign.feeModelAudit", { amount: String(c.contract.feeFlatAmount || 0) })
      : t("sign.feeModelFlat", { amount: String(c.contract.feeFlatAmount || 0) });

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href={`/cases/${c.id}`} className="text-sm underline text-zinc-600 dark:text-zinc-400">
          ← {t("common.back")}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">{t("sign.title")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">{t("sign.explain")}</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="text-sm text-zinc-500">{t("sign.feeModelLabel")}</div>
        <div className="text-lg font-medium">{feeText}</div>
      </div>

      <SignFlow
        caseId={c.id}
        signerName={`${c.owner.firstName} ${c.owner.lastName}`}
        contract={{
          status: c.contract.status,
          documentId: c.contract.documentId,
          signedDocumentId: c.contract.signedDocumentId,
        }}
        mandate={{
          status: c.mandate.status,
          documentId: c.mandate.documentId,
          signedDocumentId: c.mandate.signedDocumentId,
        }}
        labels={{
          contract: t("sign.previewContract"),
          mandate: t("sign.previewMandate"),
          signContract: t("sign.signContract"),
          signMandate: t("sign.signMandate"),
          signed: t("sign.signed"),
          afterTitle: t("sign.afterTitle"),
          afterBody: t("sign.afterBody"),
        }}
      />
    </div>
  );
}
