// Build a human-readable filename so admins can see "DURAN_Samuel-TF-2025-2026-05-19-15-32.pdf"
// instead of a UUID blob. The original extension is preserved.
import "server-only";
import path from "node:path";

export function safeSegment(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function timestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/**
 * Build a friendly filename for an uploaded document.
 *
 *   buildFilename({
 *     user: { firstName: "Jean", lastName: "Client" },
 *     kind: "TAX_NOTICE",
 *     reference: "TF-2025-0001",
 *     originalName: "scan.pdf",
 *   })
 *   -> "CLIENT_Jean-TAX_NOTICE-TF-2025-0001-2026-05-19-153201.pdf"
 */
export function buildFilename({ user, kind, reference, originalName, when }) {
  const ext = path.extname(originalName || "").toLowerCase() || "";
  const parts = [
    safeSegment((user?.lastName || "").toUpperCase()),
    safeSegment(user?.firstName || ""),
    safeSegment(kind || ""),
    safeSegment(reference || ""),
    timestamp(when),
  ].filter(Boolean);
  return parts.join("-") + ext;
}
