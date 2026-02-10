import type {
  DailyMetricsPoint,
  StudentProgress,
  WordProgress,
} from "@/lib/domain";

export type MetricsRange = "1w" | "1m" | "6m" | "1y";

const RANGE_DAYS: Record<MetricsRange, number> = {
  "1w": 7,
  "1m": 30,
  "6m": 183,
  "1y": 365,
};

/**
 * Create a local date key (YYYY-MM-DD) from a timestamp.
 */
export function getLocalDateKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert a local date key (YYYY-MM-DD) to local end-of-day timestamp.
 */
export function getEndOfLocalDayTimestamp(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map((value) => parseInt(value, 10));
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/**
 * Compute daily known-word and memory-strength metrics for a given day-end timestamp.
 */
export function computeDailyMetricsAtDayEnd(
  words: Record<string, WordProgress>,
  dayEndTimestamp: number
): Omit<DailyMetricsPoint, "dateKey"> {
  let knownWords = 0;
  let memoryStrength = 0;

  for (const wordProgress of Object.values(words)) {
    if (wordProgress.nextReview > dayEndTimestamp) {
      knownWords += 1;
      memoryStrength += wordProgress.intervalSeconds;
    }
  }

  return {
    knownWords,
    memoryStrength,
  };
}

/**
 * Fill missing daily snapshots and refresh today's snapshot from current word states.
 */
export function upsertTodayAndFillMissingDays(
  progress: StudentProgress,
  nowMs: number
): StudentProgress {
  const existingHistory = progress.dailyMetricsHistory || {};
  const existingKeys = Object.keys(existingHistory).sort();
  const todayKey = getLocalDateKey(nowMs);

  const nextHistory: Record<string, DailyMetricsPoint> = { ...existingHistory };
  let hasChanges = false;

  const startKey = existingKeys.length === 0
    ? todayKey
    : incrementDateKey(existingKeys[existingKeys.length - 1]);

  let currentKey = startKey;
  while (currentKey <= todayKey) {
    const metrics = computeDailyMetricsAtDayEnd(
      progress.words,
      getEndOfLocalDayTimestamp(currentKey)
    );

    const existing = nextHistory[currentKey];
    if (
      !existing ||
      existing.knownWords !== metrics.knownWords ||
      existing.memoryStrength !== metrics.memoryStrength
    ) {
      nextHistory[currentKey] = {
        dateKey: currentKey,
        knownWords: metrics.knownWords,
        memoryStrength: metrics.memoryStrength,
      };
      hasChanges = true;
    }

    currentKey = incrementDateKey(currentKey);
  }

  const todayMetrics = computeDailyMetricsAtDayEnd(
    progress.words,
    getEndOfLocalDayTimestamp(todayKey)
  );
  const existingToday = nextHistory[todayKey];
  if (
    !existingToday ||
    existingToday.knownWords !== todayMetrics.knownWords ||
    existingToday.memoryStrength !== todayMetrics.memoryStrength
  ) {
    nextHistory[todayKey] = {
      dateKey: todayKey,
      knownWords: todayMetrics.knownWords,
      memoryStrength: todayMetrics.memoryStrength,
    };
    hasChanges = true;
  }

  if (!hasChanges) {
    return progress;
  }

  return {
    ...progress,
    dailyMetricsHistory: nextHistory,
  };
}

/**
 * Return metric snapshots in a fixed date range ending today.
 */
export function sliceMetricsByRange(
  history: Record<string, DailyMetricsPoint>,
  range: MetricsRange,
  nowMs: number
): DailyMetricsPoint[] {
  const totalDays = RANGE_DAYS[range];
  const endDate = new Date(nowMs);
  endDate.setHours(0, 0, 0, 0);

  const points: DailyMetricsPoint[] = [];
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - offset);
    const dateKey = getLocalDateKey(date.getTime());
    const value = history[dateKey];
    if (value) {
      points.push(value);
    }
  }

  return points;
}

function incrementDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map((value) => parseInt(value, 10));
  const nextDate = new Date(year, month - 1, day);
  nextDate.setDate(nextDate.getDate() + 1);
  return getLocalDateKey(nextDate.getTime());
}
