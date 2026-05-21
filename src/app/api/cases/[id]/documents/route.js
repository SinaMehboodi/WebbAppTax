// Upload an additional document to a case (Phase 4) or any other doc kind.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { activeProvider, makeKey, putFile } from "@/lib/storage";
import { logActivity, setStatus } from "@/lib/workflow";
import { notifyStaff } from "@/lib/notifications";
import { buildFilename } from "@/lib/filename";

const MAX_BYTES = 20 * 1024 * 1024;
const VALID_KINDS = [
  "PROPERTY_PLAN", "LEASE", "PHOTO", "CADASTRAL", "ID_PROOF",
  "COMPANY_PROOF", "OTHER", "TAX_NOTICE", "ADMIN_RESPONSE",
  "CONTRACT", "MANDATE",
];

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const c = await prisma.taxCase.findUnique({
    where: { id },
    include: {
      owner: { select: { firstName: true, lastName: true } },
      docRequests: { where: { fulfilled: false } },
    },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (user.role === "USER" && c.ownerId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kindIn = String(form.get("kind") || "OTHER");
  const requestId = form.get("requestId") ? String(form.get("requestId")) : null;
  const kind = VALID_KINDS.includes(kindIn) ? kindIn : "OTHER";

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const friendly = buildFilename({
    user: c.owner,
    kind,
    reference: c.reference,
    originalName: file.name,
  });
  const key = makeKey({ userId: c.ownerId, scope: `cases/${id}`, filename: friendly });
  const stored = await putFile({ key, buffer, mimeType: file.type });

  const doc = await prisma.document.create({
    data: {
      caseId: id,
      uploadedById: user.id,
      kind,
      filename: friendly,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: stored.sizeBytes,
      provider: activeProvider(),
      storageKey: stored.key,
      sha256: stored.sha256,
    },
  });

  if (requestId) {
    await prisma.documentRequest.updateMany({
      where: { id: requestId, caseId: id },
      data: { fulfilled: true, fulfilledAt: new Date() },
    });
  }

  await logActivity({
    caseId: id,
    actorId: user.id,
    action: "doc.uploaded",
    details: { docId: doc.id, kind, filename: friendly },
  });

  if (user.role === "USER" && c.status === "AWAITING_DOCUMENTS") {
    const remaining = await prisma.documentRequest.count({
      where: { caseId: id, fulfilled: false },
    });
    if (remaining === 0) {
      await setStatus({ caseId: id, status: "DOCUMENTS_RECEIVED", actorId: user.id });
      await notifyStaff({
        titleKey: "status.DOCUMENTS_RECEIVED",
        link: `/admin/cases/${id}`,
        caseId: id,
      });
    }
  }

  return NextResponse.json({ ok: true, id: doc.id, filename: friendly }, { status: 201 });
}
