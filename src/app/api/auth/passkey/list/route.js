// Lists the current user's enrolled biometric credentials so they can manage
// them from /account.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const list = await prisma.passkey.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true },
  });
  return NextResponse.json({ passkeys: list });
}
