// Permission matrix — exercises every protected endpoint against all six
// principal classes and asserts ALLOW (gate passed: any status ≠ 401/403) or
// DENY (401/403).
//
// Principals:
//   anon        — no session
//   client      — USER (owns the probe cases)
//   employee1   — EMPLOYEE, basic perms (prepare_contract, request_docs,
//                 analyze, assign_self, comment, reports.view) — NO view_all
//   samuel      — EMPLOYEE, manager perms (view_all + nearly everything except
//                 users.create_client and the SUPER_ADMIN_ONLY set)
//   admin       — ADMIN (auto-passes everything except SUPER_ADMIN_ONLY)
//   superadmin  — SUPER_ADMIN (everything)
//
// Scope: basic employees can only act on cases they manage or are assigned to.
// We prove this by running scope-sensitive routes against BOTH an UNassigned
// case and a case assigned to employee1 — employee1 flips deny→allow.
//
// Probe design: where trivial we send a body that fails validation AFTER the
// auth gate (e.g. {feeModel:"__BAD__"}) so an allowed principal lands on 400
// and mutates nothing; denied principals 403 before reaching it. A few routes
// (analyze/result/invoice/comment) do mutate the disposable probe cases — that
// is harmless because gates are status-independent and probe cases are throwaway.
import {
  prisma, section, check, checkDenied, checkAllowed,
  req, actor, createCase,
} from "./_lib.mjs";

const DENY = "deny";
const ALLOW = "allow";
const BAD_ID = "clbogusbogusbogusbogus000"; // bogus path param (cuid-shaped)

// Expectation presets ------------------------------------------------------
// SUPER_ADMIN_ONLY routes — admin is DENIED too.
const ONLY_SUPER = { anon: DENY, client: DENY, employee1: DENY, samuel: DENY, admin: DENY, superadmin: ALLOW };
// Manager-grade perms a basic employee lacks (close/invoice/decide/result/...).
const MGR = { anon: DENY, client: DENY, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW };
// ADMIN auto-grants but samuel lacks the specific perm (users.create_client).
const ADMIN_PLUS = { anon: DENY, client: DENY, employee1: DENY, samuel: DENY, admin: ALLOW, superadmin: ALLOW };

