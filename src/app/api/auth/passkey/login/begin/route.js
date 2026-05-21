// Unauthed. Takes the email so we can scope allowCredentials to the right
// account. We deliberately return the same shape whether the email exists
// or not — otherwise this becomes an account-enumeration oracle. If the
// user has no passkeys, allowCredentials is empty and the browser will fall
// back to other auth methods.
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getRpId, saveChallenge } from "@/lib/webauthn";
import { rateLimit, rlKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

const Schema = z.object({ email: z.string().email().max(254) });

export async function POST(request) {
  const ip = getClientIp(request);
  const rl = await rateLimit({ key: rlKey("pk-login", ip), max: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "rate.tooManyAttempts" }, { status: 429 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();

  const rpID = getRpId(request);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { passkeys: { select: { credentialId: true, transports: true } } },
  });

  const allowCredentials = (user?.passkeys || []).map((p) => ({
    id: p.credentialId,
    transports: p.transports?.length ? p.transports : undefined,
  }));

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "preferred",
  });

  const handle = saveChallenge({
    kind: "login",
    // userId may be null if email didn't match — finish step will recheck
    userId: user?.id || null,
    challenge: options.challenge,
    rpID,
  });
  return NextResponse.json({ handle, options, hasPasskey: allowCredentials.length > 0 });
}
