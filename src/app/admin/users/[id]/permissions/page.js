import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/lib/dictionary";
import { canGrantPerms, PERM_GROUPS } from "@/lib/permissions";
import PermissionsForm from "./PermissionsForm";

export default async function UserPermissionsPage({ params }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canGrantPerms(me)) redirect("/admin/users");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, permissions: true, active: true },
  });
  if (!user) notFound();

  const { locale } = await getDictionary();
  const fr = locale === "fr";

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <span aria-hidden>←</span> {fr ? "Utilisateurs" : "Users"}
      </Link>

      <header className="card p-5">
        <div className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          {fr ? "Accès & permissions" : "Access & permissions"}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          {user.firstName} {user.lastName}
        </h1>
        <div className="text-sm text-[var(--fg-muted)] mt-0.5">
          {user.email} · <RoleChip role={user.role} />
          {!user.active && <span className="ml-2 text-xs text-rose-600">{fr ? "(désactivé)" : "(deactivated)"}</span>}
        </div>
        {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-2.5 rounded-xl mt-3">
            {fr
              ? `${user.role === "SUPER_ADMIN" ? "Super-administrateur" : "Administrateur"} — toutes les permissions sont implicitement accordées. Les cases ci-dessous n'ont d'effet pratique que si le rôle est rétrogradé en EMPLOYÉ.`
              : `${user.role === "SUPER_ADMIN" ? "Super admin" : "Admin"} — all permissions are implicit. The checkboxes below only take effect if the role is downgraded to EMPLOYEE.`}
          </p>
        )}
      </header>

      <PermissionsForm
        userId={user.id}
        initial={user.permissions || []}
        groups={PERM_GROUPS}
        fr={fr}
      />
    </div>
  );
}

function RoleChip({ role }) {
  const map = {
    SUPER_ADMIN: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800/60",
    ADMIN:       "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60",
    EMPLOYEE:    "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/60",
    USER:        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${map[role] || map.USER}`}>
      {role}
    </span>
  );
}
