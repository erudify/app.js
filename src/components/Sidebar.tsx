"use client";

import Link from "next/link";
import { PomodoroTimer } from "./PomodoroTimer";
import { HistoryDisplay } from "./HistoryDisplay";
import type { ExerciseHistory } from "@/lib/domain";
import type { PomodoroState } from "./PomodoroTimer";

interface SidebarProps {
  progress: {
    words: Record<string, unknown>;
    history: ExerciseHistory[];
    exerciseLastSeen: Record<number, unknown>;
    dailyMetricsHistory: Record<string, unknown>;
  };
  stats: {
    known: number;
    review: number;
    left: number;
  };
  onClearProgress: () => void;
  onPomodoroStateChange: (state: PomodoroState) => void;
  onOpenMetricsHistory: () => void;
}

export function Sidebar({
  progress,
  stats,
  onClearProgress,
  onPomodoroStateChange,
  onOpenMetricsHistory,
}: SidebarProps) {
  return (
    <aside className="w-80 overflow-y-auto border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-white">
        Erudify
      </h2>

      <nav className="space-y-2">
        <Link
          href="/"
          className="block rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Home
        </Link>
        <Link
          href="/read"
          className="block rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950 dark:text-red-400"
        >
          Study
        </Link>
      </nav>

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Progress
        </h3>
        <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <div>
            <button
              type="button"
              onClick={onOpenMetricsHistory}
              className="flex w-full items-center justify-between rounded px-1 py-0.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span>Known words:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.known}
              </span>
            </button>
          </div>
          <div className="flex justify-between">
            <span>Review words:</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {stats.review}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Words left:</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {stats.left}
            </span>
          </div>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          Exercises: {Object.keys(progress.exerciseLastSeen).length}
        </div>
      </div>

      <PomodoroTimer onStateChange={onPomodoroStateChange} />

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Recent History
        </h3>
        <HistoryDisplay history={progress.history} />
      </div>

      <div className="mt-8">
        <button
          onClick={onClearProgress}
          className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          Clear Progress
        </button>
      </div>
    </aside>
  );
}
