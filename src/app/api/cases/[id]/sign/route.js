// Client signs the contract or mandate. Accepts a base64 PNG of the
// hand-drawn signature, embeds it into the original PDF via pdf-lib, appends
// a tamper-evident audit page (signer + IP + UA + UTC timestamp + SHA-256),
// and saves the result as a SIGNED_DOC.
//
// The audit data is also persisted as an ActivityLog entry with action
// "signature.audit" so it can be replayed on the case detail page even if
// the PDF is downloaded and detached.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { logActivity, setStatus } from "@/lib/workflow";
import { notify } from "@/lib/notifications";
import { activeProvider, makeKey, putFile, getFile } from "@/lib/storage";
import { buildFilename } from "@/lib/filename";
import { stampSignaturePdf } from "@/lib/pdf";
import { getClientIp, getUserAgent, sha256Hex } from "@/lib/audit";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { z } from "zod";

// Max signature image payload (PNG) before base64 overhead: ~2 MB
const MAX_PNG_BYTES = 2 * 1024 * 1024;
const Schema = z.object({
  kind: z.enum(["contract", "mandate"]),
  // base64 PNG data URL — bound the length so we don't burn memory on giant payloads
  signatureDataUrl: z.string().startsWith("data:image/png;base64,").max(Math.ceil(MAX_PNG_BYTES * 1.4) + 64),
  consent: z.literal(true),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey(`sign:${user.id}`, ip), max: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate.tooManyAttempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "consent") {
      return NextResponse.json({ error: "consent required" }, { status: 400 });
    }
    return NextResponse.json({ error: "signature required" }, { status: 400 });
  }
  const { kind, signatureDataUrl } = parsed.data;

  const c = await prisma.taxCase.findUnique({
    where: { id },
    include: {
      contract: { include: { case: false } },
      mandate: true,
      owner: true,
    },
  });
  if (!c || c.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (c.status !== "AWAITING_SIGNATURE" && !["SIGNED", "ACTIVE"].includes(c.status)) {
    return NextResponse.json({ error: "case not in signature state" }, { status: 409 });
  }

  const target = kind === "contract" ? c.contract : c.mandate;
  if (!target) return NextResponse.json({ error: "source document missing" }, { status: 400 });
  if (target.status === "SIGNED") {
    return NextResponse.json({ error: "already signed" }, { status: 409 });
  }
  const srcDocId = target.documentId;
  if (!srcDocId) return NextResponse.json({ error: "source document missing" }, { status: 400 });
  const srcDoc = await prisma.document.findUnique({ where: { id: srcDocId } });
  if (!srcDoc) return NextResponse.json({ error: "source document missing" }, { status: 400 });

  // Decode signature + enforce hard size cap on the decoded payload
  const pngBytes = Buffer.from(
    signatureDataUrl.replace(/^data:image\/png;base64,/, ""),
    "base64"
  );
  if (pngBytes.length === 0 || pngBytes.length > MAX_PNG_BYTES) {
    return NextResponse.json({ error: "signature required" }, { status: 400 });
  }

  // Collect audit evidence BEFORE stamping so it can be baked into the PDF
  const now = new Date();
  const ua = getUserAgent(request);
  const originalBytes = await getFile(srcDoc.storageKey);
  const sourceSha = sha256Hex(originalBytes);
  const signatureSha = sha256Hex(pngBytes);

  const signerName = `${c.owner.firstName} ${c.owner.lastName}`;
  const auditForPdf = {
    docKind: kind.toUpperCase(),
    reference: c.reference,
    sourceFilename: srcDoc.filename,
    sourceSha256: sourceSha,
    signatureSha256: signatureSha,
    signerName,
    signerEmail: c.owner.email,
    signerId: c.ownerId,
    signedAtUtc: now.toISOString(),
    signedAtLocal: now.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }),
    ip,
    userAgent: ua,
    consent: true,
    envelopeId: target.signatureRequestId,
  };

  // Stamp the PDF + append audit page
  const signedBytes = await stampSignaturePdf(originalBytes, pngBytes, signerName, now, auditForPdf);
  const signedSha = sha256Hex(signedBytes);

  // Persist signed PDF
  const signedName = buildFilename({
    user: c.owner,
    kind: `SIGNED_${kind.toUpperCase()}`,
    reference: c.reference,
    originalName: "signed.pdf",
  });
  const signedKey = makeKey({
    userId: c.ownerId,
    scope: `cases/${id}/signed-${kind}`,
    filename: signedName,
  });
  const stored = await putFile({ key: signedKey, buffer: signedBytes, mimeType: "application/pdf" });
  const signedDoc = await prisma.document.create({
    data: {
      caseId: id, uploadedById: user.id, kind: "SIGNED_DOC",
      filename: signedName, mimeType: "application/pdf",
      sizeBytes: stored.sizeBytes, provider: activeProvider(),
      storageKey: stored.key, sha256: stored.sha256,
      notes: `Signature ${kind} · ${signedSha.slice(0, 12)}`,
    },
  });

  if (kind === "contract") {
    await prisma.contract.update({
      where: { id: c.contract.id },
      data: { status: "SIGNED", signedAt: now, signedDocumentId: signedDoc.id },
    });
  } else {
    await prisma.mandate.update({
      where: { id: c.mandate.id },
      data: { status: "SIGNED", signedAt: now, signedDocumentId: signedDoc.id },
    });
  }

  // Persist the audit log entry (independent of the PDF so it can be queried)
  await logActivity({
    caseId: id,
    actorId: user.id,
    action: "signature.audit",
    details: {
      kind,
      signerName,
      signerEmail: c.owner.email,
      signedAtUtc: now.toISOString(),
      ip,
      userAgent: ua,
      sourceDocumentId: srcDocId,
      sourceSha256: sourceSha,
      signedDocumentId: signedDoc.id,
      signedSha256: signedSha,
      signatureSha256: signatureSha,
      envelopeId: target.signatureRequestId,
      provider: target.signatureProvider || "stub",
      consent: true,
    },
  });
  await logActivity({ caseId: id, actorId: user.id, action: `${kind}.signed` });

  const updated = await prisma.taxCase.findUnique({
    where: { id },
    include: { contract: true, mandate: true },
  });

  if (updated.contract?.status === "SIGNED" && updated.mandate?.status === "SIGNED") {
    await setStatus({ caseId: id, status: "SIGNED", actorId: user.id });
    await notify({
      userId: user.id,
      caseId: id,
      titleKey: "status.ACTIVE",
      bodyKey: "sign.afterBody",
      link: `/cases/${id}`,
      alsoEmail: true,
    });
    await setStatus({ caseId: id, status: "ACTIVE", actorId: user.id });
  }

  return NextResponse.json({
    ok: true,
    signedDocumentId: signedDoc.id,
    signedSha256: signedSha,
  });
}
