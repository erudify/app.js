"use client";

import { useState, useEffect, useRef } from "react";

const WORK_TIME = 10 * 60; // 10 minutes in seconds
const BREAK_TIME = 5 * 60; // 5 minutes in seconds
const TEST_WORK_TIME = 10; // 10 seconds for testing
const TEST_BREAK_TIME = 5; // 5 seconds for testing
const MAX_SESSIONS = 3; // Three sessions to complete

export interface PomodoroState {
  isRunning: boolean;
  isBreak: boolean;
  timeLeft: number;
}

interface PomodoroTimerProps {
  onStateChange?: (state: PomodoroState) => void;
}

/**
 * A simple, minimalistic Pomodoro timer component
 */
export function PomodoroTimer({ onStateChange }: PomodoroTimerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isBreakRef = useRef(false);
  const completedSessionsRef = useRef(0);
  const testModeRef = useRef(false);
  
  const workTime = testMode ? TEST_WORK_TIME : WORK_TIME;
  const breakTime = testMode ? TEST_BREAK_TIME : BREAK_TIME;

  // Keep ref in sync with state
  useEffect(() => {
    isBreakRef.current = isBreak;
  }, [isBreak]);

  // Keep completedSessions ref in sync
  useEffect(() => {
    completedSessionsRef.current = completedSessions;
  }, [completedSessions]);

  // Keep testMode ref in sync
  useEffect(() => {
    testModeRef.current = testMode;
  }, [testMode]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({ isRunning, isBreak, timeLeft });
  }, [isRunning, isBreak, timeLeft, onStateChange]);

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
          if (prev <= 0) {
            // Timer completed - auto-continue to next phase
            // Auto-switch between work and break
            const wasBreak = isBreakRef.current;
            setIsBreak(!wasBreak);
            
            // If completing a work session (not a break), increment completed sessions
            if (!wasBreak && completedSessionsRef.current < MAX_SESSIONS) {
              setCompletedSessions((count) => count + 1);
            }
            
            // Return the appropriate time for the next mode
            const currentTestMode = testModeRef.current;
            return wasBreak 
              ? (currentTestMode ? TEST_WORK_TIME : WORK_TIME)
              : (currentTestMode ? TEST_BREAK_TIME : BREAK_TIME);
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
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(workTime);
    setCompletedSessions(0);
  };

  const handleToggleMode = () => {
    setIsRunning(false);
    setIsBreak(!isBreak);
    setTimeLeft(!isBreak ? breakTime : workTime);
  };

  const handleTestModeToggle = () => {
    const newTestMode = !testMode;
    setTestMode(newTestMode);
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(newTestMode ? TEST_WORK_TIME : WORK_TIME);
    setCompletedSessions(0);
  };

  return (
    <div className="mt-8">
      <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Pomodoro Timer
      </h3>
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-2">
          <span>Sessions</span>
          <div className="flex gap-1">
            {[...Array(MAX_SESSIONS)].map((_, i) => (
              <div
                key={i}
                className={`h-2.5 w-2.5 rounded-full border ${
                  i < completedSessions
                    ? "border-red-600 bg-red-600 dark:border-red-400 dark:bg-red-400"
                    : "border-zinc-400 bg-transparent dark:border-zinc-500"
                }`}
              />
            ))}
          </div>
        </div>
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

          {/* Test Mode Toggle */}
          <button
            onClick={handleTestModeToggle}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-700"
          >
            {testMode ? "⚡ Test Mode (10s/5s)" : "Test Mode"}
          </button>
        </div>
      )}
    </div>
  );
}
