// Phase 3 §6 — staff prepares the contract + mandate. Two modes:
//   - Auto-generate: build proper PDFs from case data via pdf-lib.
//   - Upload: employee attaches their own contract/mandate PDFs (multipart).
//
// In either mode the result is: a real PDF stored, a Contract + Mandate
// row created with status SENT, the case moved to AWAITING_SIGNATURE, and
// the client notified to sign.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { setStatus, logActivity } from "@/lib/workflow";
import { activeProvider, makeKey, putFile } from "@/lib/storage";
import { sendEnvelope, isStub } from "@/lib/docusign";
import { notify } from "@/lib/notifications";
import { buildFilename } from "@/lib/filename";
import { generateContractPdf, generateMandatePdf } from "@/lib/pdf";
import { can, PERMS } from "@/lib/permissions";
import { staffCanAccessCase } from "@/lib/case-access";

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !can(user, PERMS.CASE_PREPARE_CONTRACT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await staffCanAccessCase(user, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ct = request.headers.get("content-type") || "";
  const isMultipart = ct.includes("multipart/form-data");

  let data;
  let contractUpload = null;
  let mandateUpload = null;

  if (isMultipart) {
    const form = await request.formData();
    data = {
      feeModel: String(form.get("feeModel") || ""),
      feePercent: form.get("feePercent") ? Number(form.get("feePercent")) : null,
      feeFlatAmount: form.get("feeFlatAmount") ? Number(form.get("feeFlatAmount")) : null,
      propertyName: String(form.get("propertyName") || ""),
      propertyAddress: String(form.get("propertyAddress") || ""),
      propertyCity: String(form.get("propertyCity") || ""),
      propertyZip: String(form.get("propertyZip") || ""),
      cadastralRef: String(form.get("cadastralRef") || ""),
      surface: form.get("surface") ? parseFloat(String(form.get("surface"))) : null,
      useType: String(form.get("useType") || ""),
      initialTaxAmount: form.get("initialTaxAmount") ? Number(form.get("initialTaxAmount")) : null,
    };
    const cf = form.get("contractFile");
    const mf = form.get("mandateFile");
    if (cf && typeof cf !== "string" && cf.size > 0) contractUpload = cf;
    if (mf && typeof mf !== "string" && mf.size > 0) mandateUpload = mf;
  } else {
    data = await request.json().catch(() => ({}));
  }

  if (!["PERCENT", "FLAT", "AUDIT"].includes(data.feeModel)) {
    return NextResponse.json({ error: "bad feeModel" }, { status: 400 });
  }

  const c = await prisma.taxCase.findUnique({
    where: { id },
    include: { owner: true, contract: true, mandate: true },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Persist property + fee snapshot
  await prisma.taxCase.update({
    where: { id },
    data: {
      managerId: user.id,
      propertyName: data.propertyName || c.propertyName,
      propertyAddress: data.propertyAddress || null,
      propertyCity: data.propertyCity || null,
      propertyZip: data.propertyZip || null,
      cadastralRef: data.cadastralRef || null,
      surface: data.surface ?? null,
      useType: data.useType || null,
      initialTaxAmount: data.initialTaxAmount ?? null,
      feeModel: data.feeModel,
      feePercent: data.feePercent ?? null,
      feeFlatAmount: data.feeFlatAmount ?? null,
    },
  });

  // Build PDFs — either uploaded by the employee or auto-generated
  const refreshed = await prisma.taxCase.findUnique({
    where: { id },
    include: { owner: true },
  });

  const contractBuf = contractUpload
    ? Buffer.from(await contractUpload.arrayBuffer())
    : await generateContractPdf(refreshed, refreshed.owner);
  const mandateBuf = mandateUpload
    ? Buffer.from(await mandateUpload.arrayBuffer())
    : await generateMandatePdf(refreshed, refreshed.owner);

  const contractName = buildFilename({
    user: refreshed.owner,
    kind: "CONTRACT",
    reference: refreshed.reference,
    originalName: contractUpload?.name || "contract.pdf",
  }).replace(/\.[^.]*$/, ".pdf");
  const mandateName = buildFilename({
    user: refreshed.owner,
    kind: "MANDATE",
    reference: refreshed.reference,
    originalName: mandateUpload?.name || "mandate.pdf",
  }).replace(/\.[^.]*$/, ".pdf");

  const contractKey = makeKey({ userId: refreshed.ownerId, scope: `cases/${id}/contract`, filename: contractName });
  const mandateKey = makeKey({ userId: refreshed.ownerId, scope: `cases/${id}/mandate`, filename: mandateName });
  const contractStored = await putFile({ key: contractKey, buffer: contractBuf, mimeType: "application/pdf" });
  const mandateStored = await putFile({ key: mandateKey, buffer: mandateBuf, mimeType: "application/pdf" });

  const contractDoc = await prisma.document.create({
    data: {
      caseId: id, uploadedById: user.id, kind: "CONTRACT",
      filename: contractName, mimeType: "application/pdf",
      sizeBytes: contractStored.sizeBytes, provider: activeProvider(),
      storageKey: contractStored.key, sha256: contractStored.sha256,
    },
  });
  const mandateDoc = await prisma.document.create({
    data: {
      caseId: id, uploadedById: user.id, kind: "MANDATE",
      filename: mandateName, mimeType: "application/pdf",
      sizeBytes: mandateStored.sizeBytes, provider: activeProvider(),
      storageKey: mandateStored.key, sha256: mandateStored.sha256,
    },
  });

  // Hand off to e-signature (real or stub)
  const envContract = await sendEnvelope({
    documentBase64: contractBuf.toString("base64"),
    documentName: contractDoc.filename,
    signerEmail: refreshed.owner.email,
    signerName: `${refreshed.owner.firstName} ${refreshed.owner.lastName}`,
    caseId: id,
    kind: "contract",
  });
  const envMandate = await sendEnvelope({
    documentBase64: mandateBuf.toString("base64"),
    documentName: mandateDoc.filename,
    signerEmail: refreshed.owner.email,
    signerName: `${refreshed.owner.firstName} ${refreshed.owner.lastName}`,
    caseId: id,
    kind: "mandate",
  });

  await prisma.contract.upsert({
    where: { caseId: id },
    update: {
      feeModel: data.feeModel,
      feePercent: data.feePercent ?? null,
      feeFlatAmount: data.feeFlatAmount ?? null,
      documentId: contractDoc.id,
      signatureProvider: envContract.provider,
      signatureRequestId: envContract.envelopeId,
      status: "SENT", sentAt: new Date(),
    },
    create: {
      caseId: id,
      feeModel: data.feeModel,
      feePercent: data.feePercent ?? null,
      feeFlatAmount: data.feeFlatAmount ?? null,
      documentId: contractDoc.id,
      signatureProvider: envContract.provider,
      signatureRequestId: envContract.envelopeId,
      status: "SENT", sentAt: new Date(),
    },
  });
  await prisma.mandate.upsert({
    where: { caseId: id },
    update: {
      documentId: mandateDoc.id,
      signatureProvider: envMandate.provider,
      signatureRequestId: envMandate.envelopeId,
      status: "SENT", sentAt: new Date(),
    },
    create: {
      caseId: id,
      documentId: mandateDoc.id,
      signatureProvider: envMandate.provider,
      signatureRequestId: envMandate.envelopeId,
      status: "SENT", sentAt: new Date(),
    },
  });

  await setStatus({ caseId: id, status: "AWAITING_SIGNATURE", actorId: user.id });
  await logActivity({
    caseId: id,
    actorId: user.id,
    action: "contract.sent",
    details: { provider: envContract.provider, stub: isStub(), customUpload: !!contractUpload || !!mandateUpload },
  });

  await notify({
    userId: refreshed.ownerId,
    caseId: id,
    titleKey: "sign.contractAndMandate",
    bodyKey: "sign.explain",
    link: `/cases/${id}/sign`,
    alsoEmail: true,
  });

  return NextResponse.json({ ok: true });
}
