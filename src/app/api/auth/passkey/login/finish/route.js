// Verifies the assertion and creates a session.
import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { getOrigin, popChallenge } from "@/lib/webauthn";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { handle, response, rememberMe } = body || {};
  const saved = popChallenge(handle);
  if (!saved || saved.kind !== "login") {
    return NextResponse.json({ error: "challenge.invalid" }, { status: 400 });
  }

  const credentialId = response?.id || response?.rawId;
  if (!credentialId) {
    return NextResponse.json({ error: "no.credential" }, { status: 400 });
  }

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId },
    include: { user: true },
  });
  if (!passkey) return NextResponse.json({ error: "unknown.credential" }, { status: 400 });

  // If the begin step learned the userId, it must match. Stops one user's
  // device from logging in as another via mismatched email.
  if (saved.userId && saved.userId !== passkey.userId) {
    return NextResponse.json({ error: "mismatch" }, { status: 400 });
  }

  if (!passkey.user.active) {
    return NextResponse.json({ error: "login.deactivated" }, { status: 403 });
  }
  if (!passkey.user.emailVerified) {
    return NextResponse.json({ error: "login.notVerified" }, { status: 403 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: saved.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: saved.rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: Uint8Array.from(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports,
      },
      requireUserVerification: false,
    });
  } catch (err) {
    return NextResponse.json({ error: "verify.failed", detail: err.message }, { status: 400 });
  }
  if (!verification.verified) {
    return NextResponse.json({ error: "verify.failed" }, { status: 400 });
  }

  // Bump the counter (replay protection) + update last-used
  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter || 0),
      lastUsedAt: new Date(),
    },
  });

  // Create session — rememberMe extends the cookie to 90 days
  await createSession(passkey.userId, { ttlDays: rememberMe ? 90 : 30 });

  return NextResponse.json({
    ok: true,
    role: passkey.user.role,
    firstLoginTutorialSeen: passkey.user.firstLoginTutorialSeen,
  });
}
