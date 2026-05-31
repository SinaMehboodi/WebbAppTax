// Back-office — change a support thread's status (and optionally claim it).
// Gated by support.manage.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

const Schema = z.object({
  status: z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]),
  assignToMe: z.boolean().optional(),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can(user, PERMS.SUPPORT_MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const thread = await prisma.supportThread.findUnique({ where: { id }, select: { id: true } });
  if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.supportThread.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.assignToMe ? { assignedToId: user.id } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
