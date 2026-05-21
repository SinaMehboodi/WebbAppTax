// Phase 7 §4–§5 — Refer a friend. Shows the user's referralCode, a shareable
// link, and a QR code that can be saved/sent.
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { qrDataUrl } from "@/lib/qr";
import { prisma } from "@/lib/prisma";
import CopyButton from "./CopyButton";

export default async function ReferralPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "USER") redirect("/admin");

  // Make sure the user has a referral code (older users created before the
  // column existed may not have one)
  let code = user.referralCode;
  if (!code) {
    code = randomCode();
    await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
  }

  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const link = `${proto}://${host}/r/${code}`;
  const qr = await qrDataUrl(link, { width: 240 });
  const { t } = await getDictionary();

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t("referral.title")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">{t("referral.subtitle")}</p>
      </header>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col sm:flex-row items-center gap-6">
        <img src={qr} alt="QR" className="w-44 h-44" />
        <div className="flex-1 w-full space-y-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">{t("referral.yourCode")}</div>
            <div className="text-2xl font-mono mt-1">{code}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">{t("referral.shareLink")}</div>
            <div className="text-sm break-all mt-1">{link}</div>
          </div>
          <CopyButton text={link} label={t("referral.copy")} copiedLabel={t("referral.copied")} />
        </div>
      </section>
    </div>
  );
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
