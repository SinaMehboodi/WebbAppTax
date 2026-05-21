// Send a notification across in-app, email and push channels in one call.
// Localization happens here (server-side) using the recipient's locale.
import "server-only";
import { prisma } from "./prisma";
import { send as sendEmail } from "./email";
import { getDictionary } from "./dictionary";
import { pushToUser, pushEnabled } from "./push";

/**
 * Create an in-app notification and fan out to email/push as requested.
 *
 *   notify({
 *     userId,          // required — recipient
 *     caseId,          // optional — surfaces the notification under the case
 *     titleKey,        // i18n key for the title
 *     bodyKey,         // i18n key for the body (optional)
 *     params,          // i18n interpolation params (optional)
 *     link,            // deep link clicked on click
 *     alsoEmail,       // also send email
 *     alsoPush = true, // also send push (default on)
 *   })
 */
export async function notify({
  userId,
  caseId = null,
  titleKey,
  bodyKey = null,
  params = null,
  link = null,
  alsoEmail = false,
  alsoPush = true,
}) {
  const n = await prisma.notification.create({
    data: { userId, caseId, titleKey, bodyKey, params, link, channel: "IN_APP" },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return n;

  // Resolve once, using the recipient's preferred locale
  const { t } = await getDictionary(user.locale || "fr");
  const title = t(titleKey, params || {});
  const body = bodyKey ? t(bodyKey, params || {}) : "";

  if (alsoEmail) {
    try {
      await sendEmail({
        to: user.email,
        subject: title,
        text: [body, link ? `\n${absoluteUrl(link)}` : ""].filter(Boolean).join("\n"),
        html: emailHtml({ title, body, link, name: user.firstName }),
      });
    } catch (err) {
      console.error("[notify] email failed:", err.message);
    }
  }

  if (alsoPush && pushEnabled()) {
    try {
      await pushToUser({ userId, title, body, url: link || "/", tag: caseId || "mindset" });
    } catch (err) {
      console.error("[notify] push failed:", err.message);
    }
  }
  return n;
}

export async function notifyStaff({ titleKey, bodyKey, link, params, caseId }) {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "EMPLOYEE"] } },
    select: { id: true },
  });
  await Promise.all(
    staff.map((s) =>
      notify({
        userId: s.id,
        caseId: caseId || null,
        titleKey,
        bodyKey,
        params,
        link,
        alsoEmail: false,
        alsoPush: true,
      })
    )
  );
}

function absoluteUrl(link) {
  const base = process.env.APP_URL || "";
  if (!link) return base;
  if (link.startsWith("http")) return link;
  return `${base}${link.startsWith("/") ? "" : "/"}${link}`;
}

function emailHtml({ title, body, link, name }) {
  const url = link ? absoluteUrl(link) : "";
  const cta = url
    ? `<a href="${url}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#10b981;color:#fff;text-decoration:none;font-weight:600">Ouvrir l'application</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f1;font-family:Helvetica,Arial,sans-serif;color:#1c1917">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e7e5e0">
        <tr><td style="background:linear-gradient(135deg,#10b981,#0d9488);padding:24px 28px;color:#fff">
          <div style="font-weight:700;font-size:18px;letter-spacing:.5px">SAMTAXCO</div>
          <div style="opacity:.85;font-size:12px">Gestion des impôts directs locaux</div>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;font-size:14px">
          ${name ? `<p style="margin:0 0 12px">Bonjour <strong>${escapeHtml(name)}</strong>,</p>` : ""}
          <h1 style="margin:0 0 8px;font-size:20px">${escapeHtml(title)}</h1>
          ${body ? `<p style="margin:0 0 18px;color:#57534e;line-height:1.5">${escapeHtml(body)}</p>` : ""}
          ${cta ? `<p style="margin:18px 0 8px">${cta}</p>` : ""}
        </td></tr>
        <tr><td style="padding:18px 28px 28px;color:#a8a29e;font-size:11px;border-top:1px solid #f5f5f1">
          Vous recevez ce message car votre compte SamTaxco l'a déclenché.
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
