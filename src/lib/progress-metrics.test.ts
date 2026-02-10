import { describe, expect, it } from "vitest";
import type { StudentProgress, WordProgress } from "./domain";
import {
  computeDailyMetricsAtDayEnd,
  getEndOfLocalDayTimestamp,
  getLocalDateKey,
  sliceMetricsByRange,
  upsertTodayAndFillMissingDays,
} from "./progress-metrics";

function createProgress(
  words: Record<string, WordProgress>,
  dailyMetricsHistory: StudentProgress["dailyMetricsHistory"] = {}
): StudentProgress {
  return {
    words,
    history: [],
    exerciseLastSeen: {},
    dailyMetricsHistory,
  };
}

describe("progress metrics", () => {
  it("creates local date keys and end-of-day timestamps", () => {
    const timestamp = new Date(2026, 1, 10, 13, 22, 0, 0).getTime();
    const dateKey = getLocalDateKey(timestamp);
    const dayEnd = new Date(getEndOfLocalDayTimestamp(dateKey));

    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dayEnd.getHours()).toBe(23);
    expect(dayEnd.getMinutes()).toBe(59);
    expect(dayEnd.getSeconds()).toBe(59);
    expect(dayEnd.getMilliseconds()).toBe(999);
  });

  it("computes known words and memory strength at day end", () => {
    const dayEnd = new Date(2026, 1, 10, 23, 59, 59, 999).getTime();
    const words: Record<string, WordProgress> = {
      我: {
        word: "我",
        lastReviewed: dayEnd - 20000,
        nextReview: dayEnd + 1000,
        intervalSeconds: 3600,
        consecutiveSuccesses: 2,
      },
      你: {
        word: "你",
        lastReviewed: dayEnd - 20000,
        nextReview: dayEnd,
        intervalSeconds: 1800,
        consecutiveSuccesses: 1,
      },
    };

    const metrics = computeDailyMetricsAtDayEnd(words, dayEnd);

    expect(metrics.knownWords).toBe(1);
    expect(metrics.memoryStrength).toBe(3600);
  });

  it("fills missing days and refreshes today", () => {
    const now = new Date(2026, 1, 10, 12, 0, 0, 0).getTime();
    const twoDaysAgo = getLocalDateKey(new Date(2026, 1, 8, 12, 0, 0, 0).getTime());
    const words: Record<string, WordProgress> = {
      学生: {
        word: "学生",
        lastReviewed: now - 1000,
        nextReview: new Date(2026, 1, 11, 10, 0, 0, 0).getTime(),
        intervalSeconds: 7200,
        consecutiveSuccesses: 3,
      },
    };

    const progress = createProgress(words, {
      [twoDaysAgo]: {
        dateKey: twoDaysAgo,
        knownWords: 0,
        memoryStrength: 0,
      },
    });

    const updated = upsertTodayAndFillMissingDays(progress, now);

    const yesterday = getLocalDateKey(new Date(2026, 1, 9, 12, 0, 0, 0).getTime());
    const today = getLocalDateKey(now);

    expect(updated.dailyMetricsHistory[twoDaysAgo]).toBeDefined();
    expect(updated.dailyMetricsHistory[yesterday]).toBeDefined();
    expect(updated.dailyMetricsHistory[today]).toBeDefined();
    expect(updated.dailyMetricsHistory[today].knownWords).toBe(1);
    expect(updated.dailyMetricsHistory[today].memoryStrength).toBe(7200);
  });

  it("returns original object when no metric changes are needed", () => {
    const now = new Date(2026, 1, 10, 12, 0, 0, 0).getTime();
    const today = getLocalDateKey(now);
    const words: Record<string, WordProgress> = {
      好: {
        word: "好",
        lastReviewed: now - 1000,
        nextReview: new Date(2026, 1, 11, 10, 0, 0, 0).getTime(),
        intervalSeconds: 60,
        consecutiveSuccesses: 1,
      },
    };

    const progress = createProgress(words, {
      [today]: {
        dateKey: today,
        knownWords: 1,
        memoryStrength: 60,
      },
    });

    const updated = upsertTodayAndFillMissingDays(progress, now);
    expect(updated).toBe(progress);
  });

  it("slices history by fixed ranges", () => {
    const now = new Date(2026, 1, 10, 12, 0, 0, 0).getTime();
    const date1 = getLocalDateKey(new Date(2026, 1, 9).getTime());
    const date2 = getLocalDateKey(new Date(2026, 1, 10).getTime());

    const sliced = sliceMetricsByRange(
      {
        [date1]: { dateKey: date1, knownWords: 2, memoryStrength: 20 },
        [date2]: { dateKey: date2, knownWords: 3, memoryStrength: 30 },
      },
      "1w",
      now
    );

    expect(sliced.length).toBe(2);
    expect(sliced[0].dateKey).toBe(date1);
    expect(sliced[1].dateKey).toBe(date2);
  });
});
