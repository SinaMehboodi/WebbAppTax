// Seed a single demo client + a few cases in different states so the user
// guide screenshots have realistic content. Idempotent — re-running just
// updates the existing rows.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const pwd = await bcrypt.hash("password1234", 10);
  const samuel = await prisma.user.findUnique({ where: { email: "samuel@samtaxco.app" } });
  const employee1 = await prisma.user.findUnique({ where: { email: "employee1@samtaxco.app" } });

  const client = await prisma.user.upsert({
    where: { email: "marie@example.com" },
    update: {},
    create: {
      email: "marie@example.com",
      password: pwd,
      firstName: "Marie",
      lastName: "Dupont",
      phone: "+33 6 12 34 56 78",
      role: "USER",
      locale: "fr",
      emailVerified: new Date(),
      firstLoginTutorialSeen: true,
      referenceRepId: samuel?.id,
      referralCode: "MARIE001",
    },
  });

  async function ensureCase({ ref, status, propertyName, assignTo = [] }) {
    const c = await prisma.taxCase.upsert({
      where: { reference: ref },
      update: { status, propertyName, managerId: samuel?.id || null },
      create: {
        reference: ref,
        ownerId: client.id,
        taxType: "TF",
        taxYear: 2026,
        status,
        propertyName,
        managerId: samuel?.id || null,
      },
    });
    for (const userId of assignTo) {
      if (!userId) continue;
      await prisma.caseAssignment.upsert({
        where: { caseId_userId: { caseId: c.id, userId } },
        update: {},
        create: { caseId: c.id, userId, assignedBy: samuel?.id },
      });
    }
    return c;
  }

  await ensureCase({
    ref: "TF-2026-0001",
    status: "DRAFT",
    propertyName: "Studio Marseille",
    assignTo: [samuel?.id],
  });
  await ensureCase({
    ref: "TF-2026-0002",
    status: "AWAITING_DOCUMENTS",
    propertyName: "Appartement Lyon",
    assignTo: [samuel?.id, employee1?.id],
  });
  await ensureCase({
    ref: "TF-2026-0003",
    status: "ACTIVE",
    propertyName: "Local commercial Paris",
    assignTo: [employee1?.id],
  });
  await ensureCase({
    ref: "TF-2026-0004",
    status: "PAID",
    propertyName: "Maison Bordeaux",
    assignTo: [samuel?.id],
  });

  console.log("Demo data ready. Login: marie@example.com / password1234");
}
main().catch(console.error).finally(() => prisma.$disconnect());
