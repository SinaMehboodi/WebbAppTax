// GET — serve a stored document (access-controlled).
// DELETE — remove a document. A client can delete their own uploads, but
// NOT contracts/mandates/signed documents (those are legally binding). Staff
// can delete any document on cases they manage.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getFile, presignedGetUrl } from "@/lib/storage";
import { logActivity } from "@/lib/workflow";
import { can, PERMS } from "@/lib/permissions";
import { staffCanAccessCase } from "@/lib/case-access";

const PROTECTED_KINDS = new Set(["CONTRACT", "MANDATE", "SIGNED_DOC", "INVOICE"]);

export async function GET(_request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { case: { select: { ownerId: true } } },
  });
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = doc.case && doc.case.ownerId === user.id;
  const isStaff = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role);
  const staffOk = isStaff && (!doc.caseId || (await staffCanAccessCase(user, doc.caseId)));
  if (!isOwner && !staffOk) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // If S3 is configured, redirect to a short-lived pre-signed URL so the
  // client downloads directly from object storage (no proxy memory load).
  const signed = await presignedGetUrl(doc.storageKey, 300);
  if (signed) {
    return NextResponse.redirect(signed, 302);
  }

  const buf = await getFile(doc.storageKey);
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      "Content-Length": String(buf.length),
    },
  });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { case: true },
  });
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = doc.case && doc.case.ownerId === user.id;
  const isStaff = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role);
  const staffOk = isStaff && (!doc.caseId || (await staffCanAccessCase(user, doc.caseId)));

  if (!isOwner && !staffOk) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Protected kinds (contract/mandate/signed/invoice) can only be removed
  // by someone with the destructive case.delete_files permission — that's
  // SUPER_ADMIN only.
  if (PROTECTED_KINDS.has(doc.kind) && !can(user, PERMS.CASE_DELETE_FILES)) {
    return NextResponse.json(
      { error: "This document type cannot be deleted." },
      { status: 403 }
    );
  }
  // If the case is already past DRAFT/CONTRACT_PREPARING/AWAITING_DOCUMENTS,
  // clients shouldn't be able to remove the original tax notice — it's the
  // basis of an active mission.
  if (
    !isStaff &&
    doc.kind === "TAX_NOTICE" &&
    doc.case &&
    !["DRAFT", "CONTRACT_PREPARING", "AWAITING_DOCUMENTS"].includes(doc.case.status)
  ) {
    return NextResponse.json(
      { error: "Cannot delete the tax notice while the mission is active." },
      { status: 403 }
    );
  }

  await prisma.document.delete({ where: { id } });

  if (doc.caseId) {
    await logActivity({
      caseId: doc.caseId,
      actorId: user.id,
      action: "doc.deleted",
      details: { kind: doc.kind, filename: doc.filename },
    });
  }

  // Best-effort: leave the underlying storage file alone in V1. A daily
  // cleanup job can sweep orphans. Deleting immediately would risk losing
  // a file referenced elsewhere.

  return NextResponse.json({ ok: true });
}
