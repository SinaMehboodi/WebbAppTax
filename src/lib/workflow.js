// Helpers for tax case lifecycle (Phase 3 -> Phase 7).
import "server-only";
import { prisma } from "./prisma";

export const STATUS = {
  DRAFT: "DRAFT",
  CONTRACT_PREPARING: "CONTRACT_PREPARING",
  AWAITING_SIGNATURE: "AWAITING_SIGNATURE",
  SIGNED: "SIGNED",
  ACTIVE: "ACTIVE",
  AWAITING_DOCUMENTS: "AWAITING_DOCUMENTS",
  DOCUMENTS_RECEIVED: "DOCUMENTS_RECEIVED",
  ANALYZING: "ANALYZING",
  DECISION_PENDING: "DECISION_PENDING",
  PROCEEDING: "PROCEEDING",
  NOT_PROCEEDING: "NOT_PROCEEDING",
  AUDIT_OFFERED: "AUDIT_OFFERED",
  ADMIN_RESPONSE: "ADMIN_RESPONSE",
  RESULT_DELIVERED: "RESULT_DELIVERED",
  INVOICED: "INVOICED",
  PAID: "PAID",
  CLOSED: "CLOSED",
  STOPPED: "STOPPED",
  CANCELLED: "CANCELLED",
};

// Statuses that are visible to clients as "open" (vs archived)
export const OPEN_STATUSES = [
  "DRAFT",
  "CONTRACT_PREPARING",
  "AWAITING_SIGNATURE",
  "SIGNED",
  "ACTIVE",
  "AWAITING_DOCUMENTS",
  "DOCUMENTS_RECEIVED",
  "ANALYZING",
  "DECISION_PENDING",
  "PROCEEDING",
  "AUDIT_OFFERED",
  "ADMIN_RESPONSE",
  "RESULT_DELIVERED",
  "INVOICED",
  "PAID",
];

// Clients see their case as soon as they upload the notice, with a friendly
// "pending" label until the contract is ready. Only CANCELLED is hidden.
//
// Cases in DRAFT/CONTRACT_PREPARING render the case detail page with a
// reassuring "we received your notice, our team is preparing your contract"
// banner — they don't show action items the client can't act on.
export function isClientVisible(caseRecord) {
  return caseRecord.status !== "CANCELLED";
}

// True when the client should NOT see action items / docs / comments yet —
// only the pending banner. (Before contract is sent for signature.)
export function isPreContractStage(status) {
  return status === "DRAFT" || status === "CONTRACT_PREPARING";
}

export async function generateReference(taxType, taxYear) {
  // Format: TF-2025-0001
  const count = await prisma.taxCase.count({ where: { taxType, taxYear } });
  return `${taxType}-${taxYear}-${String(count + 1).padStart(4, "0")}`;
}

export async function setStatus({ caseId, status, actorId, note }) {
  const before = await prisma.taxCase.findUnique({ where: { id: caseId } });
  if (!before) throw new Error("case not found");
  const updated = await prisma.taxCase.update({
    where: { id: caseId },
    data: { status },
  });
  await prisma.activityLog.create({
    data: {
      caseId,
      actorId,
      action: "status.changed",
      details: { from: before.status, to: status, note: note || null },
    },
  });
  return updated;
}

export async function logActivity({ caseId, actorId, action, details }) {
  return prisma.activityLog.create({
    data: { caseId, actorId, action, details: details || null },
  });
}
