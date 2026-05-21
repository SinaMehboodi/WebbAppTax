// Status pill. `audience="client"` uses the friendlier `clientStatus.*` i18n
// keys; default uses the technical `status.*` keys (back-office).
export default function StatusBadge({ status, t, size = "sm", audience = "admin" }) {
  const tone = TONE[status] || TONE.DEFAULT;
  const px = size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  const key = audience === "client" ? `clientStatus.${status}` : `status.${status}`;
  let label = t(key);
  // If the clientStatus key doesn't exist for some reason, fall back so we
  // never render "clientStatus.FOO" literally.
  if (label === key) label = t(`status.${status}`);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${px} ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

const TONE = {
  DEFAULT:            "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700",
  DRAFT:              "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/60",
  CONTRACT_PREPARING: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/60",
  AWAITING_SIGNATURE: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60",
  SIGNED:             "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60",
  ACTIVE:             "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60",
  AWAITING_DOCUMENTS: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60",
  DOCUMENTS_RECEIVED: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/60",
  ANALYZING:          "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800/60",
  DECISION_PENDING:   "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800/60",
  PROCEEDING:         "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60",
  NOT_PROCEEDING:     "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700",
  AUDIT_OFFERED:      "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800/60",
  ADMIN_RESPONSE:     "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/60",
  RESULT_DELIVERED:   "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60",
  INVOICED:           "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60",
  PAID:               "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60",
  CLOSED:             "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700",
  STOPPED:            "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60",
  CANCELLED:          "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800/60",
};
