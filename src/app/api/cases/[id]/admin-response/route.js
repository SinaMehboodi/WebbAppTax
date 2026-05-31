// Post-payment step — staff record the tax administration's response letter and
// deliver it to the client. The letter itself is uploaded as an ADMIN_RESPONSE
// document (via /documents); this route flips the case to the ADMIN_RESPONSE
// milestone and notifies the client. Per the firm's process this happens AFTER
// the client has paid (the case stays open at PAID until then).
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
  if (!user || !can(user, PERMS.CASE_RECORD_RESULT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await staffCanAccessCase(user, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  // The administration's letter must be attached first (uploaded as an
  // ADMIN_RESPONSE document) so the client actually receives something.
  const letters = await prisma.document.count({
    where: { caseId: id, kind: "ADMIN_RESPONSE" },
  });
  if (letters === 0) {
    return NextResponse.json({ error: "letter.required" }, { status: 400 });
  }

  const { note } = await request.json().catch(() => ({}));

  await setStatus({ caseId: id, status: "ADMIN_RESPONSE", actorId: user.id, note: note || null });
  await logActivity({
    caseId: id,
    actorId: user.id,
    action: "admin.response",
    details: { note: note || null },
  });
  await notify({
    userId: c.ownerId,
    caseId: id,
    titleKey: "adminResp.notifyTitle",
    bodyKey: "adminResp.notifyBody",
    link: `/cases/${id}`,
    alsoEmail: true,
  });

  return NextResponse.json({ ok: true });
}
