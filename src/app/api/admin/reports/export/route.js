// CSV export of the reports query. Same filters as /admin/reports.
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { can, PERMS } from "@/lib/permissions";

function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function escCsv(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request) {
  const me = await getCurrentUser();
  if (!me || !can(me, PERMS.REPORTS_EXPORT)) {
    return new Response("forbidden", { status: 403 });
  }
  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams);

  const f = {
    start: parseDate(sp.start),
    end:   parseDate(sp.end),
    dateField: ["createdAt", "noticeDate", "resultAt"].includes(sp.dateField) ? sp.dateField : "createdAt",
    status: typeof sp.status === "string" && sp.status ? sp.status.split(",").filter(Boolean) : [],
    taxType: typeof sp.taxType === "string" && sp.taxType ? sp.taxType.split(",").filter(Boolean) : [],
    managerId: typeof sp.managerId === "string" && sp.managerId ? sp.managerId : null,
    q: typeof sp.q === "string" ? sp.q.trim() : "",
    archived: sp.archived === "1" ? true : sp.archived === "0" ? false : null,
    minSavings: sp.minSavings ? Number(sp.minSavings) : null,
    maxSavings: sp.maxSavings ? Number(sp.maxSavings) : null,
  };

  const where = {};
  if (f.start || f.end) {
    where[f.dateField] = {};
    if (f.start) where[f.dateField].gte = f.start;
    if (f.end)   where[f.dateField].lte = new Date(f.end.getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  if (f.status.length) where.status = { in: f.status };
  if (f.taxType.length) where.taxType = { in: f.taxType };
  if (f.managerId) where.managerId = f.managerId;
  if (f.archived !== null) where.archived = f.archived;
  if (f.minSavings != null || f.maxSavings != null) {
    where.estimatedSavings = {};
    if (f.minSavings != null) where.estimatedSavings.gte = f.minSavings;
    if (f.maxSavings != null) where.estimatedSavings.lte = f.maxSavings;
  }
  if (f.q) {
    where.OR = [
      { reference:    { contains: f.q, mode: "insensitive" } },
      { propertyName: { contains: f.q, mode: "insensitive" } },
      { propertyCity: { contains: f.q, mode: "insensitive" } },
      { owner: { email:     { contains: f.q, mode: "insensitive" } } },
      { owner: { firstName: { contains: f.q, mode: "insensitive" } } },
      { owner: { lastName:  { contains: f.q, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.taxCase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      owner:   { select: { firstName: true, lastName: true, email: true } },
      manager: { select: { firstName: true, lastName: true } },
      invoice: { select: { number: true, amountHT: true, amountTTC: true, status: true } },
    },
  });

  const header = [
    "reference", "taxType", "taxYear", "status",
    "clientFirstName", "clientLastName", "clientEmail",
    "managerName", "propertyName", "propertyCity",
    "estimatedSavings", "feeModel", "feePercent",
    "invoiceNumber", "invoiceAmountHT", "invoiceAmountTTC", "invoiceStatus",
    "createdAt", "noticeDate", "resultAt",
  ];

  const lines = [header.join(",")];
  for (const c of rows) {
    lines.push(
      [
        c.reference, c.taxType, c.taxYear, c.status,
        c.owner?.firstName, c.owner?.lastName, c.owner?.email,
        c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : "",
        c.propertyName, c.propertyCity,
        c.estimatedSavings != null ? Number(c.estimatedSavings) : "",
        c.feeModel, c.feePercent != null ? Number(c.feePercent) : "",
        c.invoice?.number || "",
        c.invoice ? Number(c.invoice.amountHT) : "",
        c.invoice ? Number(c.invoice.amountTTC) : "",
        c.invoice?.status || "",
        c.createdAt?.toISOString() || "",
        c.noticeDate?.toISOString() || "",
        c.resultAt?.toISOString() || "",
      ].map(escCsv).join(",")
    );
  }
  const body = "﻿" + lines.join("\n"); // BOM so Excel detects UTF-8

  const filename = `samtaxco-report-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
