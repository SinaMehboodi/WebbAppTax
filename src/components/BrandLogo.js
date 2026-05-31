// SamTaxco brand mark — "S.co" inside two near-touching concentric rings
// (emerald + sky). No background: the rings + label sit directly on whatever is
// behind them. The label uses currentColor, so it's dark on light surfaces
// (header/sidebar) and white on the coloured banner automatically.
export default function BrandLogo({ className = "" }) {
  return (
    <svg viewBox="0 0 44 44" className={className} role="img" aria-label="SamTaxco">
      <circle cx="22" cy="22" r="20.6" fill="none" stroke="#10b981" strokeWidth="1.4" />
      <circle cx="22" cy="22" r="18.9" fill="none" stroke="#0ea5e9" strokeWidth="1.4" />
      <text
        x="22"
        y="22.4"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13.5"
        fontWeight="700"
        fill="currentColor"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif" }}
      >
        S.co
      </text>
    </svg>
  );
}
