// Back-office — a staff member replies to a support thread. Gated by
// support.reply. Emails the visitor if we have their address so they know to
// come back and read it.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";
import { send as sendEmail } from "@/lib/email";

const Schema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(request, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can(user, PERMS.SUPPORT_REPLY)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const thread = await prisma.supportThread.findUnique({ where: { id } });
  if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });

  const msg = await prisma.supportMessage.create({
    data: { threadId: id, authorId: user.id, fromStaff: true, body: parsed.data.body },
  });

  await prisma.supportThread.update({
    where: { id },
    data: {
      status: "PENDING", // answered — now waiting on the visitor
      lastMessageAt: new Date(),
      assignedToId: thread.assignedToId || user.id,
    },
  });

  // Let the visitor know (best-effort).
  if (thread.email && thread.email.includes("@")) {
    const fr = (thread.locale || "fr") === "fr";
    const base = process.env.APP_URL || "";
    const link = `${base}/login`;
    try {
      await sendEmail({
        to: thread.email,
        subject: fr ? "Réponse de l'équipe SamTaxco" : "Reply from the SamTaxco team",
        text:
          (fr
            ? "Notre équipe a répondu à votre message :\n\n"
            : "Our team replied to your message:\n\n") +
          parsed.data.body +
          (fr
            ? `\n\nRevenez sur la page de connexion pour continuer la conversation : ${link}`
            : `\n\nReturn to the login page to continue the conversation: ${link}`),
      });
    } catch (e) {
      console.error("[support] visitor email failed:", e.message);
    }
  }

  return NextResponse.json({ ok: true, id: msg.id });
}
