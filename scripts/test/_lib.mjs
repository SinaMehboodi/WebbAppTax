// Shared helpers for the SamTaxco automated test harness.
//
// Strategy: exercise the REAL HTTP API against the running dev server
// (localhost:3000) with a cookie jar, and use Prisma directly to (a) seed
// deterministic test fixtures and (b) assert side-effects in the DB after each
// API call. This catches both the HTTP contract AND the persisted state.
//
// Auth note: POST /api/auth/login is rate-limited (10/min/IP) and signup
// (5/5min/IP). To stay under those during setup we mint Session rows straight
// in the DB via `seedSession()` and only call the real login/signup endpoints
// in the dedicated auth section, where the call count is small.
//
// Run:  node scripts/test/run.mjs       (dev server must be running)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

export const BASE = process.env.TEST_BASE || "http://localhost:3000";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------
const results = [];
let currentSection = "general";

export function section(name) {
  currentSection = name;
  console.log(`\n=== ${name} ===`);
}

// Record a check. `pass` truthy => PASS.
export function check(name, pass, detail = "") {
  const rec = { section: currentSection, name, pass: !!pass, detail: String(detail || "") };
  results.push(rec);
  const tag = rec.pass ? "PASS" : "FAIL";
  console.log(`  ${tag}  ${name}${rec.detail ? `  — ${rec.detail}` : ""}`);
  return rec.pass;
}

// Assert an HTTP response was a permission DENY (401/403).
export function checkDenied(name, res) {
  return check(name, res.status === 401 || res.status === 403, `got ${res.status}`);
}

// Assert an HTTP response PASSED the auth gate (anything but 401/403). A 400
// (bad body) or 404 (missing row) still proves the principal was allowed in.
export function checkAllowed(name, res) {
  return check(name, res.status !== 401 && res.status !== 403, `got ${res.status}`);
}

export function report() {
  const total = results.length;
  const failed = results.filter((r) => !r.pass);
  console.log(`\n──────────── RESULTS ────────────`);
  // Per-section tally
  const bySection = {};
  for (const r of results) {
    bySection[r.section] ??= { pass: 0, total: 0 };
    bySection[r.section].total++;
    if (r.pass) bySection[r.section].pass++;
  }
  for (const [s, v] of Object.entries(bySection)) {
    console.log(`  ${v.pass === v.total ? "✓" : "✗"} ${s.padEnd(34)} ${v.pass}/${v.total}`);
  }
  console.log(`  ${"".padEnd(34)} ${"─".repeat(7)}`);
  console.log(`  ${"TOTAL".padEnd(34)} ${total - failed.length}/${total}`);
  if (failed.length) {
    console.log(`\n  FAILURES (${failed.length}):`);
    for (const f of failed) {
      console.log(`   ✗ [${f.section}] ${f.name}${f.detail ? `  — ${f.detail}` : ""}`);
    }
  }
  return failed.length;
}

// ---------------------------------------------------------------------------
// HTTP with a tiny cookie jar
// ---------------------------------------------------------------------------
export function jar(initialCookie = "") {
  return { cookie: initialCookie };
}

