"use client";

import { useState, useEffect, useRef } from "react";

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const BREAK_TIME = 5 * 60; // 5 minutes in seconds

/**
 * A simple, minimalistic Pomodoro timer component
 */
export function PomodoroTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer completed
            setIsRunning(false);
            // Auto-switch between work and break
            if (!isBreak) {
              setIsBreak(true);
              return BREAK_TIME;
            } else {
              setIsBreak(false);
              return WORK_TIME;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isBreak]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(WORK_TIME);
  };

  const handleToggleMode = () => {
    setIsRunning(false);
    setIsBreak(!isBreak);
    setTimeLeft(!isBreak ? BREAK_TIME : WORK_TIME);
  };

  return (
    <div className="mt-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span>Pomodoro Timer</span>
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
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          {/* Timer Display */}
          <div className="text-center">
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
              {isBreak ? "Break Time" : "Focus Time"}
            </div>
            <div className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleStartPause}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Reset
            </button>
          </div>

          {/* Mode Toggle */}
          <button
            onClick={handleToggleMode}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            Switch to {isBreak ? "Focus" : "Break"}
          </button>
        </div>
      )}
    </div>
  );
}
