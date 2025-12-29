"use client";

import type { PomodoroState } from "./PomodoroTimer";

interface PomodoroIndicatorProps {
  state: PomodoroState;
}

/**
 * Format time in minutes (rounded up), with special handling for < 1 minute
 */
function formatMinutes(seconds: number): string {
  if (seconds < 60) {
    return "less than a minute";
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

/**
 * Indicator shown above the exercise when Pomodoro timer is running
 */
export function PomodoroIndicator({ state }: PomodoroIndicatorProps) {
  if (!state.isRunning) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="font-medium">
        {state.isBreak ? "Break" : "Focus"}: {formatMinutes(state.timeLeft)} remaining
      </span>
    </div>
  );
}
