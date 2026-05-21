// DocuSign integration. For V1 the actual JWT/OAuth + envelope creation calls
// are stubbed so the app remains runnable without DocuSign credentials. When
// DOCUSIGN_INTEGRATION_KEY etc. are set, `sendEnvelope` should hit the eSign
// REST API. The shape returned matches what the rest of the app expects.
import "server-only";
import { randomUUID } from "node:crypto";

const HAS_CREDS =
  !!process.env.DOCUSIGN_INTEGRATION_KEY &&
  !!process.env.DOCUSIGN_USER_ID &&
  !!process.env.DOCUSIGN_ACCOUNT_ID;

export function isStub() {
  return !HAS_CREDS;
}

/**
 * Send an envelope to a signer. Returns { envelopeId, signUrl, provider }.
 * In stub mode we return a synthetic envelope id and a `signUrl` pointing at
 * an internal page that lets the user "sign" with a click.
 */
export async function sendEnvelope({
  documentBase64,
  documentName,
  signerEmail,
  signerName,
  caseId,
  kind, // "contract" | "mandate"
}) {
  if (isStub()) {
    const envelopeId = `stub-${randomUUID()}`;
    return {
      provider: "stub",
      envelopeId,
      signUrl: `/cases/${caseId}/sign?envelope=${envelopeId}&kind=${kind}`,
    };
  }
  // TODO: real DocuSign call:
  //   1. JWT grant -> access token
  //   2. POST /v2.1/accounts/{accountId}/envelopes with documentBase64
  //   3. POST /v2.1/accounts/{accountId}/envelopes/{id}/views/recipient -> embedded sign URL
  throw new Error("DocuSign live integration not yet wired. See src/lib/docusign.js.");
}

/**
 * Poll/verify an envelope status. Returns "sent" | "viewed" | "signed" | "declined" | "expired".
 */
export async function getEnvelopeStatus(envelopeId) {
  if (envelopeId?.startsWith("stub-")) {
    // Stub: status is tracked in our DB, not here.
    return "sent";
  }
  throw new Error("DocuSign live integration not yet wired.");
}
