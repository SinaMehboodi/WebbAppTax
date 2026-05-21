// ADMIN/SUPER_ADMIN: set the EMPLOYEE's permission keys.
// SUPER_ADMIN_ONLY keys are stripped out — they can never be granted to an
// EMPLOYEE through this UI.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canGrantPerms, filterGrantable } from "@/lib/permissions";

const Schema = z.object({
  permissions: z.array(z.string().min(1).max(64)).max(64),
});

export async function POST(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canGrantPerms(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const cleaned = filterGrantable(parsed.data.permissions);

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.user.update({
    where: { id },
    data: { permissions: cleaned },
  });
  return NextResponse.json({ ok: true, count: cleaned.length });
}
