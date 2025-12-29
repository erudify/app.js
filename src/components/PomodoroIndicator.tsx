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

  const isBreak = state.isBreak;
  const bgColor = isBreak 
    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
    : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400";
  
  const emoji = isBreak ? "☕" : "🎯";
  const label = isBreak ? "Break" : "Focus";

  return (
    <div className={`mb-4 flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm ${bgColor}`}>
      <span className="text-lg">{emoji}</span>
      <span className="font-medium">
        {label}: {formatMinutes(state.timeLeft)} remaining
      </span>
    </div>
  );
}
