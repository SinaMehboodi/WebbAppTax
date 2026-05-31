// Phase 4 §3 — staff creates a request for an additional document. Updates
// case status to AWAITING_DOCUMENTS and notifies the client.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { setStatus, logActivity } from "@/lib/workflow";
import { notify } from "@/lib/notifications";
import { can, PERMS } from "@/lib/permissions";
import { staffCanAccessCase } from "@/lib/case-access";

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !can(user, PERMS.CASE_REQUEST_DOCS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await staffCanAccessCase(user, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { label, description } = await request.json().catch(() => ({}));
  if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });

  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.documentRequest.create({
    data: { caseId: id, label, description: description || null },
  });
  await setStatus({ caseId: id, status: "AWAITING_DOCUMENTS", actorId: user.id });
  await logActivity({ caseId: id, actorId: user.id, action: "doc.requested", details: { label } });
  await notify({
    userId: c.ownerId,
    caseId: id,
    titleKey: "cases.additionalDocsRequested",
    link: `/cases/${id}`,
    alsoEmail: true,
  });
  return NextResponse.json({ ok: true });
}
