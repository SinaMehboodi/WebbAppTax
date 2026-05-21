// SamTaxco seed: 1 SuperAdmin (developer), 1 Admin (head of department),
// Samuel (EMPLOYEE with admin-level granted perms — manager view + assign
// others), and two basic employees (Employee1, Employee2).
//
// Run with: npm run db:seed   (after `npm run db:reset -- --yes` if you
// want a clean DB first.)
//
// All accounts use password1234. Change them after first login.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PRESENTATION = [
  {
    slug: "tax-basics",
    order: 1,
    titleFr: "Comprendre la Taxe Foncière et la CFE",
    titleEn: "Understanding property tax and CFE",
    contentFr:
      "Éléments clés :\n• Base imposable\n• Valeur locative\n• Taux\n• Variations annuelles\n• Points sensibles",
    contentEn:
      "Key elements:\n• Taxable base\n• Rental value\n• Rate\n• Annual variations\n• Sensitive points",
  },
  {
    slug: "reforms",
    order: 2,
    titleFr: "Impact des réformes et évolutions légales",
    titleEn: "Impact of reforms and legal changes",
    contentFr:
      "Anticipez l'évolution des impôts directs locaux. Notre veille vous met à l'abri des changements imprévus.",
    contentEn:
      "Anticipate changes in local direct taxes. Our monitoring keeps you safe from surprises.",
  },
  {
    slug: "optimization",
    order: 3,
    titleFr: "Possibilités d'optimisation",
    titleEn: "Optimization possibilities",
    contentFr:
      "Interventions possibles :\n• Contestation (réclamation)\n• Mise à jour des bases\n• Audit de conformité",
    contentEn:
      "Possible interventions:\n• Formal claim\n• Update of bases\n• Conformity audit",
  },
  {
    slug: "fees",
    order: 4,
    titleFr: "Modèle d'honoraires",
    titleEn: "Fee model",
    contentFr:
      "Trois modèles selon votre cas :\n• % du gain net (mission classique)\n• Forfait (mission à périmètre fixe)\n• Forfait audit (conseil/diagnostic)",
    contentEn:
      "Three models depending on your case:\n• % of net gain (standard mission)\n• Flat fee (scoped mission)\n• Audit flat fee (advisory)",
  },
];

// Samuel — head of operations. Granted the full workflow plus manager view
// and the right to grant permissions to his employees.
const SAMUEL_PERMS = [
  "case.prepare_contract",
  "case.request_docs",
  "case.analyze",
  "case.decide",
  "case.record_result",
  "case.invoice",
  "case.mark_paid",
  "case.close",
  "case.assign_self",
  "case.assign_others",
  "case.view_all",
  "presentation.edit",
  "presentation.delete",
  "reports.view",
  "reports.export",
  "users.grant_perms",
];

// Default for a new employee — case handling, but no closing, invoicing or
// reassignment.
const EMPLOYEE_DEFAULT_PERMS = [
  "case.prepare_contract",
  "case.request_docs",
  "case.analyze",
  "case.assign_self",
  "reports.view",
];

async function main() {
  const pwd = await bcrypt.hash("password1234", 10);

  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@samtaxco.app" },
    update: { role: "SUPER_ADMIN", active: true },
    create: {
      email: "superadmin@samtaxco.app",
      password: pwd,
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      locale: "fr",
      emailVerified: new Date(),
      firstLoginTutorialSeen: true,
      referralCode: "SUPERAD1",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@samtaxco.app" },
    update: { role: "ADMIN", active: true },
    create: {
      email: "admin@samtaxco.app",
      password: pwd,
      firstName: "Department",
      lastName: "Admin",
      role: "ADMIN",
      locale: "fr",
      emailVerified: new Date(),
      firstLoginTutorialSeen: true,
      referralCode: "ADMIN001",
    },
  });

  const samuel = await prisma.user.upsert({
    where: { email: "samuel@samtaxco.app" },
    update: { role: "EMPLOYEE", active: true, permissions: SAMUEL_PERMS },
    create: {
      email: "samuel@samtaxco.app",
      password: pwd,
      firstName: "Samuel",
      lastName: "Duran",
      role: "EMPLOYEE",
      locale: "fr",
      emailVerified: new Date(),
      firstLoginTutorialSeen: true,
      referralCode: "SAMUEL01",
      permissions: SAMUEL_PERMS,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: "employee1@samtaxco.app" },
    update: { role: "EMPLOYEE", active: true, permissions: EMPLOYEE_DEFAULT_PERMS },
    create: {
      email: "employee1@samtaxco.app",
      password: pwd,
      firstName: "Employee",
      lastName: "One",
      role: "EMPLOYEE",
      locale: "fr",
      emailVerified: new Date(),
      firstLoginTutorialSeen: true,
      referralCode: "EMP00001",
      permissions: EMPLOYEE_DEFAULT_PERMS,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "employee2@samtaxco.app" },
    update: { role: "EMPLOYEE", active: true, permissions: EMPLOYEE_DEFAULT_PERMS },
    create: {
      email: "employee2@samtaxco.app",
      password: pwd,
      firstName: "Employee",
      lastName: "Two",
      role: "EMPLOYEE",
      locale: "fr",
      emailVerified: new Date(),
      firstLoginTutorialSeen: true,
      referralCode: "EMP00002",
      permissions: EMPLOYEE_DEFAULT_PERMS,
    },
  });

  for (const s of PRESENTATION) {
    await prisma.presentationSection.upsert({
      where: { slug: s.slug },
      update: { ...s },
      create: { ...s },
    });
  }

  console.log("Seed complete. All passwords are 'password1234' — change after first login.");
  console.log("");
  console.log("Accounts:");
  console.log("  superadmin@samtaxco.app   SUPER_ADMIN (developer)");
  console.log("  admin@samtaxco.app        ADMIN (head of department)");
  console.log("  samuel@samtaxco.app       EMPLOYEE (manager — sees all cases, can assign team, edits presentation)");
  console.log("  employee1@samtaxco.app    EMPLOYEE (basic perms)");
  console.log("  employee2@samtaxco.app    EMPLOYEE (basic perms)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
