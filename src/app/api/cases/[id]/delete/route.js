// SUPER_ADMIN: hard-delete a case. Cascades to all attached documents,
// contract, mandate, comments, activity, invoices via FK cascade.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

export async function POST(_request, { params }) {
  const me = await getCurrentUser();
  if (!me || !can(me, PERMS.CASE_DELETE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.taxCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
