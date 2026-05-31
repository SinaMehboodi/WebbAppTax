// SamTaxco brand mark — "S.co" inside several concentric, role-coloured rings
// (client blue → employee teal → admin violet). Self-contained, theme-aware SVG
// that scales to whatever size the className sets (e.g. h-8 w-8).
export default function BrandLogo({ className = "" }) {
  return (
    <svg viewBox="0 0 44 44" className={className} role="img" aria-label="SamTaxco">
      {/* disc so the rings + label read on any background */}
      <circle cx="22" cy="22" r="20.7" fill="var(--surface-1)" />
      {/* concentric rings, client → admin colours */}
      <circle cx="22" cy="22" r="20.7" fill="none" stroke="#38bdf8" strokeWidth="1.7" />
      <circle cx="22" cy="22" r="17.7" fill="none" stroke="#2dd4bf" strokeWidth="1.7" />
      <circle cx="22" cy="22" r="14.7" fill="none" stroke="#8b5cf6" strokeWidth="1.7" />
      <text
        x="22"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="700"
        fill="var(--fg)"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif" }}
      >
        S.co
      </text>
    </svg>
  );
}
