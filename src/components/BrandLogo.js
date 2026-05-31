// SamTaxco brand mark — "S.co" inside two concentric rings (emerald + sky), thin
// lines to match the banner mark. Theme-aware; scales to the className size.
export default function BrandLogo({ className = "" }) {
  return (
    <svg viewBox="0 0 44 44" className={className} role="img" aria-label="SamTaxco">
      <circle cx="22" cy="22" r="20.6" fill="var(--surface-1)" />
      <circle cx="22" cy="22" r="20.6" fill="none" stroke="#10b981" strokeWidth="1.4" />
      <circle cx="22" cy="22" r="16.8" fill="none" stroke="#0ea5e9" strokeWidth="1.4" />
      <text
        x="22"
        y="22.4"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13"
        fontWeight="700"
        fill="var(--fg)"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif" }}
      >
        S.co
      </text>
    </svg>
  );
}
