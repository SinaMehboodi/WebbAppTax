// Phase 5 — staff saves the internal analysis worksheet.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { setStatus, logActivity } from "@/lib/workflow";

const FIELDS = [
  "rentalValueReview",
  "surfaceCheck",
  "useClassification",
  "annexesNotes",
  "cadastralComparison",
  "legalChanges",
  "simulationNotes",
  "estimatedSavings",
  "yearsCovered",
];

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !can(user, PERMS.CASE_ANALYZE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const data = { caseId: id, authorId: user.id };
  for (const k of FIELDS) if (body[k] !== undefined) data[k] = body[k];

  const a = await prisma.analysis.create({ data });
  await setStatus({ caseId: id, status: "DECISION_PENDING", actorId: user.id });
  await logActivity({ caseId: id, actorId: user.id, action: "analysis.created", details: { analysisId: a.id } });
  return NextResponse.json({ ok: true, id: a.id });
}
