// Step 2 of 2 — verifies the attestation and stores the new credential.
import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getOrigin, popChallenge, uaToDeviceName } from "@/lib/webauthn";
import { getUserAgent } from "@/lib/audit";

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { handle, response } = body || {};
  const saved = popChallenge(handle);
  if (!saved || saved.kind !== "register" || saved.userId !== me.id) {
    return NextResponse.json({ error: "challenge.invalid" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: saved.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: saved.rpID,
      requireUserVerification: false, // some platforms can't promise this
    });
  } catch (err) {
    return NextResponse.json({ error: "verify.failed", detail: err.message }, { status: 400 });
  }
  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "verify.failed" }, { status: 400 });
  }

  const info = verification.registrationInfo;
  const credentialId = info.credential?.id ?? info.credentialID;
  const publicKey    = info.credential?.publicKey ?? info.credentialPublicKey;
  const counter      = info.credential?.counter ?? info.counter ?? 0;
  const transports   = info.credential?.transports || response.response?.transports || [];

  if (!credentialId || !publicKey) {
    return NextResponse.json({ error: "verify.failed" }, { status: 400 });
  }

  const deviceName = uaToDeviceName(getUserAgent(request));

  await prisma.passkey.create({
    data: {
      userId: me.id,
      credentialId,
      publicKey: Buffer.from(publicKey),
      counter: BigInt(counter),
      transports,
      deviceName,
    },
  });

  return NextResponse.json({ ok: true, deviceName });
}
