// Close a case — three terminal outcomes:
//   - finish   → status CLOSED (success)
//   - stop     → status STOPPED (paused / halted)
//   - cancel   → status CANCELLED (abandoned)
//
// Stop and cancel require a reason. Permission gated by case.close.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";
import { setStatus, logActivity } from "@/lib/workflow";
import { notify } from "@/lib/notifications";

const Schema = z.object({
  outcome: z.enum(["finish", "stop", "cancel"]),
  reason: z.string().trim().max(2000).optional(),
});

const STATUS_BY_OUTCOME = {
  finish: "CLOSED",
  stop:   "STOPPED",
  cancel: "CANCELLED",
};

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can(user, PERMS.CASE_CLOSE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { outcome, reason } = parsed.data;
  if ((outcome === "stop" || outcome === "cancel") && (!reason || reason.length < 3)) {
    return NextResponse.json({ error: "reason.required" }, { status: 400 });
  }

  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const newStatus = STATUS_BY_OUTCOME[outcome];
  await prisma.taxCase.update({
    where: { id },
    data: {
      status: newStatus,
      closeReason: outcome === "finish" ? (reason || null) : reason,
      closedAt: new Date(),
      archived: outcome !== "finish" ? true : c.archived, // cancel/stop archive immediately
    },
  });

  await logActivity({
    caseId: id,
    actorId: user.id,
    action: `case.${outcome}`,
    details: { reason: reason || null, by: user.id, role: user.role },
  });
  await setStatus({ caseId: id, status: newStatus, actorId: user.id, note: reason });

  // Notify the client
  await notify({
    userId: c.ownerId,
    caseId: id,
    titleKey: `clientStatus.${newStatus}`,
    bodyKey: outcome === "finish" ? null : "case.closeReasonNotif",
    params: reason ? { reason } : null,
    link: `/cases/${id}`,
    alsoEmail: true,
    alsoPush: true,
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
