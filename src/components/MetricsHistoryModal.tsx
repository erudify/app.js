"use client";

import Link from "next/link";
import type { DailyMetricsPoint } from "@/lib/domain";
import { MetricsHistoryContent } from "@/components/MetricsHistoryContent";

interface MetricsHistoryModalProps {
  show: boolean;
  onClose: () => void;
  history: Record<string, DailyMetricsPoint>;
}

export function MetricsHistoryModal({
  show,
  onClose,
  history,
}: MetricsHistoryModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Learning History</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <MetricsHistoryContent history={history} />
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 p-6 dark:border-zinc-800">
          <Link
            href="/read/history"
            className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
          >
            Open full history page
          </Link>
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
