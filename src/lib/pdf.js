// PDF generation + signature stamping with pdf-lib.
import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const A4 = [595.28, 841.89];

function fmtMoney(n) {
  if (n == null || n === "") return "—";
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(x);
}

function feeLine(c) {
  if (c.feeModel === "PERCENT" && c.feePercent != null) {
    return `Honoraires de mission : ${Number(c.feePercent)} % du gain net obtenu.`;
  }
  if (c.feeModel === "AUDIT" && c.feeFlatAmount != null) {
    return `Forfait audit : ${fmtMoney(c.feeFlatAmount)} HT.`;
  }
  if (c.feeModel === "FLAT" && c.feeFlatAmount != null) {
    return `Forfait : ${fmtMoney(c.feeFlatAmount)} HT.`;
  }
  return "Honoraires : à préciser au contrat.";
}

async function newDoc(title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setProducer("SamTaxco");
  pdf.setCreator("SamTaxco");
  pdf.setCreationDate(new Date());
  return pdf;
}

function drawHeader(page, font, boldFont, title, ref) {
  const { width } = page.getSize();
  page.drawRectangle({
    x: 0, y: 800, width, height: 42,
    color: rgb(0.04, 0.31, 0.27), // brand teal-ish band
  });
  page.drawText("SAMTAXCO", {
    x: 40, y: 815, size: 14, font: boldFont, color: rgb(0.98, 0.98, 0.98),
  });
  page.drawText("Gestion des impôts directs locaux", {
    x: 110, y: 818, size: 8, font: font, color: rgb(0.85, 0.95, 0.92),
  });
  page.drawText(title, {
    x: 40, y: 760, size: 22, font: boldFont, color: rgb(0.05, 0.05, 0.05),
  });
  page.drawText(`Référence : ${ref}`, {
    x: 40, y: 740, size: 10, font: font, color: rgb(0.4, 0.4, 0.4),
  });
  page.drawLine({
    start: { x: 40, y: 725 }, end: { x: width - 40, y: 725 },
    thickness: 0.5, color: rgb(0.85, 0.85, 0.85),
  });
}

