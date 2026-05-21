// Admin-only: update + delete a single presentation section.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

const PatchSchema = z.object({
  titleFr: z.string().trim().min(1).max(120).optional(),
  titleEn: z.string().trim().min(1).max(120).optional(),
  contentFr: z.string().trim().min(1).optional(),
  contentEn: z.string().trim().min(1).optional(),
  order: z.number().int().optional(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const me = await getCurrentUser();
  if (!me || !can(me, PERMS.PRESENTATION_EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const update = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }
  try {
    await prisma.presentationSection.update({ where: { id }, data: update });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  const me = await getCurrentUser();
  if (!me || !can(me, PERMS.PRESENTATION_DELETE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.presentationSection.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
