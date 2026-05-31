// Integrated end-to-end: THREE brand-new users each sign up through the REAL
// endpoints (signup → email-verify → login), each opens a case, and each case
// is carried ALL THE WAY to a terminal state — with full contract+mandate
// signatures and every workflow command — handled by three different staff
// configurations so both EMPLOYEE and ADMIN paths are exercised:
//
//   Case A — new user signs up; a basic EMPLOYEE (assigned by an ADMIN) does
//            the early work, then the ADMIN performs the manager-only steps.
//            Proves the employee is correctly BLOCKED from the decision.   → PAID/CLOSED
//   Case B — new user signs up; the MANAGER (Samuel) runs the whole case.  → PAID/CLOSED
//   Case C — new user signs up; an ADMIN runs the whole case.              → PAID/CLOSED
//
// Uses 3 real signups, so run it on its own rate-limit window:
//   node scripts/test/e2e.mjs        (dev server must be running on :3000)
import {
  prisma, section, check, report,
  req, apiLogin, userByEmail, seedSession,
  createCase, prepareContract, sign, caseRow, fakeNoticePdf,
} from "./_lib.mjs";

const st = async (id) => (await caseRow(id))?.status;

function uploadDoc(j, caseId, { kind = "PROPERTY_PLAN", requestId } = {}) {
  const fd = new FormData();
  fd.set("file", new Blob([fakeNoticePdf("E2E DOC")], { type: "application/pdf" }), "doc.pdf");
  fd.set("kind", kind);
  if (requestId) fd.set("requestId", requestId);
  return req("POST", `/api/cases/${caseId}/documents`, { j, form: fd });
}

// Real onboarding for a brand-new user: signup → verify (typed code) → login.
async function onboard(tag, email, firstName, lastName, locale = "fr") {
  const su = await req("POST", "/api/auth/signup", {
    json: { firstName, lastName, email, password: "password1234", confirmPassword: "password1234", locale },
  });
  check(`${tag}: signup = 201`, su.status === 201, `${su.status} ${su.data?.error || ""}`);
  const code = su.data?.verifyHint?.code;
  check(`${tag}: signup returns dev verify code`, !!code, code);
  const before = await userByEmail(email);
  check(`${tag}: new user is USER + unverified`, before?.role === "USER" && before?.emailVerified == null, `${before?.role}/${before?.emailVerified}`);

  // Login must be blocked until the email is verified.
  const pre = await apiLogin(email);
  check(`${tag}: login before verify = 403`, pre.res.status === 403, `${pre.res.status}`);

  const ver = await req("POST", "/api/auth/verify", { json: { code, email } });
  check(`${tag}: verify = 200`, ver.status === 200, `${ver.status}`);

  const login = await apiLogin(email);
  check(`${tag}: login after verify = 200`, login.res.status === 200, `${login.res.status}`);
  check(`${tag}: session role USER`, login.res.data?.role === "USER", login.res.data?.role);
  return { jar: login.jar, user: await userByEmail(email) };
}

// Client signs BOTH documents → case goes ACTIVE.
async function signBoth(clientJar, caseId, tag) {
  const sc = await sign(clientJar, caseId, "contract");
  check(`${tag}: client signs contract = 200`, sc.status === 200, `${sc.status}`);
  let row = await caseRow(caseId);
  check(`${tag}: contract SIGNED, still AWAITING_SIGNATURE`, row?.contract?.status === "SIGNED" && row?.status === "AWAITING_SIGNATURE", `${row?.contract?.status}/${row?.status}`);
  const sm = await sign(clientJar, caseId, "mandate");
  check(`${tag}: client signs mandate = 200`, sm.status === 200, `${sm.status}`);
  row = await caseRow(caseId);
  check(`${tag}: both signed → ACTIVE`, row?.status === "ACTIVE", row?.status);
  check(`${tag}: both signedAt timestamps set`, !!row?.contract?.signedAt && !!row?.mandate?.signedAt);
  check(`${tag}: 2 signature.audit log entries`, (await prisma.activityLog.count({ where: { caseId, action: "signature.audit" } })) === 2);
}

