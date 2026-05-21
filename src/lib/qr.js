// QR code generation. Returns a data URL the page can embed as <img>.
import "server-only";
import QRCode from "qrcode";

export async function qrDataUrl(text, opts = {}) {
  return QRCode.toDataURL(text, {
    width: opts.width || 240,
    margin: opts.margin ?? 1,
    color: opts.color || { dark: "#0a0a0a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
