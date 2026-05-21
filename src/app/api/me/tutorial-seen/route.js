import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.user.update({
    where: { id: user.id },
    data: { firstLoginTutorialSeen: true },
  });
  return NextResponse.json({ ok: true });
}
