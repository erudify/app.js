"use client";

import type { WordProgress, ExerciseHistory } from "@/lib/domain";
import type { Exercise } from "@/lib/domain/exercise";
import { WordProgressContent } from "@/components/WordProgressContent";

interface WordProgressModalProps {
  show: boolean;
  onClose: () => void;
  wordList: string[];
  words: Record<string, WordProgress>;
  history: ExerciseHistory[];
  exercises: Exercise[];
  now: number;
}

export function WordProgressModal({
  show,
  onClose,
  wordList,
  words,
  history,
  exercises,
  now,
}: WordProgressModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Word Progress</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <WordProgressContent
            wordList={wordList}
            words={words}
            history={history}
            exercises={exercises}
            now={now}
          />
        </div>

        <div className="flex items-center justify-end border-t border-zinc-200 p-6 dark:border-zinc-800">
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
