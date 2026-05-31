// Full case workflow ×3 — drives complete cases through the state machine
// with the correct actors and asserts the persisted side-effects at each step
// (statuses, contract/mandate signing, document requests + fulfilment,
// analysis, decision, invoice math, payment, archival, and the activity log).
//
//   Case 1 — PERCENT fee, manager Samuel, full happy path to PAID/CLOSED.
//   Case 2 — FLAT fee, happy path, exercises the flat invoice math.
//   Case 3 — collaboration: employee1 (basic, assigned) handles the early
//            steps but is blocked on the manager-only decision, which Samuel
//            then makes; ends in a CANCELLED + archived close.
import {
  prisma, section, check, checkDenied,
  req, actor, createCase, prepareContract, sign, caseRow, fakeNoticePdf,
} from "./_lib.mjs";

const st = async (caseId) => (await caseRow(caseId))?.status;
const actCount = (caseId, action) => prisma.activityLog.count({ where: { caseId, action } });

// Client uploads a document, optionally fulfilling a specific request.
function uploadDoc(j, caseId, { kind = "PROPERTY_PLAN", requestId } = {}) {
  const fd = new FormData();
  fd.set("file", new Blob([fakeNoticePdf("EXTRA DOC")], { type: "application/pdf" }), "doc.pdf");
  fd.set("kind", kind);
  if (requestId) fd.set("requestId", requestId);
  return req("POST", `/api/cases/${caseId}/documents`, { j, form: fd });
}

// Shared "sign both → ACTIVE" leg, with assertions.
async function signBothToActive(client, caseId, tag) {
  const sc = await sign(client.jar, caseId, "contract");
  check(`${tag}: client signs contract = 200`, sc.status === 200, `${sc.status}`);
  let row = await caseRow(caseId);
  check(`${tag}: contract row SIGNED`, row?.contract?.status === "SIGNED", row?.contract?.status);
  check(`${tag}: still AWAITING_SIGNATURE (mandate pending)`, row?.status === "AWAITING_SIGNATURE", row?.status);

  const sm = await sign(client.jar, caseId, "mandate");
  check(`${tag}: client signs mandate = 200`, sm.status === 200, `${sm.status}`);
  row = await caseRow(caseId);
  check(`${tag}: mandate row SIGNED`, row?.mandate?.status === "SIGNED", row?.mandate?.status);
  check(`${tag}: both signed -> ACTIVE`, row?.status === "ACTIVE", row?.status);
  check(`${tag}: contract.signedAt set`, !!row?.contract?.signedAt);
  check(`${tag}: mandate.signedAt set`, !!row?.mandate?.signedAt);
  check(`${tag}: 2 signature.audit log entries`, (await actCount(caseId, "signature.audit")) === 2);
}

// Shared "doc-request -> client upload -> DOCUMENTS_RECEIVED" leg.
async function docRequestLeg(staffJar, client, caseId, tag) {
  const dr = await req("POST", `/api/cases/${caseId}/doc-request`, { j: staffJar, json: { label: "Plan du bien", description: "PDF" } });
  check(`${tag}: staff requests document = ok`, dr.status === 200, `${dr.status}`);
  check(`${tag}: status AWAITING_DOCUMENTS`, (await st(caseId)) === "AWAITING_DOCUMENTS");
  const reqRow = await prisma.documentRequest.findFirst({ where: { caseId, fulfilled: false } });
  check(`${tag}: documentRequest persisted (unfulfilled)`, !!reqRow);

  const up = await uploadDoc(client.jar, caseId, { kind: "PROPERTY_PLAN", requestId: reqRow?.id });
  check(`${tag}: client uploads requested doc = 201`, up.status === 201, `${up.status}`);
  const reqAfter = await prisma.documentRequest.findUnique({ where: { id: reqRow.id } });
  check(`${tag}: request marked fulfilled`, reqAfter?.fulfilled === true);
  check(`${tag}: all fulfilled -> DOCUMENTS_RECEIVED`, (await st(caseId)) === "DOCUMENTS_RECEIVED");
}

