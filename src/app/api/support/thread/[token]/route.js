// Public — a visitor polls THEIR support thread using the unguessable
// publicToken stored in their browser's localStorage. Returns the conversation
// so the widget can show staff replies. No account required by design.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "not found" }, { status: 404 });

  const thread = await prisma.supportThread.findUnique({
    where: { publicToken: token },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    thread: { status: thread.status, subject: thread.subject, name: thread.name },
    messages: thread.messages.map((m) => ({
      id: m.id,
      body: m.body,
      fromStaff: m.fromStaff,
      createdAt: m.createdAt,
    })),
  });
}
