"use client";

// Client 5-star + comment review, shown on a successfully closed case.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

export default function ReviewForm({ caseId, initialRating = 0, initialComment = "", submitted = false }) {
  const router = useRouter();
  const t = useT();
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(submitted);

  async function onSubmit(e) {
    e.preventDefault();
    if (!rating) return;
    setLoading(true);
    const res = await fetch(`/api/cases/${caseId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHover(s)}
            onClick={() => setRating(s)}
            aria-label={`${s} / 5`}
            className="text-3xl leading-none transition-transform hover:scale-110 focus-visible:scale-110"
          >
            <span className={(hover || rating) >= s ? "text-amber-400" : "text-[var(--border)]"}>★</span>
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("review.commentPlaceholder")}
        className="w-full p-2.5 rounded-xl text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          disabled={loading || !rating}
          className="btn-brand rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? "..." : done ? t("review.update") : t("review.submit")}
        </button>
        {done && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ {t("review.thanks")}</span>}
      </div>
    </form>
  );
}