function drawParas(page, font, boldFont, paras, startY) {
  const { width } = page.getSize();
  let y = startY;
  const lineHeight = 14;
  for (const block of paras) {
    if (block.title) {
      y -= 8;
      page.drawText(block.title, { x: 40, y, size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight + 4;
    }
    for (const line of wrapLines(block.text, font, 10, width - 80)) {
      page.drawText(line, { x: 40, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
      y -= lineHeight;
    }
    y -= 8;
  }
  return y;
}

function wrapLines(text, font, size, maxWidth) {
  if (!text) return [];
  const out = [];
  for (const para of String(text).split("\n")) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const tentative = line ? line + " " + w : w;
      const wWidth = font.widthOfTextAtSize(tentative, size);
      if (wWidth > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = tentative;
      }
    }
    if (line) out.push(line);
    if (words.length === 0) out.push("");
  }
  return out;
}

function drawSignatureBlocks(page, font, boldFont, signerName) {
  const { width } = page.getSize();
  const y = 90;
  page.drawLine({
    start: { x: 40, y: y + 50 }, end: { x: 250, y: y + 50 },
    thickness: 0.5, color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText("Pour SamTaxco", { x: 40, y, size: 9, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
  page.drawText("Représentant agréé", { x: 40, y: y - 12, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

  page.drawLine({
    start: { x: width - 250, y: y + 50 }, end: { x: width - 40, y: y + 50 },
    thickness: 0.5, color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText(`Pour le client — ${signerName}`, {
    x: width - 250, y, size: 9, font: boldFont, color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText("Signature électronique", {
    x: width - 250, y: y - 12, size: 8, font, color: rgb(0.4, 0.4, 0.4),
  });
}

export async function generateContractPdf(c, ownerLike) {
  const pdf = await newDoc(`Contrat ${c.reference}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage(A4);
  drawHeader(page, font, bold, "CONTRAT DE MISSION", c.reference);

  const signer = `${ownerLike.firstName} ${ownerLike.lastName}`;
  const property = c.propertyName || c.propertyAddress || "—";

  drawParas(page, font, bold, [
    {
      title: "Entre les soussignés",
      text:
        `• ${signer} (${ownerLike.email})\n` +
        `• SamTaxco — gestion et optimisation des impôts directs locaux`,
    },
    {
      title: "Objet de la mission",
      text:
        `Analyse, contestation et optimisation de l'impôt ${c.taxType} ${c.taxYear}\n` +
        `Bien concerné : ${property}\n` +
        (c.propertyAddress ? `Adresse : ${c.propertyAddress}\n` : "") +
        (c.cadastralRef ? `Référence cadastrale : ${c.cadastralRef}\n` : ""),
    },
    {
      title: "Honoraires",
      text: feeLine(c),
    },
    {
      title: "Conditions essentielles",
      text:
        "Aucune action n'est engagée auprès de l'administration avant la signature du présent contrat et du mandat associé.\n" +
        "La facturation intervient à l'issue de la mission, sur la base du résultat obtenu et selon le modèle d'honoraires retenu.",
    },
  ], 705);

  drawSignatureBlocks(page, font, bold, signer);
  return Buffer.from(await pdf.save());
}

export async function generateMandatePdf(c, ownerLike) {
  const pdf = await newDoc(`Mandat ${c.reference}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage(A4);
  drawHeader(page, font, bold, "MANDAT", c.reference);

  const signer = `${ownerLike.firstName} ${ownerLike.lastName}`;
  const property = c.propertyName || c.propertyAddress || "—";

  drawParas(page, font, bold, [
    {
      title: "Mandant",
      text: `${signer}\n${ownerLike.email}`,
    },
    {
      title: "Objet du mandat",
      text:
        `${signer} mandate SamTaxco pour effectuer toutes les démarches\n` +
        `nécessaires auprès de l'administration fiscale concernant\n` +
        `l'impôt ${c.taxType} ${c.taxYear}.`,
    },
    {
      title: "Bien concerné",
      text:
        `${property}\n` +
        (c.propertyAddress ? `${c.propertyAddress}\n` : "") +
        (c.cadastralRef ? `Référence cadastrale : ${c.cadastralRef}` : ""),
    },
    {
      title: "Durée",
      text: "Le présent mandat reste valable jusqu'à la clôture de la mission ou révocation expresse écrite.",
    },
  ], 705);

  drawSignatureBlocks(page, font, bold, signer);
  return Buffer.from(await pdf.save());
}

/**
 * Stamp a PNG signature onto an existing PDF (last page, bottom-right) and
 * append a signature-audit page with the legally relevant evidence (signer
 * details, UTC timestamp, IP, user agent, hashes of source + signed PDF).
 *
 * The returned buffer is the final SIGNED_DOC.
 */
export async function stampSignaturePdf(originalPdfBytes, signaturePngBytes, signerName, when = new Date(), audit = null) {
  const pdf = await PDFDocument.load(originalPdfBytes);
  const png = await pdf.embedPng(signaturePngBytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const small = await pdf.embedFont(StandardFonts.Helvetica);

  const pages = pdf.getPages();
  const page = pages[pages.length - 1];
  const { width } = page.getSize();

  // Signature box bottom-right
  const boxX = width - 250;
  const boxY = 100;
  const boxW = 210;
  const boxH = 80;

  page.drawRectangle({
    x: boxX, y: boxY, width: boxW, height: boxH,
    borderColor: rgb(0.04, 0.59, 0.41), borderWidth: 0.6,
    color: rgb(0.98, 1, 0.98),
  });

  const ratio = png.width / png.height;
  let drawW = boxW - 10;
  let drawH = drawW / ratio;
  if (drawH > boxH - 10) {
    drawH = boxH - 10;
    drawW = drawH * ratio;
  }
  page.drawImage(png, {
    x: boxX + (boxW - drawW) / 2,
    y: boxY + (boxH - drawH) / 2,
    width: drawW,
    height: drawH,
  });

  page.drawText(signerName, {
    x: boxX, y: boxY - 14, size: 9, font, color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(`Signé électroniquement le ${when.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Europe/Paris)`, {
    x: boxX, y: boxY - 26, size: 7.5, font: small, color: rgb(0.4, 0.4, 0.4),
  });

  if (audit) {
    appendAuditPage(pdf, font, small, audit);
  }

  return Buffer.from(await pdf.save());
}

function appendAuditPage(pdf, bold, font, audit) {
  const page = pdf.addPage(A4);
  drawHeader(page, font, bold, "ATTESTATION DE SIGNATURE ÉLECTRONIQUE", audit.reference);

  let y = 695;
  page.drawText("Conforme au règlement eIDAS — niveau de signature simple.", {
    x: 40, y, size: 9, font, color: rgb(0.3, 0.3, 0.3),
  });
  y -= 28;

  const sections = [
    {
      title: "Document signé",
      rows: [
        ["Type", audit.docKind],
        ["Référence", audit.reference],
        ["Nom du fichier source", audit.sourceFilename || "—"],
        ["Empreinte SHA-256 (source)", audit.sourceSha256],
        ["Empreinte SHA-256 (image de signature)", audit.signatureSha256],
      ],
    },
    {
      title: "Signataire",
      rows: [
        ["Nom complet", audit.signerName],
        ["Adresse e-mail", audit.signerEmail],
        ["Identifiant interne", audit.signerId],
      ],
    },
    {
      title: "Preuve de signature",
      rows: [
        ["Date / heure (UTC)", audit.signedAtUtc],
        ["Date / heure (Europe/Paris)", audit.signedAtLocal],
        ["Adresse IP", audit.ip],
        ["Agent utilisateur", audit.userAgent],
        ["Consentement explicite", audit.consent ? "Oui — case cochée par le signataire" : "—"],
        ["Identifiant d'envelope", audit.envelopeId || "—"],
      ],
    },
  ];

  for (const sec of sections) {
    page.drawText(sec.title, { x: 40, y, size: 12, font: bold, color: rgb(0.05, 0.4, 0.3) });
    y -= 18;
    for (const [k, v] of sec.rows) {
      page.drawText(k, { x: 40, y, size: 9, font: bold, color: rgb(0.15, 0.15, 0.15) });
      const valueLines = wrapLines(String(v || "—"), font, 9, 350);
      const startX = 220;
      let firstLine = true;
      for (const line of valueLines) {
        page.drawText(line, { x: startX, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        if (!firstLine) y -= 12;
        firstLine = false;
      }
      y -= 14;
    }
    y -= 8;
  }

  // Footer
  page.drawLine({ start: { x: 40, y: 70 }, end: { x: 555, y: 70 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  page.drawText(
    "Cette attestation est jointe au document signé et constitue une preuve technique conservée par SamTaxco.",
    { x: 40, y: 56, size: 8, font, color: rgb(0.4, 0.4, 0.4) }
  );
  page.drawText(`Émise le ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`, {
    x: 40, y: 44, size: 8, font, color: rgb(0.4, 0.4, 0.4),
  });
}
