// Phase 4 §5 — client requests an on-site measurement when they can't
// provide a property plan. We just file a comment + notify staff for V1.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notifyStaff } from "@/lib/notifications";
import { logActivity } from "@/lib/workflow";

export async function POST(_request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c || c.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.comment.create({
    data: {
      caseId: id,
      authorId: user.id,
      body: "Client a demandé une visite et un relevé sur place.",
      internal: false,
    },
  });
  await logActivity({ caseId: id, actorId: user.id, action: "visit.requested" });
  await notifyStaff({
    titleKey: "cases.requestVisit",
    link: `/admin/cases/${id}`,
    caseId: id,
  });
  return NextResponse.json({ ok: true });
}
