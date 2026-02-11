import { describe, it, expect, vi, afterEach } from "vitest";
import { selectNextExercise } from "./exercises";
import type { Exercise, StudentProgress } from "./domain";

describe("selectNextExercise", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("iterates to the next overdue word when the first overdue word has no unlocked sentence", () => {
    const now = new Date("2026-02-11T12:00:00.000Z").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const exercises: Exercise[] = [
      {
        // Contains 你 (overdue) but also 好 (also overdue), so locked for reviewing 你.
        segments: [
          { chinese: "你", pinyin: "ni3" },
          { chinese: "好", pinyin: "hao3" },
        ],
        english: "Hello",
      },
      {
        // Contains 学 (overdue target) and only known future words, so unlocked.
        segments: [
          { chinese: "我", pinyin: "wo3" },
          { chinese: "学", pinyin: "xue2" },
        ],
        english: "I study",
      },
    ];

    const progress: StudentProgress = {
      words: {
        你: {
          word: "你",
          lastReviewed: now - 60000,
          nextReview: now - 1000,
          intervalSeconds: 30,
          consecutiveSuccesses: 1,
        },
        好: {
          word: "好",
          lastReviewed: now - 60000,
          nextReview: now - 500,
          intervalSeconds: 30,
          consecutiveSuccesses: 1,
        },
        学: {
          word: "学",
          lastReviewed: now - 60000,
          nextReview: now - 900,
          intervalSeconds: 30,
          consecutiveSuccesses: 1,
        },
        我: {
          word: "我",
          lastReviewed: now - 60000,
          nextReview: now + 3600000,
          intervalSeconds: 3600,
          consecutiveSuccesses: 3,
        },
      },
      history: [],
      exerciseLastSeen: {},
      dailyMetricsHistory: {},
    };

    const result = selectNextExercise(exercises, progress, ["你", "好", "我", "学"]);

    expect(result).not.toBeNull();
    expect(result?.targetWord).toBe("学");
    expect(result?.index).toBe(1);
  });

  it("only considers overdue words that are in the loaded ordered word list", () => {
    const now = new Date("2026-02-11T12:00:00.000Z").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const exercises: Exercise[] = [
      {
        segments: [{ chinese: "X", pinyin: "x" }],
        english: "external word",
      },
      {
        segments: [{ chinese: "你", pinyin: "ni3" }],
        english: "you",
      },
    ];

    const progress: StudentProgress = {
      words: {
        X: {
          word: "X",
          lastReviewed: now - 60000,
          nextReview: now - 2000,
          intervalSeconds: 30,
          consecutiveSuccesses: 1,
        },
        你: {
          word: "你",
          lastReviewed: now - 60000,
          nextReview: now - 1000,
          intervalSeconds: 30,
          consecutiveSuccesses: 1,
        },
      },
      history: [],
      exerciseLastSeen: {},
      dailyMetricsHistory: {},
    };

    const result = selectNextExercise(exercises, progress, ["你"]);

    expect(result).not.toBeNull();
    expect(result?.targetWord).toBe("你");
    expect(result?.index).toBe(1);
  });
});
