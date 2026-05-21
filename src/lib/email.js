// Email sender.
//
// Modes (in priority order):
//   1. RESEND_API_KEY set  -> POST to https://api.resend.com (recommended).
//      Also requires EMAIL_FROM (e.g. "SamTaxco <noreply@your-domain.com>").
//   2. SMTP_URL set        -> use nodemailer with that URL
//      e.g. "smtps://user:pass@smtp.gmail.com:465". Also needs EMAIL_FROM.
//   3. otherwise           -> write the email to ./outbox/*.json so devs can
//      read verification codes during local development.
//
// In dev mode we ALSO log the code/link to the server console so you don't
// even have to open the outbox folder.
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const OUTBOX_DIR = path.resolve(process.env.EMAIL_OUTBOX || "./outbox");
const FROM = process.env.EMAIL_FROM || "SamTaxco <noreply@samtaxco.local>";

export async function send({ to, subject, text, html }) {
  // 1. Resend (preferred)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM, to, subject, text, html }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[email] resend failed:", res.status, body);
      } else {
        console.log(`[email] resend -> ${to}: ${subject}`);
        return { ok: true, provider: "resend" };
      }
    } catch (err) {
      console.error("[email] resend error:", err.message);
    }
    // fall through to outbox so the user can still see the code
  }

  // 2. nodemailer SMTP
  if (process.env.SMTP_URL) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport(process.env.SMTP_URL);
      await transporter.sendMail({ from: FROM, to, subject, text, html });
      console.log(`[email] smtp -> ${to}: ${subject}`);
      return { ok: true, provider: "smtp" };
    } catch (err) {
      console.error("[email] smtp error:", err.message);
    }
  }

  // 3. dev outbox
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const payload = { to, subject, text, html, sentAt: new Date().toISOString() };
  console.log(`[email] outbox -> ${to}: ${subject}`);
  console.log(`[email] body:\n${text}`);
  try {
    await fs.mkdir(OUTBOX_DIR, { recursive: true });
    await fs.writeFile(path.join(OUTBOX_DIR, `${stamp}.json`), JSON.stringify(payload, null, 2));
  } catch (err) {
    console.warn("[email] could not write outbox:", err.message);
  }
  return { ok: true, provider: "outbox" };
}

export async function sendVerification({ to, code, link, locale = "fr" }) {
  const subj = locale === "fr"
    ? "Vérifiez votre compte SamTaxco"
    : "Verify your SamTaxco account";
  const body = locale === "fr"
    ? `Votre code de vérification : ${code}\n\nOu cliquez sur ce lien : ${link}`
    : `Your verification code: ${code}\n\nOr click this link: ${link}`;
  return send({ to, subject: subj, text: body });
}

export async function sendResetLink({ to, link, locale = "fr" }) {
  const subj = locale === "fr" ? "Réinitialisez votre mot de passe" : "Reset your password";
  const body = locale === "fr"
    ? `Pour définir un nouveau mot de passe, cliquez ici : ${link}`
    : `To set a new password, click here: ${link}`;
  return send({ to, subject: subj, text: body });
}

// Onboarding — a staff member registered a client; the client now needs to
// set their password & log in for the first time. The link goes to
// /reset-password?token=...&onboarding=1.
export async function sendOnboardingLink({ to, link, byName, locale = "fr" }) {
  const subj = locale === "fr"
    ? "Activez votre compte SamTaxco"
    : "Activate your SamTaxco account";
  const intro = locale === "fr"
    ? `${byName} vient de créer votre compte SamTaxco.\n\n` +
      `Pour finaliser l'activation, choisissez votre mot de passe en cliquant sur ce lien (valable 7 jours) :\n${link}`
    : `${byName} just created your SamTaxco account.\n\n` +
      `To finish activation, set your password by clicking this link (valid for 7 days):\n${link}`;
  return send({ to, subject: subj, text: intro });
}
