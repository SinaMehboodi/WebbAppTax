// Read-only star rating display (1..5).
export default function Stars({ value = 0, className = "" }) {
  return (
    <span className={`inline-flex ${className}`} role="img" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={value >= s ? "text-amber-400" : "text-[var(--border)]"}>★</span>
      ))}
    </span>
  );
}
