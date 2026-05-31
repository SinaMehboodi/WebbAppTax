// SamTaxco brand mark — a downward arrow settling onto a baseline ("we bring
// your tax down to the floor"). Replaces the plain "S". Pure SVG, so it works in
// both server and client components.
//
//   <BrandLogo className="h-9 w-9" />     → gradient badge + white glyph
//   <BrandLogo badge={false} className="h-44 w-44 text-white/10" />  → bare glyph

function Glyph({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <path d="M16 6.5 V18.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10 12.6 L16 19 L22 12.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 24.5 H22.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export default function BrandLogo({ className = "", badge = true }) {
  if (!badge) return <Glyph className={className} />;
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-2xl text-white shadow-brand ${className}`}
      style={{ background: "var(--brand-gradient)" }}
      aria-hidden
    >
      <Glyph className="h-[58%] w-[58%]" />
    </span>
  );
}
