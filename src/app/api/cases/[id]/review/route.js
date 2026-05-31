// Client leaves a 5-star review + comment after their case closed successfully.
// One review per case (upsert), owner-only, CLOSED-only.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { logActivity } from "@/lib/workflow";

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const c = await prisma.taxCase.findUnique({ where: { id } });
  if (!c || c.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (c.status !== "CLOSED") return NextResponse.json({ error: "not.closed" }, { status: 400 });

  const { rating, comment } = await request.json().catch(() => ({}));
  const r = Math.round(Number(rating));
  if (!(r >= 1 && r <= 5)) return NextResponse.json({ error: "rating.invalid" }, { status: 400 });
  const body = typeof comment === "string" ? comment.trim().slice(0, 2000) : null;

  await prisma.review.upsert({
    where: { caseId: id },
    create: { caseId: id, rating: r, comment: body || null },
    update: { rating: r, comment: body || null },
  });
  await logActivity({ caseId: id, actorId: user.id, action: "review.submitted", details: { rating: r } });

  return NextResponse.json({ ok: true });
}
