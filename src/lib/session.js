// Server-only session helpers. We store sessions in the DB (Session model) and
// expose the session token via an httpOnly cookie. This avoids depending on a
// third-party auth library and is small enough to audit at a glance.
import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

const SESSION_COOKIE = "mindset_session";
const SESSION_TTL_DAYS = 30;
const EXTENDED_TTL_DAYS = 90;

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export async function createSession(userId, options = {}) {
  // Default 30 days. When the user ticks "Remember me" we extend to 90.
  const ttlDays = options.ttlDays || SESSION_TTL_DAYS;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export { EXTENDED_TTL_DAYS, SESSION_TTL_DAYS };

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await prisma.session.delete({ where: { token } });
    } catch {
      // session may already be gone
    }
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  // Deactivated user — kill the cookie and force re-login
  if (session.user.active === false) {
    await prisma.session.deleteMany({ where: { userId: session.userId } }).catch(() => {});
    jar.delete(SESSION_COOKIE);
    return null;
  }
  const { password, ...safe } = session.user;
  return safe;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(null, { status: 401, headers: { Location: "/login" } });
  }
  return user;
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(user.role)) {
    throw new Response(null, { status: 403, headers: { Location: "/" } });
  }
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new Response(null, { status: 403, headers: { Location: "/" } });
  }
  return user;
}
