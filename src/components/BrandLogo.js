// SamTaxco brand mark — "S.co" inside concentric rings.
//
// Design logic:
//  • 3 rings — the most that stay crisp at a 32–36px display size.
//  • A cool, on-brand arc (emerald → sky → indigo) that harmonises with both the
//    warm-light and deep-navy app backgrounds instead of clashing with them.
//  • Golden ratio: the clear centre (r≈12.7) is ~1/φ of the disc (r≈20.6), so
//    "S.co" sits balanced inside the rings.
// Theme-aware (disc + label follow the CSS vars) and scales to the className size.
export default function BrandLogo({ className = "" }) {
  return (
    <svg viewBox="0 0 44 44" className={className} role="img" aria-label="SamTaxco">
      <circle cx="22" cy="22" r="20.6" fill="var(--surface-1)" />
      <circle cx="22" cy="22" r="20.6" fill="none" stroke="#10b981" strokeWidth="1.7" />
      <circle cx="22" cy="22" r="16.65" fill="none" stroke="#0ea5e9" strokeWidth="1.7" />
      <circle cx="22" cy="22" r="12.7" fill="none" stroke="#6366f1" strokeWidth="1.7" />
      <text
        x="22"
        y="22.4"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="700"
        fill="var(--fg)"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif" }}
      >
        S.co
      </text>
    </svg>
  );
}
