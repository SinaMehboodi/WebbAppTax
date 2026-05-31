// Admin/Employee area gate + full sidebar layout (replaces the default
// top-nav layout inside /admin/*). All translation lookups happen here in
// the server component and are passed to the client sidebar as resolved
// strings — passing the `t` function across the server/client boundary
// would error out.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { prisma } from "@/lib/prisma";
import { can, PERMS } from "@/lib/permissions";
import { APP_VERSION_LABEL } from "@/lib/version";
import AdminSidebar from "@/components/AdminSidebar";
import AdminBanner from "@/components/AdminBanner";

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role)) redirect("/");
  const { t, locale } = await getDictionary();

  const canSupport = can(user, PERMS.SUPPORT_VIEW);

  // Live counters for the sidebar (unread bell + open support threads). These
  // are cosmetic badges — a transient DB hiccup must never take down the whole
  // back-office, so each count fails soft to 0.
  const [unreadCount, supportOpen] = await Promise.all([
    prisma.notification
      .count({ where: { userId: user.id, readAt: null } })
      .catch(() => 0),
    canSupport
      ? prisma.supportThread.count({ where: { status: "OPEN" } }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  const labels = {
    backOffice: t("admin.title"),
    workflow: t("admin.workflow"),
    inbox: t("admin.inbox"),
    cases: t("admin.cases"),
    reports: t("admin.reports"),
    reviews: t("reviews.nav"),
    users: t("admin.users"),
    presentation: t("admin.presentation"),
    support: t("admin.support"),
    notifications: t("nav.notifications"),
    logout: t("nav.logout"),
    account: t("nav.account"),
    version: APP_VERSION_LABEL,
  };

  // Strip the password field (and anything else not needed by the sidebar).
  const safeUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };

  return (
    <div className="flex-1 flex min-h-0">
      <AdminSidebar user={safeUser} labels={labels} locale={locale} unreadCount={unreadCount} canSupport={canSupport} supportOpen={supportOpen} />
      <div className="flex-1 min-w-0 overflow-x-hidden safe-bottom">
        <AdminBanner role={user.role} firstName={user.firstName} lastName={user.lastName} locale={locale} />
        {children}
      </div>
    </div>
  );
}
