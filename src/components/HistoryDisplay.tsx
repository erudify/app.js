"use client";

import type { ExerciseHistory, WordIntervalChange } from "@/lib/domain/progress";
import { formatDuration } from "@/lib/formatting";
import { getWordChangeColor } from "@/lib/history-utils";

interface HistoryDisplayProps {
  history: ExerciseHistory[];
}

export function HistoryDisplay({ history }: HistoryDisplayProps) {
  const recentHistory = history.slice(-3).reverse();

  return (
    <div className="space-y-3">
      {recentHistory.map((item) => (
        <HistoryItem key={item.completedAt} item={item} />
      ))}
    </div>
  );
}

interface HistoryItemProps {
  item: ExerciseHistory;
}

function HistoryItem({ item }: HistoryItemProps) {
  const colorizedChinese = colorizeChineseText(item);

  return (
    <div
      className="history-item-animate rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-700"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={item.success ? "text-green-600" : "text-red-600"}>
          {item.success ? "✓" : "✗"}
        </span>
        <span className="font-medium">{colorizedChinese}</span>
      </div>
      <div className="mb-1 text-zinc-500 dark:text-zinc-400">{item.pinyin}</div>
      <div className="text-zinc-600 dark:text-zinc-300">{item.english}</div>
    </div>
  );
}

function colorizeChineseText(history: ExerciseHistory): React.ReactNode {
  const colorizedChinese: React.ReactNode[] = [];
  let remaining = history.chinese;
  let keyIdx = 0;

  while (remaining.length > 0) {
    let matched = false;

    for (const change of history.wordChanges ?? []) {
      if (remaining.startsWith(change.word)) {
        const colorClass = getWordChangeColor(change);

        colorizedChinese.push(
          <span
            key={keyIdx++}
            className={colorClass}
            title={`Review in ${formatDuration(change.newIntervalSeconds)}`}
          >
            {change.word}
          </span>
        );
        remaining = remaining.slice(change.word.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      colorizedChinese.push(
        <span key={keyIdx++} className="text-zinc-900 dark:text-white">
          {remaining[0]}
        </span>
      );
      remaining = remaining.slice(1);
    }
  }

  return <>{colorizedChinese}</>;
}
