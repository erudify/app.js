"use client";

import Link from "next/link";
import { useProgress } from "@/hooks/useProgress";
import { MetricsHistoryContent } from "@/components/MetricsHistoryContent";

export default function ReadHistoryPage() {
  const { progress } = useProgress();

  return (
    <main className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Learning History</h1>
          <Link
            href="/read"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Back to study
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <MetricsHistoryContent history={progress.dailyMetricsHistory} />
        </div>
      </div>
    </main>
  );
}
