// Comments on a case.
// - POST: client or staff add a comment. Staff can mark internal.
// - GET:  list visible comments + the case's last activity timestamp so the
//         CommentStream client can detect new entries by polling.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { staffCanAccessCase } from "@/lib/case-access";
import { can, PERMS } from "@/lib/permissions";
import { notify } from "@/lib/notifications";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

const PostSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  internal: z.boolean().optional(),
});

export async function GET(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const c = await prisma.taxCase.findUnique({
    where: { id },
    select: { id: true, ownerId: true, updatedAt: true },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isStaff = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role);
  if (user.role === "USER") {
    if (c.ownerId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (!(await staffCanAccessCase(user, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const comments = await prisma.comment.findMany({
    where: { caseId: id, ...(isStaff ? {} : { internal: false }) },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
  });

  return NextResponse.json({
    comments: comments.map((cm) => ({
      id: cm.id,
      body: cm.body,
      internal: cm.internal,
      createdAt: cm.createdAt,
      authorId: cm.authorId,
      authorName: `${cm.author.firstName} ${cm.author.lastName}`.trim(),
      authorRole: cm.author.role,
    })),
    me: { id: user.id, role: user.role },
    caseUpdatedAt: c.updatedAt,
  });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 30 comments/minute/user is generous for typing but cuts spam loops
  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey(`comment:${user.id}`, ip), max: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate.tooManyAttempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  const { body, internal } = parsed.data;

  const c = await prisma.taxCase.findUnique({
    where: { id },
    select: { id: true, ownerId: true, managerId: true, reference: true },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const allowedInternal = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role);
  if (user.role === "USER") {
    if (c.ownerId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (!(await staffCanAccessCase(user, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Staff additionally need the case.comment capability to reply. Clients
  // always keep their own channel to the company (no permission required).
  if (user.role !== "USER" && !can(user, PERMS.CASE_COMMENT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const created = await prisma.comment.create({
    data: {
      caseId: id,
      authorId: user.id,
      body,
      internal: allowedInternal ? !!internal : false,
    },
  });

  // Notify the other side of the conversation. Skip internal comments —
  // those are staff-only and shouldn't ping the client.
  if (!created.internal) {
    const recipientId = user.id === c.ownerId ? (c.managerId || null) : c.ownerId;
    if (recipientId && recipientId !== user.id) {
      await notify({
        userId: recipientId,
        caseId: id,
        titleKey: "cases.comments",
        params: { reference: c.reference },
        bodyKey: null,
        link: `/cases/${id}`,
        alsoEmail: false,
        alsoPush: true,
      });
    }
  }

  return NextResponse.json({ ok: true, id: created.id });
}
