import { headers } from "next/headers";
import { qrDataUrl } from "@/lib/qr";

export default async function RepQrPanel({ rep, title }) {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const url = rep
    ? `${proto}://${host}/r/rep/${rep.id}`
    : `${proto}://${host}/signup`;
  const qr = await qrDataUrl(url, { width: 220 });

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex items-center gap-6 flex-col sm:flex-row">
      <img src={qr} alt="QR" className="w-44 h-44" />
      <div className="text-center sm:text-left">
        <p className="text-sm uppercase tracking-widest text-zinc-500">{title}</p>
        {rep && (
          <p className="text-xl font-semibold mt-2">
            {rep.firstName} {rep.lastName}
          </p>
        )}
        <p className="text-xs text-zinc-500 mt-2 break-all">{url}</p>
      </div>
    </div>
  );
}
