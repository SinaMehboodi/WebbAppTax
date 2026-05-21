import Link from "next/link";
import { getDictionary } from "@/lib/dictionary";

export default async function NotFound() {
  const { locale } = await getDictionary();
  const fr = locale === "fr";
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-hero">
      <div className="max-w-md w-full card p-8 text-center space-y-4 animate-rise">
        <div
          className="mx-auto h-14 w-14 rounded-2xl text-white text-2xl flex items-center justify-center shadow-brand"
          style={{ background: "var(--brand-gradient)" }}
          aria-hidden
        >
          ?
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {fr ? "Page introuvable" : "Page not found"}
        </h1>
        <p className="text-[var(--fg-muted)]">
          {fr
            ? "Cette adresse n'existe pas ou le contenu a été déplacé."
            : "This address does not exist or the content has been moved."}
        </p>
        <div className="pt-2 flex gap-3 justify-center flex-wrap">
          <Link href="/" className="btn-brand rounded-full px-5 py-2.5 text-sm font-medium">
            {fr ? "Retour à l'accueil" : "Back to home"}
          </Link>
          <Link href="/dashboard" className="btn-soft rounded-full px-5 py-2.5 text-sm font-medium">
            {fr ? "Mon espace" : "My account"}
          </Link>
        </div>
      </div>
    </div>
  );
}
