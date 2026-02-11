"use client";

import { useMemo } from "react";
import type { WordProgress, ExerciseHistory } from "@/lib/domain";
import type { Exercise } from "@/lib/domain/exercise";
import { formatShortDuration, formatRelativeTime } from "@/lib/formatting";
import { getExerciseWords } from "@/lib/exercises";

interface WordProgressContentProps {
  wordList: string[];
  words: Record<string, WordProgress>;
  history: ExerciseHistory[];
  exercises: Exercise[];
  now: number;
}

interface WordRow {
  index: number;
  word: string;
  progress: WordProgress | null;
  sentencesSeen: number;
  totalSentences: number;
  unlockedSentences: number;
  status: "overdue" | "due-today" | "future" | "unseen";
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getWordStatus(
  progress: WordProgress | null,
  now: number
): "overdue" | "due-today" | "future" | "unseen" {
  if (!progress) return "unseen";
  if (progress.nextReview <= now) return "overdue";
  if (progress.nextReview <= now + ONE_DAY_MS) return "due-today";
  return "future";
}

const STATUS_STYLES: Record<string, string> = {
  overdue: "bg-red-50 dark:bg-red-950/30",
  "due-today": "bg-amber-50 dark:bg-amber-950/30",
  future: "",
  unseen: "bg-zinc-50 dark:bg-zinc-800/30",
};

export function WordProgressContent({
  wordList,
  words,
  history,
  exercises,
  now,
}: WordProgressContentProps) {
  const { wordSentenceCounts, totalSentenceCounts, wordExerciseIndices } = useMemo(() => {
    const wordSeen = new Map<string, Set<number>>();
    const wordTotal = new Map<string, number>();
    const wordExercises = new Map<string, number[]>();

    // Count total sentences per word from exercises
    for (let i = 0; i < exercises.length; i++) {
      const exerciseWords = getExerciseWords(exercises[i]);
      for (const w of exerciseWords) {
        wordTotal.set(w, (wordTotal.get(w) ?? 0) + 1);
        if (!wordExercises.has(w)) wordExercises.set(w, []);
        wordExercises.get(w)!.push(i);
      }
    }

    // Count seen sentences per word from history
    for (const entry of history) {
      for (const change of entry.wordChanges) {
        if (!wordSeen.has(change.word)) {
          wordSeen.set(change.word, new Set());
        }
        wordSeen.get(change.word)!.add(entry.exerciseIndex);
      }
    }

    return {
      wordSentenceCounts: wordSeen,
      totalSentenceCounts: wordTotal,
      wordExerciseIndices: wordExercises,
    };
  }, [exercises, history]);

  const rows: WordRow[] = useMemo(() => {
    return wordList.map((word, idx) => {
      const progress = words[word] ?? null;
      const sentencesSeen = wordSentenceCounts.get(word)?.size ?? 0;
      const totalSentences = totalSentenceCounts.get(word) ?? 0;
      const status = getWordStatus(progress, now);

      // Count unlocked sentences: exercises where all other words have nextReview > now
      const exerciseIndices = wordExerciseIndices.get(word) ?? [];
      let unlockedSentences = 0;
      for (const exIdx of exerciseIndices) {
        const otherWords = getExerciseWords(exercises[exIdx]).filter((w) => w !== word);
        const allOthersKnown = otherWords.every((w) => {
          const wp = words[w];
          return wp != null && wp.nextReview > now;
        });
        if (allOthersKnown) unlockedSentences++;
      }

      return {
        index: idx + 1,
        word,
        progress,
        sentencesSeen,
        totalSentences,
        unlockedSentences,
        status,
      };
    });
  }, [wordList, words, wordSentenceCounts, totalSentenceCounts, wordExerciseIndices, exercises, now]);

  const counts = useMemo(() => {
    const c = { overdue: 0, "due-today": 0, future: 0, unseen: 0 };
    for (const row of rows) c[row.status]++;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-red-200 dark:bg-red-800" />
          Overdue ({counts.overdue})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-amber-200 dark:bg-amber-800" />
          Due today ({counts["due-today"]})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-zinc-300 dark:border-zinc-600" />
          Future ({counts.future})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-zinc-200 dark:bg-zinc-700" />
          Unseen ({counts.unseen})
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="px-2 py-2 w-10">#</th>
              <th className="px-2 py-2">Word</th>
              <th className="px-2 py-2">Last Seen</th>
              <th className="px-2 py-2">Review In</th>
              <th className="px-2 py-2 text-right">Seen</th>
              <th className="px-2 py-2 text-right">Unlocked</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.word}
                className={`border-b border-zinc-100 dark:border-zinc-800 ${STATUS_STYLES[row.status]}`}
              >
                <td className="px-2 py-1.5 tabular-nums text-zinc-400 dark:text-zinc-500">
                  {row.index}
                </td>
                <td className="px-2 py-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                  {row.word}
                </td>
                <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-400">
                  {row.progress
                    ? formatRelativeTime(row.progress.lastReviewed, now)
                    : ""}
                </td>
                <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-400">
                  {row.progress
                    ? row.progress.nextReview <= now
                      ? "now"
                      : formatShortDuration(
                          (row.progress.nextReview - now) / 1000
                        )
                    : ""}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.progress ? row.sentencesSeen : ""}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.progress ? row.unlockedSentences : ""}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.progress ? row.totalSentences : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
