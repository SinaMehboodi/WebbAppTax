// SamTaxco ring mark — two near-touching concentric rings (emerald + sky) around
// a centred label. Default label is "S.co" (the brand); pass `label` to reuse the
// exact same rings around something else, e.g. a user's initials in the banner.
// No background; the label uses currentColor (dark on light surfaces, white on
// the coloured banner).
export default function BrandLogo({ className = "", label = "S.co" }) {
  return (
    <svg viewBox="0 0 44 44" className={className} role="img" aria-label={label === "S.co" ? "SamTaxco" : label}>
      <circle cx="22" cy="22" r="20.6" fill="none" stroke="#10b981" strokeWidth="1.4" />
      <circle cx="22" cy="22" r="18.9" fill="none" stroke="#0ea5e9" strokeWidth="1.4" />
      <text
        x="22"
        y="22.4"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={label.length <= 2 ? 15 : 13.5}
        fontWeight="700"
        fill="currentColor"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif" }}
      >
        {label}
      </text>
    </svg>
  );
}