// Staff requests a document; the client fulfils it → DOCUMENTS_RECEIVED.
async function docLeg(staffJar, clientJar, caseId, tag) {
  const dr = await req("POST", `/api/cases/${caseId}/doc-request`, { j: staffJar, json: { label: "Plan du bien", description: "PDF" } });
  check(`${tag}: staff requests document = 200`, dr.status === 200, `${dr.status}`);
  check(`${tag}: → AWAITING_DOCUMENTS`, (await st(caseId)) === "AWAITING_DOCUMENTS");
  const reqRow = await prisma.documentRequest.findFirst({ where: { caseId, fulfilled: false } });
  const up = await uploadDoc(clientJar, caseId, { requestId: reqRow?.id });
  check(`${tag}: client uploads requested doc = 201`, up.status === 201, `${up.status}`);
  check(`${tag}: → DOCUMENTS_RECEIVED`, (await st(caseId)) === "DOCUMENTS_RECEIVED");
}

// Analysis → DECISION_PENDING (case.analyze is held by basic employees too).
async function analyze(staffJar, caseId, tag) {
  const az = await req("POST", `/api/cases/${caseId}/analysis`, { j: staffJar, json: { rentalValueReview: "ok", simulationNotes: "e2e" } });
  check(`${tag}: analysis saved = 200`, az.status === 200, `${az.status}`);
  check(`${tag}: → DECISION_PENDING`, (await st(caseId)) === "DECISION_PENDING");
}

// Manager-only tail: decision → result → invoice → mark-paid → CLOSED.
async function decideToPaid(staffJar, caseId, tag, { savings } = {}) {
  const dec = await req("POST", `/api/cases/${caseId}/decision`, { j: staffJar, json: { branch: "PROCEEDING", note: "Contestation" } });
  check(`${tag}: decision PROCEEDING = 200`, dec.status === 200, `${dec.status}`);
  const res = await req("POST", `/api/cases/${caseId}/result`, { j: staffJar, json: { summary: "Réduction obtenue", estimatedSavings: savings, yearsCovered: "2021-2024" } });
  check(`${tag}: result recorded = 200`, res.status === 200, `${res.status}`);
  check(`${tag}: → RESULT_DELIVERED`, (await st(caseId)) === "RESULT_DELIVERED");
  const inv = await req("POST", `/api/cases/${caseId}/invoice`, { j: staffJar });
  check(`${tag}: invoice issued = 200`, inv.status === 200, `${inv.status} ${inv.data?.error || ""}`);
  const mp = await req("POST", `/api/invoices/${inv.data.invoiceId}/mark-paid`, { j: staffJar });
  check(`${tag}: invoice marked paid = 200`, mp.status === 200, `${mp.status}`);
  const paid = await prisma.invoice.findUnique({ where: { id: inv.data.invoiceId } });
  check(`${tag}: invoice PAID + paidAt`, paid?.status === "PAID" && !!paid?.paidAt, paid?.status);
  const row = await caseRow(caseId);
  check(`${tag}: case CLOSED + archived`, row?.status === "CLOSED" && row?.archived === true, `${row?.status}/${row?.archived}`);
}

const STAFF = {
  admin: "admin@samtaxco.app",
  samuel: "samuel@samtaxco.app",
  employee1: "employee1@samtaxco.app",
};

