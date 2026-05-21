// Revoke one of the current user's passkeys.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_request, { params }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  // Scoped to current user — a passkey ID belonging to someone else is a no-op
  const res = await prisma.passkey.deleteMany({
    where: { id, userId: me.id },
  });
  if (res.count === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
