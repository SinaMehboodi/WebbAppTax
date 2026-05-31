// Case-level access control for STAFF.
//
// Rule (mirrors the cases list page): a staff member may see or act on a case
// only if they can view every case (CASE_VIEW_ALL — the manager view, which
// ADMIN/SUPER_ADMIN always have), OR they are the case's primary manager, OR
// they hold an assignment on it. This enforces the owner's requirement that
// employees never touch cases they aren't assigned to — even if they happen
// to be the client's reference rep.
//
// Client (USER) access is owner-based and handled separately in each route.
import "server-only";
import { prisma } from "@/lib/prisma";
import { can, PERMS } from "@/lib/permissions";

// Prisma `where` fragment restricting a case query to those `me` may see.
// Returns {} for viewers who can see all (so it composes into any where).
export function caseScopeWhere(me) {
  if (can(me, PERMS.CASE_VIEW_ALL)) return {};
  return {
    OR: [
      { managerId: me?.id },
      { assignments: { some: { userId: me?.id } } },
    ],
  };
}

// In-memory check against an already-fetched case row. The row must carry
// the `managerId` scalar and an `assignments` array of `{ userId }`.
export function canAccessCaseRow(me, caseRow) {
  if (!me || !caseRow) return false;
  if (can(me, PERMS.CASE_VIEW_ALL)) return true;
  if (caseRow.managerId && caseRow.managerId === me.id) return true;
  return (caseRow.assignments || []).some((a) => a.userId === me.id);
}

// DB-backed check for API routes. Does a cheap scoped count so callers don't
// have to change their existing query includes. Returns a boolean.
export async function staffCanAccessCase(me, caseId) {
  if (!me || !caseId) return false;
  if (can(me, PERMS.CASE_VIEW_ALL)) return true;
  const n = await prisma.taxCase.count({
    where: { id: caseId, ...caseScopeWhere(me) },
  });
  return n > 0;
}
