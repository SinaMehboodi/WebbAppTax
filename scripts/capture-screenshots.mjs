// Drives a headless Chrome session via puppeteer-core (system Chrome) to
// capture every screen of the SamTaxco app for the user guide PDF.
//
// Each entry in PAGES specifies:
//   - file       : output filename (PNG, saved under docs/screenshots/)
//   - url        : path relative to the dev server
//   - viewport   : "mobile" | "desktop"
//   - login      : optional email/password to log in before navigating
//   - prep       : optional async (page) => {} step to prepare the page
//
// Run with:  node scripts/capture-screenshots.mjs
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const OUT_DIR = path.resolve("docs/screenshots");

const VIEWPORTS = {
  mobile:  { width: 390, height: 844, deviceScaleFactor: 2 },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1.5 },
};

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const PAGES = [
  // ---- Public ---------------------------------------------------------
  { file: "01-landing-mobile.png",     url: "/",       viewport: "mobile" },
  { file: "02-landing-desktop.png",    url: "/",       viewport: "desktop" },
  { file: "03-login.png",              url: "/login",  viewport: "mobile" },
  { file: "04-signup.png",             url: "/signup", viewport: "mobile" },
  { file: "05-forgot-password.png",    url: "/forgot-password", viewport: "mobile" },

  // ---- Client (Marie) -------------------------------------------------
  { file: "06-client-dashboard.png",   url: "/dashboard", viewport: "mobile",
    login: { email: "marie@example.com", password: "password1234" } },
  { file: "07-client-cases.png",       url: "/cases",     viewport: "mobile",
    login: { email: "marie@example.com", password: "password1234" } },
  { file: "08-client-case-pending.png", viewport: "mobile",
    login: { email: "marie@example.com", password: "password1234" },
    ref: "TF-2026-0001", path: "/cases/{id}" },
  { file: "09-client-case-awaiting-docs.png", viewport: "mobile",
    login: { email: "marie@example.com", password: "password1234" },
    ref: "TF-2026-0002", path: "/cases/{id}" },
  { file: "10-client-account.png",     url: "/account", viewport: "mobile",
    login: { email: "marie@example.com", password: "password1234" } },
  { file: "11-client-notifications.png", url: "/notifications", viewport: "mobile",
    login: { email: "marie@example.com", password: "password1234" } },
  { file: "12-client-referral.png",    url: "/referral", viewport: "mobile",
    login: { email: "marie@example.com", password: "password1234" } },

  // ---- Employee (Samuel — head of team) -------------------------------
  { file: "20-admin-workflow.png",     url: "/admin",          viewport: "desktop",
    login: { email: "samuel@samtaxco.app", password: "password1234" } },
  { file: "21-admin-inbox.png",        url: "/admin/inbox",    viewport: "desktop",
    login: { email: "samuel@samtaxco.app", password: "password1234" } },
  { file: "22-admin-cases.png",        url: "/admin/cases",    viewport: "desktop",
    login: { email: "samuel@samtaxco.app", password: "password1234" } },
  { file: "23-admin-case-workspace.png", viewport: "desktop",
    login: { email: "samuel@samtaxco.app", password: "password1234" },
    ref: "TF-2026-0002", path: "/admin/cases/{id}" },
  { file: "24-admin-reports.png",      url: "/admin/reports",  viewport: "desktop",
    login: { email: "samuel@samtaxco.app", password: "password1234" } },
  { file: "25-admin-presentation.png", url: "/admin/presentation", viewport: "desktop",
    login: { email: "samuel@samtaxco.app", password: "password1234" } },

  // ---- Admin / Super-Admin --------------------------------------------
  { file: "30-superadmin-users.png",   url: "/admin/users",    viewport: "desktop",
    login: { email: "superadmin@samtaxco.app", password: "password1234" } },
  { file: "31-superadmin-permissions.png", viewport: "desktop",
    login: { email: "superadmin@samtaxco.app", password: "password1234" },
    userEmail: "employee1@samtaxco.app", path: "/admin/users/{id}/permissions" },

  // ---- Mobile employee --------------------------------------------------
  { file: "40-samuel-mobile-workflow.png", url: "/admin", viewport: "mobile",
    login: { email: "samuel@samtaxco.app", password: "password1234" } },
];

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
  // Clear and type fresh credentials
  await page.evaluate(() => {
    document.querySelectorAll('input[type="email"], input[type="password"]').forEach(i => i.value = "");
  });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30_000 }).catch(() => {}),
  ]);
}

async function fetchCaseId(reference) {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const p = new PrismaClient({ adapter });
  const c = await p.taxCase.findUnique({ where: { reference } });
  await p.$disconnect();
  if (!c) throw new Error(`Case ${reference} not found`);
  return c.id;
}
async function fetchUserId(email) {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const p = new PrismaClient({ adapter });
  const u = await p.user.findUnique({ where: { email } });
  await p.$disconnect();
  if (!u) throw new Error(`User ${email} not found`);
  return u.id;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox"],
  });

  for (const item of PAGES) {
    console.log(`→ ${item.file}`);
    // Fresh incognito context for every screenshot — no session bleed between
    // roles, and /login can't redirect us away because we have no cookie.
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport(VIEWPORTS[item.viewport]);
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

    if (item.login) {
      await login(page, item.login.email, item.login.password);
    }

    // Resolve URL
    let url = item.url;
    if (!url && item.ref && item.path) {
      const id = await fetchCaseId(item.ref);
      url = item.path.replace("{id}", id);
    } else if (!url && item.userEmail && item.path) {
      const id = await fetchUserId(item.userEmail);
      url = item.path.replace("{id}", id);
    }
    if (url) {
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2" });
    }

    // Settle for animations
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: path.join(OUT_DIR, item.file),
      fullPage: false,
      type: "png",
    });
    await ctx.close();
  }

  await browser.close();
  console.log(`\nDone. ${PAGES.length} screenshots in ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
