// Back-office — a single support conversation. Gated by support.view; the
// reply box / status controls are further gated (support.reply, support.manage)
// inside the client view.
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";
import SupportThreadView from "./SupportThreadView";

export default async function SupportThreadPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, PERMS.SUPPORT_VIEW)) redirect("/admin");

  const thread = await prisma.supportThread.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 300 },
      assignedTo: { select: { firstName: true, lastName: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    },
  });
  if (!thread) notFound();

  return (
    <SupportThreadView
      id={thread.id}
      token={thread.publicToken}
      meta={{
        name: thread.name,
        email: thread.email,
        subject: thread.subject,
        status: thread.status,
        createdAt: thread.createdAt,
        assignedTo: thread.assignedTo
          ? `${thread.assignedTo.firstName} ${thread.assignedTo.lastName}`.trim()
          : null,
        linkedUser: thread.user
          ? { id: thread.user.id, name: `${thread.user.firstName} ${thread.user.lastName}`.trim(), role: thread.user.role }
          : null,
        ipAddress: thread.ipAddress,
      }}
      initialMessages={thread.messages.map((m) => ({
        id: m.id,
        body: m.body,
        fromStaff: m.fromStaff,
        createdAt: m.createdAt,
      }))}
      canReply={can(user, PERMS.SUPPORT_REPLY)}
      canManage={can(user, PERMS.SUPPORT_MANAGE)}
    />
  );
}
