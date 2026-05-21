// POST /api/cases — client uploads a tax notice. Creates a TaxCase (DRAFT)
// and the underlying Document; notifies staff to prepare the contract.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { activeProvider, makeKey, putFile } from "@/lib/storage";
import { generateReference, logActivity, setStatus } from "@/lib/workflow";
import { notifyStaff } from "@/lib/notifications";
import { buildFilename } from "@/lib/filename";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

function fail(message, status = 400) {
  return NextResponse.json({ error: message, message }, { status });
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("You need to be logged in.", 401);

    const form = await request.formData();
    const file = form.get("file");
    const taxType = String(form.get("taxType") || "OTHER");
    const taxYear = parseInt(String(form.get("taxYear") || "0"), 10);
    const propertyName = String(form.get("propertyName") || "").trim();
    const noticeDateRaw = form.get("noticeDate") ? String(form.get("noticeDate")) : null;
    let noticeDate = null;
    if (noticeDateRaw) {
      const d = new Date(noticeDateRaw);
      if (Number.isNaN(d.getTime())) return fail("Invalid notice date.");
      noticeDate = d;
    }

    if (!file || typeof file === "string") return fail("No file received. Please pick a document.");
    if (file.size === 0) return fail("The selected file is empty.");
    if (file.size > MAX_BYTES) return fail(`File too large (max ${MAX_BYTES / 1024 / 1024} MB).`, 413);

    if (!["TF", "CFE", "AUDIT", "OTHER"].includes(taxType)) return fail("Unsupported tax type.");
    const currentYear = new Date().getFullYear();
    if (!taxYear || taxYear < currentYear - 5 || taxYear > currentYear + 1) {
      return fail(`Tax year must be between ${currentYear - 5} and ${currentYear + 1}.`);
    }
    if (!propertyName) return fail("Property name is required.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const reference = await generateReference(taxType, taxYear);
    const friendly = buildFilename({
      user: { firstName: user.firstName, lastName: user.lastName },
      kind: "TAX_NOTICE",
      reference,
      originalName: file.name,
    });
    const key = makeKey({ userId: user.id, scope: "notices", filename: friendly });

    let stored;
    try {
      stored = await putFile({ key, buffer, mimeType: file.type || "application/octet-stream" });
    } catch (storageErr) {
      console.error("[case.create] storage error:", storageErr);
      return fail(`Could not save the file: ${storageErr.message || "storage error"}`, 500);
    }

    const created = await prisma.taxCase.create({
      data: {
        reference,
        ownerId: user.id,
        taxType,
        taxYear,
        noticeDate,
        propertyName,
        status: "DRAFT",
        documents: {
          create: {
            kind: "TAX_NOTICE",
            uploadedById: user.id,
            filename: friendly,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: stored.sizeBytes,
            provider: activeProvider(),
            storageKey: stored.key,
            sha256: stored.sha256,
          },
        },
      },
    });

    await logActivity({
      caseId: created.id,
      actorId: user.id,
      action: "case.created",
      details: { taxType, taxYear, propertyName, filename: friendly },
    });

    await setStatus({ caseId: created.id, status: "CONTRACT_PREPARING", actorId: user.id });

    await notifyStaff({
      titleKey: "admin.newCase",
      bodyKey: "admin.prepareContract",
      link: `/admin/cases/${created.id}`,
      caseId: created.id,
    });

    return NextResponse.json({ ok: true, id: created.id, reference }, { status: 201 });
  } catch (err) {
    console.error("[case.create] error:", err);
    return fail(err?.message || "Unexpected server error. Check the server logs.", 500);
  }
}
