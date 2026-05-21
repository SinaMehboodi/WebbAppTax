// Step 1 of 2 for enrolling a new biometric credential. Must be authed.
// Returns:
//   - handle: opaque server-issued ID to send back in /finish
//   - options: PublicKeyCredentialCreationOptionsJSON for navigator.credentials.create()
import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getRpId, getRpName, saveChallenge } from "@/lib/webauthn";

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rpID = getRpId(request);
  // Exclude already-registered credentials so the user doesn't double-enrol
  // the same device.
  const existing = await prisma.passkey.findMany({
    where: { userId: me.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: getRpName(),
    rpID,
    userID: new TextEncoder().encode(me.id),
    userName: me.email,
    userDisplayName: `${me.firstName} ${me.lastName}`.trim() || me.email,
    attestationType: "none",
    authenticatorSelection: {
      // Prefer the device's built-in biometric (Touch ID, Face ID, Android
      // fingerprint, Windows Hello) over external USB keys.
      authenticatorAttachment: "platform",
      userVerification: "preferred",
      residentKey: "preferred",
    },
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: p.transports?.length ? p.transports : undefined,
    })),
  });

  const handle = saveChallenge({
    kind: "register",
    userId: me.id,
    challenge: options.challenge,
    rpID,
  });
  return NextResponse.json({ handle, options });
}
