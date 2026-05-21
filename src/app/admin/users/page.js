import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/dictionary";
import { getCurrentUser } from "@/lib/session";
import { can, canGrantPerms, PERMS } from "@/lib/permissions";
import UserActiveToggle from "./UserActiveToggle";
import NewEmployeeButton from "./NewEmployeeButton";
import RegisterClientButton from "./RegisterClientButton";
import SuperAdminActions from "./SuperAdminActions";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const canDeactivate    = can(me, PERMS.USERS_DEACTIVATE);
  const canCreate        = can(me, PERMS.USERS_CREATE);
  const canCreateClient  = can(me, PERMS.USERS_CREATE_CLIENT);
  const canModify        = can(me, PERMS.USERS_MODIFY);
  const canGrant         = canGrantPerms(me);

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      emailVerified: true, active: true, createdAt: true,
      referenceRep: { select: { firstName: true, lastName: true } },
      _count: { select: { cases: true } },
    },
  });
  const { t, locale } = await getDictionary();
  const fr = locale === "fr";

  const counts = {
    total: users.length,
    superAdmins: users.filter((u) => u.role === "SUPER_ADMIN").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    employees: users.filter((u) => u.role === "EMPLOYEE").length,
    clients: users.filter((u) => u.role === "USER").length,
    inactive: users.filter((u) => !u.active).length,
  };

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("admin.users")}</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            {fr
              ? `${counts.total} comptes · ${counts.clients} clients · ${counts.employees} commerciaux · ${counts.admins} admin${counts.admins > 1 ? "s" : ""}${counts.inactive ? ` · ${counts.inactive} désactivé${counts.inactive > 1 ? "s" : ""}` : ""}`
              : `${counts.total} accounts · ${counts.clients} clients · ${counts.employees} reps · ${counts.admins} admin${counts.admins > 1 ? "s" : ""}${counts.inactive ? ` · ${counts.inactive} deactivated` : ""}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canCreateClient && <RegisterClientButton fr={fr} />}
          {canCreate && <NewEmployeeButton fr={fr} />}
        </div>
      </header>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label={fr ? "Clients" : "Clients"} value={counts.clients} tone="emerald" />
        <StatTile label={fr ? "Commerciaux" : "Reps"} value={counts.employees} tone="sky" />
        <StatTile label="Admin" value={counts.admins + counts.superAdmins} tone="amber" />
        <StatTile label={fr ? "Désactivés" : "Deactivated"} value={counts.inactive} tone="rose" />
      </section>

      {/* Table — desktop */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left">
                <th className="p-3 font-medium">{t("common.name")}</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">{t("common.type")}</th>
                <th className="p-3 font-medium">{t("common.rep")}</th>
                <th className="p-3 font-medium text-right">{t("cases.title")}</th>
                <th className="p-3 font-medium text-center">Verified</th>
                <th className="p-3 font-medium text-right">{(canDeactivate || canModify) ? (fr ? "Actions" : "Actions") : (fr ? "Statut" : "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td className="p-3 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="p-3 text-[var(--fg-muted)]">{u.email}</td>
                  <td className="p-3"><RoleChip role={u.role} /></td>
                  <td className="p-3 text-[var(--fg-muted)]">
                    {u.referenceRep ? `${u.referenceRep.firstName} ${u.referenceRep.lastName}` : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">{u._count.cases}</td>
                  <td className="p-3 text-center">
                    {u.emailVerified ? <span className="text-emerald-600">✓</span> : <span className="text-[var(--fg-muted)]">—</span>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2 justify-end flex-wrap">
                      {canGrant && (u.role === "EMPLOYEE" || u.role === "ADMIN") && (
                        <Link
                          href={`/admin/users/${u.id}/permissions`}
                          className="text-xs text-[var(--brand-600)] hover:underline"
                        >
                          {fr ? "Permissions" : "Permissions"}
                        </Link>
                      )}
                      {canDeactivate && u.id !== me.id ? (
                        <UserActiveToggle userId={u.id} active={u.active} fr={fr} />
                      ) : (
                        <ActiveBadge active={u.active} fr={fr} />
                      )}
                      {canModify && u.id !== me.id && (
                        <SuperAdminActions user={u} fr={fr} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card list — mobile */}
      <div className="space-y-2 md:hidden">
        {users.map((u) => (
          <div key={u.id} className={`card p-4 space-y-2 ${u.active ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{u.firstName} {u.lastName}</div>
                <div className="text-xs text-[var(--fg-muted)] truncate">{u.email}</div>
              </div>
              <RoleChip role={u.role} />
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
              <span>{u._count.cases} {fr ? "dossier(s)" : "case(s)"}</span>
              {u.referenceRep && <span>{u.referenceRep.firstName} {u.referenceRep.lastName}</span>}
            </div>
            <div className="pt-1 flex items-center justify-end gap-2 flex-wrap">
              {canGrant && (u.role === "EMPLOYEE" || u.role === "ADMIN") && (
                <Link
                  href={`/admin/users/${u.id}/permissions`}
                  className="text-xs text-[var(--brand-600)] hover:underline"
                >
                  {fr ? "Permissions" : "Permissions"}
                </Link>
              )}
              {canDeactivate && u.id !== me.id ? (
                <UserActiveToggle userId={u.id} active={u.active} fr={fr} />
              ) : (
                <ActiveBadge active={u.active} fr={fr} />
              )}
              {canModify && u.id !== me.id && (
                <SuperAdminActions user={u} fr={fr} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }) {
  const TONE = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">{label}</div>
      <div className="flex items-end justify-between mt-1">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className={`h-7 w-7 rounded-lg ${TONE[tone] || TONE.sky}`} />
      </div>
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
      {role.replace("_", " ")}
    </span>
  );
}

function ActiveBadge({ active, fr }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60">
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> {fr ? "Actif" : "Active"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800/60">
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> {fr ? "Désactivé" : "Deactivated"}
    </span>
  );
}