export async function runWorkflows(staff) {
  const samuel = staff.samuel;
  const employee1 = staff.employee1;
  const client = await actor({ email: "wf-client@test.local", firstName: "Work", lastName: "Flow", role: "USER" });

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 1 — PERCENT fee, Samuel, happy path to PAID/CLOSED
  // ─────────────────────────────────────────────────────────────────────────
  section("Workflow Case 1 — PERCENT happy path (Samuel)");
  {
    const c = (await createCase(client.jar, { taxType: "TF", propertyName: "Maison Lyon" })).data.id;
    check("C1: created -> CONTRACT_PREPARING", (await st(c)) === "CONTRACT_PREPARING");
    check("C1: tax-notice document attached", (await prisma.document.count({ where: { caseId: c, kind: "TAX_NOTICE" } })) === 1);

    const pc = await prepareContract(samuel.jar, c, { feeModel: "PERCENT", feePercent: 25 });
    check("C1: prepare contract = ok", pc.status === 200, `${pc.status}`);
    let row = await caseRow(c);
    check("C1: status AWAITING_SIGNATURE", row?.status === "AWAITING_SIGNATURE", row?.status);
    check("C1: contract row SENT", row?.contract?.status === "SENT", row?.contract?.status);
    check("C1: mandate row SENT", row?.mandate?.status === "SENT", row?.mandate?.status);
    check("C1: manager set to Samuel", row?.managerId === samuel.user.id, row?.managerId);
    check("C1: CONTRACT + MANDATE documents created",
      (await prisma.document.count({ where: { caseId: c, kind: { in: ["CONTRACT", "MANDATE"] } } })) === 2);

    await signBothToActive(client, c, "C1");

    await docRequestLeg(samuel.jar, client, c, "C1");

    // Intermediate ANALYZING via generic status route.
    const an = await req("POST", `/api/cases/${c}/status`, { j: samuel.jar, json: { status: "ANALYZING" } });
    check("C1: move to ANALYZING = ok", an.status === 200, `${an.status}`);
    check("C1: status ANALYZING", (await st(c)) === "ANALYZING");

    const az = await req("POST", `/api/cases/${c}/analysis`, { j: samuel.jar, json: { rentalValueReview: "ok", simulationNotes: "−25%" } });
    check("C1: analysis saved = ok", az.status === 200, `${az.status}`);
    check("C1: analysis row created", (await prisma.analysis.count({ where: { caseId: c } })) === 1);
    check("C1: status DECISION_PENDING", (await st(c)) === "DECISION_PENDING");

    const dec = await req("POST", `/api/cases/${c}/decision`, { j: samuel.jar, json: { branch: "PROCEEDING", note: "Contestation" } });
    check("C1: decision PROCEEDING = ok", dec.status === 200, `${dec.status}`);
    row = await caseRow(c);
    check("C1: status PROCEEDING", row?.status === "PROCEEDING", row?.status);
    check("C1: decisionAt set", !!row?.decisionAt);

    // Intermediate ADMIN_RESPONSE.
    await req("POST", `/api/cases/${c}/status`, { j: samuel.jar, json: { status: "ADMIN_RESPONSE" } });
    check("C1: status ADMIN_RESPONSE", (await st(c)) === "ADMIN_RESPONSE");

    const res = await req("POST", `/api/cases/${c}/result`, { j: samuel.jar, json: { summary: "Réduction obtenue", estimatedSavings: 4000, yearsCovered: "2021-2024" } });
    check("C1: result recorded = ok", res.status === 200, `${res.status}`);
    row = await caseRow(c);
    check("C1: status RESULT_DELIVERED", row?.status === "RESULT_DELIVERED", row?.status);
    check("C1: estimatedSavings persisted = 4000", Number(row?.estimatedSavings) === 4000, String(row?.estimatedSavings));

    const inv = await req("POST", `/api/cases/${c}/invoice`, { j: samuel.jar });
    check("C1: invoice issued = ok", inv.status === 200, `${inv.status} ${inv.data?.error || ""}`);
    check("C1: status INVOICED", (await st(c)) === "INVOICED");
    const invRow = await prisma.invoice.findUnique({ where: { id: inv.data.invoiceId } });
    check("C1: invoice amountHT = 4000×25% = 1000", Number(invRow?.amountHT) === 1000, String(invRow?.amountHT));
    check("C1: invoice amountTTC = 1200 (20% VAT)", Number(invRow?.amountTTC) === 1200, String(invRow?.amountTTC));
    check("C1: invoice number format INV-YYYY-####", /^INV-\d{4}-\d{4}$/.test(invRow?.number || ""), invRow?.number);

    const mp = await req("POST", `/api/invoices/${inv.data.invoiceId}/mark-paid`, { j: samuel.jar });
    check("C1: mark paid = ok", mp.status === 200, `${mp.status}`);
    const paid = await prisma.invoice.findUnique({ where: { id: inv.data.invoiceId } });
    check("C1: invoice PAID + paidAt", paid?.status === "PAID" && !!paid?.paidAt, paid?.status);
    row = await caseRow(c);
    check("C1: case CLOSED", row?.status === "CLOSED", row?.status);
    check("C1: case archived", row?.archived === true);
    check("C1: invoice.issued + invoice.paid logged",
      (await actCount(c, "invoice.issued")) === 1 && (await actCount(c, "invoice.paid")) === 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 2 — FLAT fee, happy path, flat invoice math
  // ─────────────────────────────────────────────────────────────────────────
  section("Workflow Case 2 — FLAT fee happy path (Samuel)");
  {
    const c = (await createCase(client.jar, { taxType: "CFE", propertyName: "Bureau Paris" })).data.id;

    const pc = await prepareContract(samuel.jar, c, { feeModel: "FLAT", feeFlatAmount: 1500, feePercent: null });
    check("C2: prepare contract (FLAT) = ok", pc.status === 200, `${pc.status}`);
    const row0 = await caseRow(c);
    check("C2: feeModel FLAT persisted", row0?.feeModel === "FLAT", row0?.feeModel);
    check("C2: feeFlatAmount = 1500", Number(row0?.feeFlatAmount) === 1500, String(row0?.feeFlatAmount));

    await signBothToActive(client, c, "C2");
    await docRequestLeg(samuel.jar, client, c, "C2");

    const az = await req("POST", `/api/cases/${c}/analysis`, { j: samuel.jar, json: { simulationNotes: "forfait" } });
    check("C2: analysis = ok", az.status === 200, `${az.status}`);
    const dec = await req("POST", `/api/cases/${c}/decision`, { j: samuel.jar, json: { branch: "PROCEEDING" } });
    check("C2: decision PROCEEDING = ok", dec.status === 200, `${dec.status}`);
    const res = await req("POST", `/api/cases/${c}/result`, { j: samuel.jar, json: { summary: "Forfait livré" } });
    check("C2: result = ok", res.status === 200, `${res.status}`);

    const inv = await req("POST", `/api/cases/${c}/invoice`, { j: samuel.jar });
    check("C2: invoice issued = ok", inv.status === 200, `${inv.status}`);
    const invRow = await prisma.invoice.findUnique({ where: { id: inv.data.invoiceId } });
    check("C2: flat invoice amountHT = 1500", Number(invRow?.amountHT) === 1500, String(invRow?.amountHT));
    check("C2: flat invoice amountTTC = 1800", Number(invRow?.amountTTC) === 1800, String(invRow?.amountTTC));

    const mp = await req("POST", `/api/invoices/${inv.data.invoiceId}/mark-paid`, { j: samuel.jar });
    check("C2: mark paid = ok", mp.status === 200, `${mp.status}`);
    check("C2: case CLOSED", (await st(c)) === "CLOSED");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 3 — collaboration + handoff, ends CANCELLED
  // ─────────────────────────────────────────────────────────────────────────
  section("Workflow Case 3 — collaboration (employee1 + Samuel), CANCELLED");
  {
    const c = (await createCase(client.jar, { taxType: "TF", propertyName: "Local Marseille" })).data.id;

    // Basic employee can't touch it until assigned (scope).
    const pre = await prepareContract(employee1.jar, c, { feeModel: "PERCENT", feePercent: 20 });
    checkDenied("C3: employee1 blocked before assignment", pre);

    // Samuel (manager) assigns employee1 via the real API.
    const asg = await req("POST", `/api/admin/cases/${c}/assignments`, { j: samuel.jar, json: { userId: employee1.user.id, role: "team" } });
    check("C3: Samuel assigns employee1 = ok", asg.status === 200, `${asg.status}`);
    check("C3: assignment row exists", (await prisma.caseAssignment.count({ where: { caseId: c, userId: employee1.user.id } })) === 1);

    // Now employee1 can prepare the contract (and becomes manager).
    const pc = await prepareContract(employee1.jar, c, { feeModel: "PERCENT", feePercent: 20 });
    check("C3: employee1 prepares contract after assignment = ok", pc.status === 200, `${pc.status}`);
    check("C3: status AWAITING_SIGNATURE", (await st(c)) === "AWAITING_SIGNATURE");

    await signBothToActive(client, c, "C3");
    await docRequestLeg(employee1.jar, client, c, "C3");

    // employee1 can analyze (has perm + scope)…
    const az = await req("POST", `/api/cases/${c}/analysis`, { j: employee1.jar, json: { simulationNotes: "aucune marge" } });
    check("C3: employee1 analysis = ok", az.status === 200, `${az.status}`);
    check("C3: status DECISION_PENDING", (await st(c)) === "DECISION_PENDING");

    // …but CANNOT decide — that's manager-only. Proves the perm boundary holds
    // mid-workflow even though employee1 is in scope.
    const dEmp = await req("POST", `/api/cases/${c}/decision`, { j: employee1.jar, json: { branch: "NOT_PROCEEDING" } });
    checkDenied("C3: employee1 cannot decide (manager-only)", dEmp);
    check("C3: status unchanged after blocked decision", (await st(c)) === "DECISION_PENDING");

    // Samuel makes the decision.
    const dMgr = await req("POST", `/api/cases/${c}/decision`, { j: samuel.jar, json: { branch: "NOT_PROCEEDING", note: "Pas de marge" } });
    check("C3: Samuel decides NOT_PROCEEDING = ok", dMgr.status === 200, `${dMgr.status}`);
    check("C3: status NOT_PROCEEDING", (await st(c)) === "NOT_PROCEEDING");

    // Cancel requires a reason; cancel archives immediately.
    const noReason = await req("POST", `/api/cases/${c}/close`, { j: samuel.jar, json: { outcome: "cancel" } });
    check("C3: cancel without reason = 400", noReason.status === 400, `${noReason.status}`);
    const close = await req("POST", `/api/cases/${c}/close`, { j: samuel.jar, json: { outcome: "cancel", reason: "Client a renoncé" } });
    check("C3: cancel with reason = ok", close.status === 200, `${close.status}`);
    const row = await caseRow(c);
    check("C3: status CANCELLED", row?.status === "CANCELLED", row?.status);
    check("C3: archived on cancel", row?.archived === true);
    check("C3: closeReason persisted", !!row?.closeReason);
  }
}