export async function runPermissionMatrix(staff) {
  section("Permission matrix — fixtures");

  // Probe principals (USER clients) + cases.
  const client = await actor({ email: "perm-client@test.local", firstName: "Perm", lastName: "Client", role: "USER" });
  const clientB = await actor({ email: "perm-client-b@test.local", firstName: "Perm", lastName: "Bee", role: "USER" });

  const unRes = await createCase(client.jar, { propertyName: "Unassigned Probe" });
  const asRes = await createCase(client.jar, { propertyName: "Assigned Probe" });
  check("probe: unassigned case created", unRes.status === 201, `${unRes.status}`);
  check("probe: assigned case created", asRes.status === 201, `${asRes.status}`);
  const unId = unRes.data?.id;
  const asId = asRes.data?.id;

  // Assign employee1 to the "assigned" case so scope flips for them.
  await prisma.caseAssignment.upsert({
    where: { caseId_userId: { caseId: asId, userId: staff.employee1.user.id } },
    update: {},
    create: { caseId: asId, userId: staff.employee1.user.id, assignedBy: staff.admin.user.id },
  });
  check("probe: employee1 assigned to assigned-case", true);

  // Principal → cookie jar (anon = no jar).
  const P = {
    anon: undefined,
    client: client.jar,
    employee1: staff.employee1.jar,
    samuel: staff.samuel.jar,
    admin: staff.admin.jar,
    superadmin: staff.superadmin.jar,
  };
  const ORDER = ["anon", "client", "employee1", "samuel", "admin", "superadmin"];
  const J = (jar) => (jar ? { j: jar } : {});

  // Run one route across all principals. makeOpts(key) -> req options (sans jar).
  async function gate(label, method, pathFor, expect, makeOpts = () => ({})) {
    for (const k of ORDER) {
      const path = typeof pathFor === "function" ? pathFor(k) : pathFor;
      const res = await req(method, path, { ...J(P[k]), ...makeOpts(k) });
      if (expect[k] === ALLOW) checkAllowed(`${label} · ${k}`, res);
      else checkDenied(`${label} · ${k}`, res);
    }
  }

  // ── Case workflow: perms a BASIC employee HAS (scope-sensitive) ──────────
  // On the UNassigned case employee1 is blocked by scope; on the assigned
  // case they're allowed. client (USER) is the owner but has no staff perm,
  // so denied on staff-action routes (allowed only on comment/upload).
  section("Permission matrix — case actions (scope-sensitive)");

  // contract (CASE_PREPARE_CONTRACT) — bad feeModel => allowed land on 400.
  const contractBody = () => ({ json: { feeModel: "__BAD__" } });
  await gate("contract @unassigned", "POST", `/api/cases/${unId}/contract`,
    { anon: DENY, client: DENY, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, contractBody);
  await gate("contract @assigned", "POST", `/api/cases/${asId}/contract`,
    { anon: DENY, client: DENY, employee1: ALLOW, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, contractBody);

  // doc-request (CASE_REQUEST_DOCS) — empty body => allowed land on 400 (label required).
  const emptyJson = () => ({ json: {} });
  await gate("doc-request @unassigned", "POST", `/api/cases/${unId}/doc-request`,
    { anon: DENY, client: DENY, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, emptyJson);
  await gate("doc-request @assigned", "POST", `/api/cases/${asId}/doc-request`,
    { anon: DENY, client: DENY, employee1: ALLOW, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, emptyJson);

  // analyze (CASE_ANALYZE) — mutates (creates Analysis) for allowed; harmless.
  await gate("analyze @unassigned", "POST", `/api/cases/${unId}/analysis`,
    { anon: DENY, client: DENY, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, emptyJson);
  await gate("analyze @assigned", "POST", `/api/cases/${asId}/analysis`,
    { anon: DENY, client: DENY, employee1: ALLOW, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, emptyJson);

  // comment (CASE_COMMENT for staff; owner always allowed) — body parse is
  // BEFORE the scope/perm gate, so send a VALID body to reach the 403.
  const commentBody = () => ({ json: { body: "perm-probe" } });
  await gate("comment @unassigned", "POST", `/api/cases/${unId}/comments`,
    { anon: DENY, client: ALLOW, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, commentBody);
  await gate("comment @assigned", "POST", `/api/cases/${asId}/comments`,
    { anon: DENY, client: ALLOW, employee1: ALLOW, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, commentBody);

  // documents upload — owner OR staff-with-scope; no specific perm. Empty
  // FormData => allowed land on 400 (file required), denied 403 before formData.
  const emptyForm = () => ({ form: new FormData() });
  await gate("upload @unassigned", "POST", `/api/cases/${unId}/documents`,
    { anon: DENY, client: ALLOW, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, emptyForm);
  await gate("upload @assigned", "POST", `/api/cases/${asId}/documents`,
    { anon: DENY, client: ALLOW, employee1: ALLOW, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, emptyForm);

  // status (staff role + scope) — bad status => allowed land on 400, no mutation.
  const badStatus = () => ({ json: { status: "__BAD__" } });
  await gate("status @unassigned", "POST", `/api/cases/${unId}/status`,
    { anon: DENY, client: DENY, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, badStatus);
  await gate("status @assigned", "POST", `/api/cases/${asId}/status`,
    { anon: DENY, client: DENY, employee1: ALLOW, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW }, badStatus);

  // ── Case workflow: perms a basic employee LACKS (perm-gated) ────────────
  // Tested on the ASSIGNED case: employee1 HAS scope but NOT the perm, so a
  // 403 here proves it's the permission (not scope) doing the blocking.
  section("Permission matrix — case actions (manager perms)");

  await gate("decision @assigned", "POST", `/api/cases/${asId}/decision`, MGR, emptyJson);
  await gate("result @assigned", "POST", `/api/cases/${asId}/result`, MGR, emptyJson);
  await gate("close @assigned", "POST", `/api/cases/${asId}/close`, MGR, emptyJson);
  // invoice — first allowed principal creates one (200), the rest get 409;
  // both are non-403 so all "allowed" assertions hold.
  await gate("invoice @assigned", "POST", `/api/cases/${asId}/invoice`, MGR);
  // mark-paid — needs an invoice id; perm is checked first so a bogus id lets
  // allowed principals fall through to 404 (still ≠ 403).
  await gate("mark-paid (bogus invoice)", "POST", `/api/invoices/${BAD_ID}/mark-paid`, MGR);

  // ── Assignment ──────────────────────────────────────────────────────────
  section("Permission matrix — assignment");
  const e2 = staff.employee2.user.id;
  // assign OTHERS (CASE_ASSIGN_OTHERS) — employee1 lacks it. Bogus case id so
  // allowed principals 404 after the target lookup (no mutation).
  await gate("assign-others", "POST", `/api/admin/cases/${BAD_ID}/assignments`,
    { anon: DENY, client: DENY, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW },
    () => ({ json: { userId: e2, role: "team" } }));
  // assign SELF (CASE_ASSIGN_SELF) — employee1 HAS it. userId must be the
  // principal's own id (self branch); client(USER) still denied.
  await gate("assign-self", "POST", `/api/admin/cases/${BAD_ID}/assignments`,
    { anon: DENY, client: DENY, employee1: ALLOW, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW },
    (k) => {
      const selfId = k === "anon" ? BAD_ID
        : k === "client" ? client.user.id
        : staff[k]?.user.id;
      return { json: { userId: selfId, role: "team" } };
    });

  // ── Users administration ────────────────────────────────────────────────
  section("Permission matrix — users admin");
  // grant perms (canGrantPerms) — admin+super always; samuel via users.grant_perms.
  await gate("users.permissions", "POST", `/api/admin/users/${BAD_ID}/permissions`,
    { anon: DENY, client: DENY, employee1: DENY, samuel: ALLOW, admin: ALLOW, superadmin: ALLOW },
    () => ({ json: { permissions: [] } }));
  // create EMPLOYEE (USERS_CREATE) — SUPER_ADMIN only (admin denied!).
  await gate("users.create-employee", "POST", `/api/admin/users/employees`, ONLY_SUPER, emptyJson);
  // create CLIENT (USERS_CREATE_CLIENT) — admin yes, samuel NO.
  await gate("users.create-client", "POST", `/api/admin/users/clients`, ADMIN_PLUS, emptyJson);
  // modify / reset-password / delete / deactivate — all SUPER_ADMIN only.
  await gate("users.modify", "POST", `/api/admin/users/${BAD_ID}/modify`, ONLY_SUPER, () => ({ json: { firstName: "X" } }));
  await gate("users.reset-password", "POST", `/api/admin/users/${BAD_ID}/reset-password`, ONLY_SUPER, emptyJson);
  await gate("users.delete", "POST", `/api/admin/users/${BAD_ID}/delete`, ONLY_SUPER);
  await gate("users.deactivate", "POST", `/api/admin/users/${BAD_ID}/active`, ONLY_SUPER, () => ({ json: { active: true } }));

  // ── Presentation / Reports / Support / destructive case ─────────────────
  section("Permission matrix — presentation / reports / support / delete");
  await gate("presentation.create", "POST", `/api/admin/presentation`, MGR, emptyJson);
  await gate("reports.export", "GET", `/api/admin/reports/export`, MGR);
  await gate("support.reply", "POST", `/api/admin/support/${BAD_ID}/reply`, MGR, () => ({ json: { body: "x" } }));
  await gate("support.status", "POST", `/api/admin/support/${BAD_ID}/status`, MGR, () => ({ json: { status: "CLOSED" } }));
  // hard-delete a case (CASE_DELETE) — SUPER_ADMIN only (admin denied!).
  await gate("case.delete", "POST", `/api/cases/${BAD_ID}/delete`, ONLY_SUPER);

  // ── Tenant isolation (USER ↔ USER) ──────────────────────────────────────
  // clientB must not touch clientA's case.
  section("Permission matrix — tenant isolation");
  {
    const g = clientB.jar;
    const cg = await req("GET", `/api/cases/${unId}/comments`, { j: g });
    checkDenied("clientB GET clientA comments", cg);
    const cp = await req("POST", `/api/cases/${unId}/comments`, { j: g, json: { body: "intruder" } });
    checkDenied("clientB POST clientA comment", cp);
    const up = await req("POST", `/api/cases/${unId}/documents`, { j: g, form: new FormData() });
    checkDenied("clientB upload to clientA case", up);
  }
}
