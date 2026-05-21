// Wipes ALL application data — users, cases, documents, notifications,
// signatures, sessions, push subscriptions, presentation, everything.
//
// Schema is preserved. After running this you should run `npm run db:seed`
// to recreate Samuel + the default presentation content.
//
// USAGE:
//   npx tsx prisma/reset-data.js              (refuses unless --yes is passed)
//   npx tsx prisma/reset-data.js --yes        (confirmed wipe)
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CONFIRMED = process.argv.includes("--yes");

async function main() {
  console.log("=== SamTaxco — data reset ===");
  console.log("Target DB:", process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "?");
  console.log("");

  // Pre-flight summary
  const before = await summary();
  console.log("Current state:");
  for (const [k, v] of Object.entries(before)) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log("");

  if (!CONFIRMED) {
    console.log("Refusing to delete without --yes flag.");
    console.log("Re-run:  npx tsx prisma/reset-data.js --yes");
    process.exit(0);
  }

  // Order matters: delete leaves of the FK graph first. Each deleteMany on the
  // top-level tables would cascade most of the rest, but being explicit keeps
  // this readable and works even if schema relations are loosened later.
  console.log("Wiping...");
  await prisma.invoiceReminder.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.analysis.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.documentRequest.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.mandate.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.taxCase.deleteMany({});
  await prisma.annualReminder.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.presentationLink.deleteMany({});
  await prisma.presentationSection.deleteMany({});
  await prisma.user.deleteMany({});

  const after = await summary();
  console.log("");
  console.log("After:");
  for (const [k, v] of Object.entries(after)) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log("");
  console.log("Done. Run `npm run db:seed` to recreate Samuel + presentation content.");
}

async function summary() {
  return {
    users: await prisma.user.count(),
    sessions: await prisma.session.count(),
    cases: await prisma.taxCase.count(),
    documents: await prisma.document.count(),
    notifications: await prisma.notification.count(),
    activityLogs: await prisma.activityLog.count(),
    comments: await prisma.comment.count(),
    invoices: await prisma.invoice.count(),
    presentation: await prisma.presentationSection.count(),
    pushSubs: await prisma.pushSubscription.count(),
  };
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
