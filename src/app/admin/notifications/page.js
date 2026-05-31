// Staff notifications — same content as /notifications, but rendered INSIDE the
// back-office layout (left sidebar + banner stay), like Support and the other
// admin pages. The admin layout already gates this to staff and shows the banner.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import NotificationsPanel from "@/components/NotificationsPanel";

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const { t, locale } = await getDictionary();

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <NotificationsPanel items={items} t={t} locale={locale} />
    </div>
  );
}
