// Categorical UI colours — ColorBrewer "8-class Set3".
//
// This module is the single source of truth for *which* Set3 swatch a thing
// gets. It returns Tailwind-style class names (`set3-solid-N` / `set3-soft-N`,
// defined in globals.css) rather than inline styles so colours stay in CSS and
// SSR/CSR render identically. Safe to import from both server and client
// components (no "server-only").
//
// Design rule: Set3 is for *identity* (who/what), never for *status* (how it's
// going). Case/invoice status keeps its semantic emerald/amber/sky/rose tones
// in StatusBadge — don't route those through here.

// 1=teal 2=yellow 3=lavender 4=coral 5=blue 6=orange 7=green 8=pink
export const SET3_COUNT = 8;

export function set3Solid(n) {
  return `set3-solid-${((((n - 1) % SET3_COUNT) + SET3_COUNT) % SET3_COUNT) + 1}`;
}
export function set3Soft(n) {
  return `set3-soft-${((((n - 1) % SET3_COUNT) + SET3_COUNT) % SET3_COUNT) + 1}`;
}

// --- Roles -------------------------------------------------------------------
// Logical: client = calm blue (the customer); employee = teal (does the work);
// admin = lavender (management); super-admin = coral (top authority /
// break-glass). Stable, not hashed, so the same role is always the same colour.
const ROLE_INDEX = {
  USER: 5, // blue
  EMPLOYEE: 1, // teal (rgb 141 211 199 / #8DD3C7)
  ADMIN: 3, // lavender
  SUPER_ADMIN: 4, // coral
};
export function roleSolid(role) {
  return set3Solid(ROLE_INDEX[role] || 1);
}
export function roleSoft(role) {
  return set3Soft(ROLE_INDEX[role] || 1);
}

// --- People avatars ----------------------------------------------------------
// Deterministic hash of a name → one of the 8 swatches, so each teammate keeps a
// consistent colour for their initials chip across the app.
export function nameIndex(name) {
  const s = String(name || "").trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % SET3_COUNT) + 1;
}
export function avatarSolid(name) {
  return set3Solid(nameIndex(name));
}
export function initialsOf(firstName, lastName) {
  const a = (firstName || "").trim()[0] || "";
  const b = (lastName || "").trim()[0] || "";
  return (a + b).toUpperCase() || "?";
}

// --- Support thread status ---------------------------------------------------
// Identity of the conversation state. Coral = needs us; orange = waiting on
// visitor; green = resolved; teal = closed/archived.
const SUPPORT_STATUS_INDEX = {
  OPEN: 4, // coral — action needed
  PENDING: 6, // orange — awaiting reply
  RESOLVED: 7, // green — done
  CLOSED: 1, // teal — archived
};
export function supportStatusSoft(status) {
  return set3Soft(SUPPORT_STATUS_INDEX[status] || 1);
}
export function supportStatusSolid(status) {
  return set3Solid(SUPPORT_STATUS_INDEX[status] || 1);
}

// --- Presentation slide sections --------------------------------------------
// Cycle by 1-indexed order so every slide badge has its own identity.
export function slideSolid(order) {
  return set3Solid(Number(order) || 1);
}
export function slideSoft(order) {
  return set3Soft(Number(order) || 1);
}
