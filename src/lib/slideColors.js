// ColorBrewer "8-class Set3" — qualitative palette used to give each
// presentation slide its own visual identity. Colours cycle by slide order, so
// slide #9 reuses #1's tone, etc. This is the SAME Set3 palette used across the
// app for categorical identity (see src/lib/uiColors.js + globals.css) — slides
// just need the richer {hex, fg, bgSoft, border} shape for inline-styled badges.
//
//   1=teal 2=yellow 3=lavender 4=coral 5=blue 6=orange 7=green 8=pink

export const SLIDE_PALETTE = [
  { id: "teal",     hex: "#8dd3c7", fg: "#0f5e54", bgSoft: "#e8f6f3", border: "#b9e3db" }, // 141,211,199
  { id: "yellow",   hex: "#ffffb3", fg: "#6b6411", bgSoft: "#fffff0", border: "#ecec9a" }, // 255,255,179
  { id: "lavender", hex: "#bebada", fg: "#43406b", bgSoft: "#f0eff7", border: "#d4d1e8" }, // 190,186,218
  { id: "coral",    hex: "#fb8072", fg: "#7c2d28", bgSoft: "#fde8e5", border: "#f8b3ab" }, // 251,128,114
  { id: "blue",     hex: "#80b1d3", fg: "#1e466b", bgSoft: "#e9f1f7", border: "#aecbe1" }, // 128,177,211
  { id: "orange",   hex: "#fdb462", fg: "#7a4a12", bgSoft: "#fef0de", border: "#f9d3a3" }, // 253,180,98
  { id: "green",    hex: "#b3de69", fg: "#4f6b16", bgSoft: "#f1f8e3", border: "#cfe9a8" }, // 179,222,105
  { id: "pink",     hex: "#fccde5", fg: "#7a3257", bgSoft: "#fdeef5", border: "#f7d6e7" }, // 252,205,229
];

export function paletteFor(order) {
  // 1-indexed in DB → 0-indexed array; safely cycles.
  const idx = ((Number(order) || 1) - 1) % SLIDE_PALETTE.length;
  return SLIDE_PALETTE[(idx + SLIDE_PALETTE.length) % SLIDE_PALETTE.length];
}
