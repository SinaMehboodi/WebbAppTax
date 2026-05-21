"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TutorialClient({ steps, title, subtitle, next, prev, skip, finish }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [loading, setLoading] = useState(false);
  const total = steps.length;

  async function complete() {
    setLoading(true);
    await fetch("/api/me/tutorial-seen", { method: "POST" });
    router.replace("/dashboard");
    router.refresh();
  }

  const s = steps[i];

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
        <div>
          <p className="uppercase tracking-widest text-xs text-zinc-500">{title}</p>
          <h1 className="text-2xl font-semibold mt-1">{subtitle}</h1>
        </div>

        <div className="flex gap-2">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 flex-1 rounded-full ${
                idx <= i ? "bg-zinc-900 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            />
          ))}
        </div>

        <div className="min-h-32">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">{s.body}</p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={complete}
            disabled={loading}
            className="text-sm text-zinc-500 hover:underline"
          >
            {skip}
          </button>
          <div className="flex items-center gap-3">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI(i - 1)}
                className="rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm"
              >
                {prev}
              </button>
            )}
            {i < total - 1 ? (
              <button
                type="button"
                onClick={() => setI(i + 1)}
                className="rounded-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 px-4 py-2 text-sm"
              >
                {next} →
              </button>
            ) : (
              <button
                type="button"
                onClick={complete}
                disabled={loading}
                className="rounded-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 px-4 py-2 text-sm disabled:opacity-50"
              >
                {finish}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
