import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import AdminBanner from "@/components/AdminBanner";
import NotificationsPanel from "@/components/NotificationsPanel";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const { t, locale } = await getDictionary();

  return (
    <>
      <AdminBanner
        role={user.role}
        firstName={user.firstName}
        lastName={user.lastName}
        locale={locale}
        containerClass="max-w-3xl"
        topInset={false}
      />
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
        <NotificationsPanel items={items} t={t} locale={locale} />
      </div>
    </>
  );
}
