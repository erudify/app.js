"use client";

import type { ScoredExercise } from "@/lib/domain/exercise";

interface DebugModalProps {
  show: boolean;
  onClose: () => void;
  targetWord: string | undefined;
  currentIndex: number;
  candidates: ScoredExercise[];
}

export function DebugModal({
  show,
  onClose,
  targetWord,
  currentIndex,
  candidates,
}: DebugModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {targetWord
              ? `Exercise Selection Debug: ${targetWord}`
              : "Exercise Selection Debug"}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {candidates.map((cand) => (
              <div
                key={cand.index}
                className={`rounded-xl border p-4 ${
                  cand.index === currentIndex
                    ? "border-red-500 bg-red-50/50 dark:border-red-900 dark:bg-red-900/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    Option #{cand.index}{" "}
                    {cand.index === currentIndex && " (Selected)"}
                  </span>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm font-mono font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    Score: {cand.score}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-lg text-zinc-900 dark:text-white">
                    {cand.exercise.segments.map((s) => s.chinese).join("")}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {cand.exercise.english}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(cand.breakdown.wordScores).map(
                    ([word, score]) => (
                      <span
                        key={word}
                        className={`rounded-full px-2 py-0.5 ${
                          score > 0
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {word}: {score}
                      </span>
                    )
                  )}
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Last seen:{" "}
                    {cand.breakdown.lastSeen === 0
                      ? "Never"
                      : new Date(cand.breakdown.lastSeen).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-zinc-200 p-6 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
