// Admin-only: list + create presentation sections.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

const CreateSchema = z.object({
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, digits and dashes only"),
  titleFr: z.string().trim().min(1).max(120),
  titleEn: z.string().trim().min(1).max(120),
  contentFr: z.string().trim().min(1),
  contentEn: z.string().trim().min(1),
  order: z.number().int().optional(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me || !can(me, PERMS.PRESENTATION_EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const existing = await prisma.presentationSection.findUnique({ where: { slug: data.slug } });
  if (existing) return NextResponse.json({ error: "slug.taken" }, { status: 409 });

  // Auto-order: place at the end if not specified
  let order = data.order;
  if (order == null) {
    const last = await prisma.presentationSection.findFirst({ orderBy: { order: "desc" } });
    order = (last?.order || 0) + 10;
  }

  const created = await prisma.presentationSection.create({
    data: {
      slug: data.slug,
      titleFr: data.titleFr,
      titleEn: data.titleEn,
      contentFr: data.contentFr,
      contentEn: data.contentEn,
      order,
      imageUrl: data.imageUrl || null,
      isActive: data.isActive !== false,
    },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