function readSetCookies(res) {
  if (typeof res.headers.getSetCookie === "function") return res.headers.getSetCookie();
  const raw = res.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function applySetCookie(j, res) {
  if (!j) return;
  const existing = new Map(
    (j.cookie ? j.cookie.split("; ") : [])
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        return [p.slice(0, i), p.slice(i + 1)];
      })
  );
  for (const c of readSetCookies(res)) {
    const m = /^([^=]+)=([^;]*)/.exec(c);
    if (!m) continue;
    const name = m[1];
    const val = m[2];
    // Deletion (empty value or expired) -> drop it
    if (!val || /expires=Thu, 01 Jan 1970/i.test(c) || /max-age=0/i.test(c)) existing.delete(name);
    else existing.set(name, val);
  }
  j.cookie = [...existing.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

// Generic request. Pass { j } for a cookie jar, { json } for a JSON body,
// { form } for a FormData body, { redirect } default "manual".
export async function req(method, path, opts = {}) {
  const { j, json, form, headers = {}, redirect = "manual" } = opts;
  const h = { ...headers };
  if (j?.cookie) h.cookie = j.cookie;
  let body;
  if (json !== undefined) {
    h["content-type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // fetch sets multipart content-type + boundary
  }
  const res = await fetch(BASE + path, { method, headers: h, body, redirect });
  if (j) applySetCookie(j, res);
  const ct = res.headers.get("content-type") || "";
  let data = null;
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = null;
  }
  return { status: res.status, data, location: res.headers.get("location"), headers: res.headers };
}

// ---------------------------------------------------------------------------
// Fixtures (Prisma-backed, rate-limit-free)
// ---------------------------------------------------------------------------
let _pwHash = null;
async function pwHash() {
  if (!_pwHash) _pwHash = await bcrypt.hash("password1234", 10);
  return _pwHash;
}

// Upsert a verified user of any role. Returns the user row.
export async function ensureUser({ email, firstName, lastName, role = "USER", permissions = [], active = true }) {
  const password = await pwHash();
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role, permissions, active, emailVerified: new Date() },
    create: {
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      permissions,
      active,
      locale: "fr",
      emailVerified: new Date(),
      firstLoginTutorialSeen: true,
    },
  });
}

// Mint a DB-backed session for a user id and return a cookie jar carrying it.
// Mirrors createSession() in src/lib/session.js (cookie name + Session row).
export async function seedSession(userId, ttlDays = 30) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlDays * 86400_000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  return jar(`mindset_session=${token}`);
}

// Convenience: ensure a user exists AND return a ready session jar for them.
export async function actor(spec) {
  const u = await ensureUser(spec);
  const j = await seedSession(u.id);
  return { user: u, jar: j };
}

export async function userByEmail(email) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

// ---------------------------------------------------------------------------
// Fake payloads
// ---------------------------------------------------------------------------
// 1×1 transparent PNG (valid, ~68 bytes) — embeds fine via pdf-lib.
export const SIGNATURE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export function fakeNoticePdf(label = "TEST NOTICE") {
  // Not parsed by the app (stored as-is), so a minimal byte blob is fine.
  return Buffer.from(`%PDF-1.4\n% ${label}\n1 0 obj<</Type/Catalog>>endobj\ntrailer<<>>\n%%EOF`, "utf8");
}

// ---------------------------------------------------------------------------
// Domain helpers (real API)
// ---------------------------------------------------------------------------
// Real login endpoint (used by the auth section). Returns { res, jar }.
export async function apiLogin(email, password = "password1234", rememberMe = false) {
  const j = jar();
  const res = await req("POST", "/api/auth/login", { j, json: { email, password, rememberMe } });
  return { res, jar: j };
}

// Client uploads a tax notice -> new case (DRAFT -> CONTRACT_PREPARING).
export async function createCase(j, { taxType = "TF", taxYear = new Date().getFullYear(), propertyName = "Test Property", noticeDate } = {}) {
  const fd = new FormData();
  fd.set("file", new Blob([fakeNoticePdf()], { type: "application/pdf" }), "notice.pdf");
  fd.set("taxType", taxType);
  fd.set("taxYear", String(taxYear));
  fd.set("propertyName", propertyName);
  if (noticeDate) fd.set("noticeDate", noticeDate);
  return req("POST", "/api/cases", { j, form: fd });
}

// Staff prepares contract+mandate (JSON mode) -> AWAITING_SIGNATURE.
export async function prepareContract(j, caseId, body = {}) {
  return req("POST", `/api/cases/${caseId}/contract`, {
    j,
    json: { feeModel: "PERCENT", feePercent: 25, propertyName: "Test Property", propertyAddress: "1 rue de Test", propertyCity: "Paris", propertyZip: "75001", ...body },
  });
}

// Client signs contract or mandate.
export async function sign(j, caseId, kind) {
  return req("POST", `/api/cases/${caseId}/sign`, {
    j,
    json: { kind, signatureDataUrl: SIGNATURE_PNG, consent: true },
  });
}

export async function caseRow(caseId) {
  return prisma.taxCase.findUnique({
    where: { id: caseId },
    include: { contract: true, mandate: true, assignments: true, invoice: true, analyses: true },
  });
}

// Small helper to pause (rate-limit friendliness when needed).
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
