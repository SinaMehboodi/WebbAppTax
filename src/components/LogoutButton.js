"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LogoutButton({ label }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/");
          router.refresh();
        })
      }
      className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline disabled:opacity-50"
    >
      {label}
    </button>
  );
}
