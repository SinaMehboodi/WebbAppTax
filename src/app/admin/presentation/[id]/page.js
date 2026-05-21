import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditForm from "./EditForm";

export default async function EditSectionPage({ params }) {
  const { id } = await params;
  const s = await prisma.presentationSection.findUnique({ where: { id } });
  if (!s) notFound();
  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 animate-rise">
      <Link href="/admin/presentation" className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <span aria-hidden>←</span> Retour aux slides
      </Link>
      <header>
        <div className="text-xs uppercase tracking-widest text-[var(--fg-muted)] font-mono">{s.slug}</div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">{s.titleFr}</h1>
      </header>
      <EditForm initial={s} />
    </div>
  );
}
