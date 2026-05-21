// Admin/Employee area gate + full sidebar layout (replaces the default
// top-nav layout inside /admin/*). All translation lookups happen here in
// the server component and are passed to the client sidebar as resolved
// strings — passing the `t` function across the server/client boundary
// would error out.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role)) redirect("/");
  const { t, locale } = await getDictionary();

  const labels = {
    backOffice: t("admin.title"),
    workflow: t("admin.workflow"),
    inbox: t("admin.inbox"),
    cases: t("admin.cases"),
    reports: t("admin.reports"),
    users: t("admin.users"),
    presentation: t("admin.presentation"),
    logout: t("nav.logout"),
    account: t("nav.account"),
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
      <AdminSidebar user={safeUser} labels={labels} locale={locale} />
      <div className="flex-1 min-w-0 overflow-x-hidden">{children}</div>
    </div>
  );
}
