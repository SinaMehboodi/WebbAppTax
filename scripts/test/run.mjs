// SamTaxco automated test harness — orchestrator.
// Run:  node scripts/test/run.mjs   (dev server must be running on :3000)
import {
  prisma, section, check, checkDenied, checkAllowed, report,
  req, userByEmail, seedSession, actor, ensureUser,
  apiLogin, createCase, prepareContract, sign, caseRow,
} from "./_lib.mjs";
import { runPermissionMatrix } from "./perms.mjs";
import { runClientJourney } from "./journey.mjs";
import { runWorkflows } from "./workflow.mjs";
import { runExtras } from "./extra.mjs";

const STAFF = {
  superadmin: "superadmin@samtaxco.app",
  admin: "admin@samtaxco.app",
  samuel: "samuel@samtaxco.app",
  employee1: "employee1@samtaxco.app",
  employee2: "employee2@samtaxco.app",
};

async function main() {
  // -------------------------------------------------------------------------
  section("Setup — seed sessions for staff");
  const staff = {};
  for (const [k, email] of Object.entries(STAFF)) {
    const u = await userByEmail(email);
    if (!check(`seed staff exists: ${k}`, !!u, email)) continue;
    staff[k] = { user: u, jar: await seedSession(u.id) };
  }

  // A throwaway client for smoke checks
  const client = await actor({ email: "smoke-client@test.local", firstName: "Smoke", lastName: "Client", role: "USER" });

  // -------------------------------------------------------------------------
  section("Smoke — page auth gates");
  {
    const anon = await req("GET", "/admin");
    check("anon GET /admin is redirected", anon.status >= 300 && anon.status < 400, `${anon.status} -> ${anon.location}`);

    const asSuper = await req("GET", "/admin", { j: staff.superadmin.jar });
    check("super-admin GET /admin = 200", asSuper.status === 200, `${asSuper.status}`);

    const asClient = await req("GET", "/admin", { j: client.jar });
    check("client GET /admin is redirected away", asClient.status >= 300 && asClient.status < 400, `${asClient.status} -> ${asClient.location}`);

    const dash = await req("GET", "/dashboard", { j: client.jar });
    check("client GET /dashboard = 200", dash.status === 200, `${dash.status}`);
  }

  // -------------------------------------------------------------------------
  section("Smoke — case creation");
  {
    const res = await createCase(client.jar, { taxType: "TF", propertyName: "Smoke Property" });
    check("client creates case = 201", res.status === 201, `${res.status} ${JSON.stringify(res.data).slice(0, 120)}`);
    if (res.status === 201) {
      const row = await caseRow(res.data.id);
      check("new case status = CONTRACT_PREPARING", row?.status === "CONTRACT_PREPARING", row?.status);
      check("new case owner = client", row?.ownerId === client.user.id, row?.ownerId);
      check("tax-notice document attached", (await prisma.document.count({ where: { caseId: res.data.id } })) >= 1);
    }
  }

  // -------------------------------------------------------------------------
  section("Smoke — real login endpoint");
  {
    const ok = await apiLogin("samuel@samtaxco.app", "password1234");
    check("login samuel = 200", ok.res.status === 200, `${ok.res.status}`);
    check("login returns role EMPLOYEE", ok.res.data?.role === "EMPLOYEE", ok.res.data?.role);
    const bad = await apiLogin("samuel@samtaxco.app", "wrongpassword");
    check("login wrong password = 401", bad.res.status === 401, `${bad.res.status}`);
  }

  // -------------------------------------------------------------------------
  await runPermissionMatrix(staff);

  // -------------------------------------------------------------------------
  await runClientJourney(staff);

  // -------------------------------------------------------------------------
  await runWorkflows(staff);

  // -------------------------------------------------------------------------
  await runExtras(staff);

  const failures = report();
  await prisma.$disconnect();
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => {
  console.error("HARNESS CRASH:", e);
  await prisma.$disconnect().catch(() => {});
  process.exit(2);
});
