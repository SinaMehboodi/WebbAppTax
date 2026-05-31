// Client journey — the full self-service path of a real USER, exercised
// against the live endpoints:
//   signup → (blocked login while unverified) → verify → login → create case
//   → tutorial/locale/dashboard/own-case → logout, plus signup validation,
//   the inactive-account gate, and the locked-out visitor support channel.
//
// Rate-limit budget (per IP): signup 5/5min, login 10/min, support 12/10min.
// We keep the VALID signup first and total signups at 4 so a clean run never
// trips the limiter.
import {
  prisma, section, check, req, actor, ensureUser,
  createCase, caseRow, userByEmail, apiLogin,
} from "./_lib.mjs";

export async function runClientJourney(staff) {
  const stamp = Date.now();
  const email = `journey+${stamp}@test.local`;

  // ── Signup → verify → login ─────────────────────────────────────────────
  section("Client journey — signup & verification");

  const su = await req("POST", "/api/auth/signup", {
    json: { firstName: "Journey", lastName: "User", email, password: "password1234", confirmPassword: "password1234", locale: "fr" },
  });
  check("signup valid = 201", su.status === 201, `${su.status} ${su.data?.error || ""}`);
  const hint = su.data?.verifyHint;
  check("signup returns dev verifyHint.code", !!hint?.code, hint?.code);

  let row = await userByEmail(email);
  check("new user persisted as USER", row?.role === "USER", row?.role);
  check("new user is unverified (emailVerified null)", !!row && row.emailVerified == null, String(row?.emailVerified));
  check("new user has a verifyToken", !!row?.verifyToken);

  // Login is blocked until the email is verified (403 notVerified).
  const preLogin = await apiLogin(email);
  check("login before verify = 403", preLogin.res.status === 403, `${preLogin.res.status}`);
  check("…with key login.notVerified", preLogin.res.data?.error === "login.notVerified", preLogin.res.data?.error);

  // Verify using the typed 6-digit code path (what a real user does).
  const ver = await req("POST", "/api/auth/verify", { json: { code: hint.code, email } });
  check("verify with code = 200", ver.status === 200, `${ver.status} ${ver.data?.error || ""}`);
  row = await userByEmail(email);
  check("emailVerified set after verify", !!row?.emailVerified);
  check("verifyToken cleared after verify", row?.verifyToken == null);

  // Now login works and returns a real session cookie.
  const login = await apiLogin(email);
  check("login after verify = 200", login.res.status === 200, `${login.res.status}`);
  check("login returns role USER", login.res.data?.role === "USER", login.res.data?.role);
  const jarV = login.jar;
  check("session row created", (await prisma.session.count({ where: { userId: row.id } })) >= 1);

  // ── Signup validation ───────────────────────────────────────────────────
  section("Client journey — signup validation");

  const dup = await req("POST", "/api/auth/signup", {
    json: { firstName: "Dup", lastName: "User", email, password: "password1234" },
  });
  check("duplicate email = 409", dup.status === 409, `${dup.status} ${dup.data?.error}`);
  check("…with key signup.emailTaken", dup.data?.error === "signup.emailTaken", dup.data?.error);

  const weak = await req("POST", "/api/auth/signup", {
    json: { firstName: "Weak", lastName: "User", email: `weak+${stamp}@test.local`, password: "short" },
  });
  check("weak password = 400", weak.status === 400, `${weak.status} ${weak.data?.error}`);
  check("…with key signup.passwordTooShort", weak.data?.error === "signup.passwordTooShort", weak.data?.error);

  const mis = await req("POST", "/api/auth/signup", {
    json: { firstName: "Mis", lastName: "User", email: `mis+${stamp}@test.local`, password: "password1234", confirmPassword: "different1234" },
  });
  check("password mismatch = 400", mis.status === 400, `${mis.status} ${mis.data?.error}`);
  check("…with key signup.passwordMismatch", mis.data?.error === "signup.passwordMismatch", mis.data?.error);

  // ── Inactive-account gate ───────────────────────────────────────────────
  section("Client journey — inactive account gate");
  await ensureUser({ email: "journey-inactive@test.local", firstName: "In", lastName: "Active", role: "USER", active: false });
  const inLogin = await apiLogin("journey-inactive@test.local");
  check("inactive login = 403", inLogin.res.status === 403, `${inLogin.res.status}`);
  check("…with key login.deactivated", inLogin.res.data?.error === "login.deactivated", inLogin.res.data?.error);

  // ── Verified-client self-service ────────────────────────────────────────
  section("Client journey — self-service");

  const cc = await createCase(jarV, { propertyName: "Journey Home", taxType: "TF" });
  check("verified client creates case = 201", cc.status === 201, `${cc.status}`);
  const caseId = cc.data?.id;
  const crow = await caseRow(caseId);
  check("case owner = journey user", crow?.ownerId === row.id, crow?.ownerId);
  check("case status CONTRACT_PREPARING", crow?.status === "CONTRACT_PREPARING", crow?.status);

  // taxYear out of the accepted window is rejected.
  const badYear = await createCase(jarV, { taxYear: 2000 });
  check("out-of-range taxYear rejected = 400", badYear.status === 400, `${badYear.status}`);

  // First-login tutorial flag flips.
  const tut = await req("POST", "/api/me/tutorial-seen", { j: jarV });
  check("tutorial-seen = ok", tut.status === 200, `${tut.status}`);
  check("tutorial flag persisted", (await userByEmail(email))?.firstLoginTutorialSeen === true);

  // Locale endpoint sets a cookie (no DB change by design).
  const loc = await req("POST", "/api/locale", { j: jarV, json: { locale: "en" } });
  check("locale switch = ok", loc.status === 200, `${loc.status}`);
  check("locale cookie applied", /(^|; )locale=en(;|$)/.test(jarV.cookie), jarV.cookie);

  // Page access: own dashboard + own case = 200; admin = redirect away.
  const dash = await req("GET", "/dashboard", { j: jarV });
  check("client dashboard = 200", dash.status === 200, `${dash.status}`);
  const cp = await req("GET", `/cases/${caseId}`, { j: jarV });
  check("client views own case = 200", cp.status === 200, `${cp.status}`);
  const adm = await req("GET", "/admin", { j: jarV });
  check("client blocked from /admin", adm.status >= 300 && adm.status < 400, `${adm.status} -> ${adm.location}`);

  // Logout invalidates the session.
  const lo = await req("POST", "/api/auth/logout", { j: jarV });
  check("logout = ok", lo.status === 200, `${lo.status}`);
  const afterLogout = await req("GET", "/dashboard", { j: jarV });
  check("dashboard after logout redirects", afterLogout.status >= 300 && afterLogout.status < 400, `${afterLogout.status}`);

  // ── Locked-out visitor support channel ──────────────────────────────────
  section("Client journey — visitor support");

  const open = await req("POST", "/api/support", {
    json: { name: "Locked Out", email: "lockedout@test.local", subject: "Cannot login", message: "I can't access my account", locale: "fr" },
  });
  check("visitor opens support thread = 200", open.status === 200, `${open.status}`);
  const token = open.data?.token;
  const threadId = open.data?.threadId;
  check("support returns public token", !!token);

  const read1 = await req("GET", `/api/support/thread/${token}`);
  check("visitor reads thread (1 msg)", read1.data?.messages?.length === 1, `len=${read1.data?.messages?.length}`);
  check("thread status OPEN", read1.data?.thread?.status === "OPEN", read1.data?.thread?.status);

  // Samuel holds support.reply + support.manage.
  const reply = await req("POST", `/api/admin/support/${threadId}/reply`, { j: staff.samuel.jar, json: { body: "Bonjour, nous vous aidons." } });
  check("staff replies = ok", reply.status === 200, `${reply.status}`);

  const read2 = await req("GET", `/api/support/thread/${token}`);
  check("visitor sees staff reply (2 msgs)", read2.data?.messages?.length === 2, `len=${read2.data?.messages?.length}`);
  check("last message fromStaff", read2.data?.messages?.at(-1)?.fromStaff === true);
  check("thread PENDING after reply", read2.data?.thread?.status === "PENDING", read2.data?.thread?.status);

  const st = await req("POST", `/api/admin/support/${threadId}/status`, { j: staff.samuel.jar, json: { status: "RESOLVED" } });
  check("staff resolves = ok", st.status === 200, `${st.status}`);
  const read3 = await req("GET", `/api/support/thread/${token}`);
  check("thread RESOLVED", read3.data?.thread?.status === "RESOLVED", read3.data?.thread?.status);

  // A basic employee (no support.* perms) cannot reply.
  const e1Reply = await req("POST", `/api/admin/support/${threadId}/reply`, { j: staff.employee1.jar, json: { body: "nope" } });
  check("basic employee cannot reply to support = 403", e1Reply.status === 403, `${e1Reply.status}`);
}
