"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function MarkAllReadButton({ label }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/notifications/read-all", { method: "POST" });
          router.refresh();
        })
      }
      className="text-sm underline text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
