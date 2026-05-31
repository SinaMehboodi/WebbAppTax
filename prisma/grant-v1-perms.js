// One-off V1 upgrade helper — additively grants the new capability permissions
// to EXISTING employees so newly-enforced gates don't lock anyone out.
//
//   node prisma/grant-v1-perms.js     (or: npx tsx prisma/grant-v1-perms.js)
//
// Safe + idempotent: it only ADDS permission keys, never removes any. Run once
// after deploying the V1 permission changes. ADMIN / SUPER_ADMIN are unaffected
// (they implicitly hold every permission).
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// case.comment is now an explicit, grantable capability. Before V1 every staff
// member could comment implicitly, so grant it to keep current behaviour.
const ADD = ["case.comment"];

async function main() {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, email: true, permissions: true },
  });
  let changed = 0;
  for (const e of employees) {
    const set = new Set(e.permissions || []);
    let dirty = false;
    for (const p of ADD) {
      if (!set.has(p)) {
        set.add(p);
        dirty = true;
      }
    }
    if (dirty) {
      await prisma.user.update({ where: { id: e.id }, data: { permissions: [...set] } });
      changed++;
      console.log(`  + ${ADD.join(", ")} → ${e.email}`);
    }
  }
  console.log(`Done. ${changed}/${employees.length} employee(s) updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
