import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "USER") redirect("/admin/cases");

  const invoices = await prisma.invoice.findMany({
    where: { clientId: user.id },
    orderBy: { issuedAt: "desc" },
    include: { case: true },
  });
  const { t } = await getDictionary();

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("invoices.title")}</h1>

      {invoices.length === 0 ? (
        <p className="text-zinc-500">{t("invoices.noInvoices")}</p>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {invoices.map((i) => (
            <Link
              key={i.id}
              href={`/invoices/${i.id}`}
              className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{i.number}</div>
                  <div className="text-sm text-zinc-500">
                    {i.case?.reference} · {new Date(i.issuedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {Number(i.amountTTC).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </div>
                  <div className="text-xs text-zinc-500">{t(`invoiceStatus.${i.status}`)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