async function main() {
  section("E2E setup — seed staff sessions");
  const staff = {};
  for (const [k, email] of Object.entries(STAFF)) {
    const u = await userByEmail(email);
    check(`staff exists: ${k}`, !!u, email);
    staff[k] = { user: u, jar: await seedSession(u.id) };
  }
  const stamp = Date.now();

  // ── CASE A — new user → EMPLOYEE (assigned by ADMIN) → ADMIN finishes ────
  section("E2E Case A — new signup → basic EMPLOYEE works + ADMIN finishes → PAID/CLOSED");
  {
    const A = await onboard("A", `e2e-a+${stamp}@test.local`, "Alice", "Apple", "fr");
    const c = (await createCase(A.jar, { taxType: "TF", propertyName: "Maison Alice" })).data.id;
    check("A: owner = new user", (await caseRow(c))?.ownerId === A.user.id);
    check("A: status CONTRACT_PREPARING", (await st(c)) === "CONTRACT_PREPARING");

    // Basic employee is blocked until an ADMIN assigns them.
    const before = await prepareContract(staff.employee1.jar, c, { feeModel: "PERCENT", feePercent: 25 });
    check("A: EMPLOYEE blocked before assignment = 403", before.status === 403, `${before.status}`);
    const asg = await req("POST", `/api/admin/cases/${c}/assignments`, { j: staff.admin.jar, json: { userId: staff.employee1.user.id, role: "team" } });
    check("A: ADMIN assigns EMPLOYEE = 200", asg.status === 200, `${asg.status}`);

    const pc = await prepareContract(staff.employee1.jar, c, { feeModel: "PERCENT", feePercent: 25 });
    check("A: EMPLOYEE prepares contract after assignment = 200", pc.status === 200, `${pc.status}`);
    check("A: → AWAITING_SIGNATURE", (await st(c)) === "AWAITING_SIGNATURE");

    await signBoth(A.jar, c, "A");
    await docLeg(staff.employee1.jar, A.jar, c, "A");
    await analyze(staff.employee1.jar, c, "A (EMPLOYEE)");

    // The basic employee must NOT be able to make the manager-only decision.
    const blocked = await req("POST", `/api/cases/${c}/decision`, { j: staff.employee1.jar, json: { branch: "PROCEEDING" } });
    check("A: EMPLOYEE blocked from manager-only decision = 403", blocked.status === 403, `${blocked.status}`);
    check("A: status unchanged after blocked decision", (await st(c)) === "DECISION_PENDING");

    // ADMIN steps in and finishes the case.
    await decideToPaid(staff.admin.jar, c, "A (ADMIN)", { savings: 4000 });
  }

  // ── CASE B — new user → MANAGER runs the whole case ──────────────────────
  section("E2E Case B — new signup → MANAGER (Samuel) runs entire case → PAID/CLOSED");
  {
    const B = await onboard("B", `e2e-b+${stamp}@test.local`, "Bruno", "Berry", "fr");
    const c = (await createCase(B.jar, { taxType: "CFE", propertyName: "Bureau Bruno" })).data.id;
    check("B: owner = new user", (await caseRow(c))?.ownerId === B.user.id);

    const pc = await prepareContract(staff.samuel.jar, c, { feeModel: "FLAT", feeFlatAmount: 1500, feePercent: null });
    check("B: MANAGER prepares contract (FLAT) = 200", pc.status === 200, `${pc.status}`);
    check("B: manager set to Samuel", (await caseRow(c))?.managerId === staff.samuel.user.id);

    await signBoth(B.jar, c, "B");
    await docLeg(staff.samuel.jar, B.jar, c, "B");
    await analyze(staff.samuel.jar, c, "B");
    await decideToPaid(staff.samuel.jar, c, "B", {});
  }

  // ── CASE C — new user → ADMIN runs the whole case ────────────────────────
  section("E2E Case C — new signup → ADMIN runs entire case → PAID/CLOSED");
  {
    const C = await onboard("C", `e2e-c+${stamp}@test.local`, "Chloe", "Cherry", "en");
    const c = (await createCase(C.jar, { taxType: "TF", propertyName: "Maison Chloe" })).data.id;
    check("C: owner = new user", (await caseRow(c))?.ownerId === C.user.id);

    const pc = await prepareContract(staff.admin.jar, c, { feeModel: "PERCENT", feePercent: 20 });
    check("C: ADMIN prepares contract = 200", pc.status === 200, `${pc.status}`);

    await signBoth(C.jar, c, "C");
    await docLeg(staff.admin.jar, C.jar, c, "C");
    await analyze(staff.admin.jar, c, "C");
    await decideToPaid(staff.admin.jar, c, "C", { savings: 3000 });
  }

  const failures = report();
  await prisma.$disconnect();
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => {
  console.error("E2E CRASH:", e);
  await prisma.$disconnect().catch(() => {});
  process.exit(2);
});
