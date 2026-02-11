"use client";

import { useMemo, useState } from "react";
import type { DailyMetricsPoint } from "@/lib/domain";
import { sliceMetricsByRange, type MetricsRange } from "@/lib/progress-metrics";
import { SimpleLineChart } from "@/components/SimpleLineChart";
import { formatCompactNumber } from "@/lib/formatting";

interface MetricsHistoryContentProps {
  history: Record<string, DailyMetricsPoint>;
}

const RANGE_OPTIONS: { value: MetricsRange; label: string }[] = [
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
];

export function MetricsHistoryContent({ history }: MetricsHistoryContentProps) {
  const [range, setRange] = useState<MetricsRange>("1m");
  const [nowTimestamp] = useState<number>(() => Date.now());

  const points = useMemo(
    () => sliceMetricsByRange(history, range, nowTimestamp),
    [history, range, nowTimestamp]
  );

  const knownWordPoints = points.map((point) => ({
    dateKey: point.dateKey,
    value: point.knownWords,
  }));

  const memoryStrengthPoints = points.map((point) => ({
    dateKey: point.dateKey,
    value: point.memoryStrength,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRange(option.value)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              range === option.value
                ? "bg-red-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <SimpleLineChart title="Known Words" points={knownWordPoints} />
      <SimpleLineChart
        title="Memory Strength (seconds)"
        points={memoryStrengthPoints}
        valueFormatter={formatCompactNumber}
      />

      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Backfilled memory strength is estimated from current intervals for words known at each day-end.
      </div>
    </div>
  );
}
