import { afterEach, describe, expect, it, vi } from "vitest";
import { getExerciseCandidates, selectNextExercise } from "./exercises";
import type { Exercise, StudentProgress } from "./domain";

function makeExercise(words: string[]): Exercise {
  return {
    segments: words.map((word) => ({ chinese: word, pinyin: "x" })),
    english: words.join(" "),
  };
}

function makeProgress(
  words: StudentProgress["words"],
  exerciseLastSeen: StudentProgress["exerciseLastSeen"] = {}
): StudentProgress {
  return {
    words,
    history: [],
    exerciseLastSeen,
    dailyMetricsHistory: {},
  };
}

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

describe("getExerciseCandidates", () => {
  it("prioritizes words close to the ordered list over longer advanced sentences", () => {
    const exercises: Exercise[] = [
      makeExercise(["你们", "什么时候", "到", "的"]),
      makeExercise(["我", "的"]),
    ];
    const progress = makeProgress({});
    const orderedWordList = ["的", "我", "你们", "什么时候", "到"];

    const candidates = getExerciseCandidates("的", exercises, progress, orderedWordList);

    expect(candidates[0].index).toBe(1);
    expect(candidates[0].score).toEqual({
      wordsNotInOrderedList: 0,
      unknownOrReviewWordCount: 2,
      largestOrderedWordIndex: 1,
      chineseCharacterCount: 2,
    });
  });

  it("treats known future-review words as free for score calculation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-11T00:00:00.000Z"));
    const future = Date.now() + 60_000;

    const exercises: Exercise[] = [
      makeExercise(["你", "的"]),
      makeExercise(["我", "的"]),
    ];
    const progress = makeProgress({
      你: {
        word: "你",
        lastReviewed: Date.now(),
        nextReview: future,
        intervalSeconds: 60,
        consecutiveSuccesses: 1,
      },
    });
    const orderedWordList = ["的", "我"];

    const candidates = getExerciseCandidates("的", exercises, progress, orderedWordList);

    expect(candidates[0].index).toBe(0);
    expect(candidates[0].score.wordsNotInOrderedList).toBe(0);
    expect(candidates[0].score.unknownOrReviewWordCount).toBe(1);

    vi.useRealTimers();
  });

  it("uses chinese character count as tie-breaker after the first three score levels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-11T00:00:00.000Z"));
    const future = Date.now() + 60_000;

    const exercises: Exercise[] = [
      makeExercise(["的"]),
      makeExercise(["的", "你们"]),
    ];
    const progress = makeProgress({
      你们: {
        word: "你们",
        lastReviewed: Date.now(),
        nextReview: future,
        intervalSeconds: 60,
        consecutiveSuccesses: 1,
      },
    });
    const orderedWordList = ["的"];

    const candidates = getExerciseCandidates("的", exercises, progress, orderedWordList);

    expect(candidates[0].index).toBe(0);
    expect(candidates[0].score).toEqual({
      wordsNotInOrderedList: 0,
      unknownOrReviewWordCount: 1,
      largestOrderedWordIndex: 0,
      chineseCharacterCount: 1,
    });

    vi.useRealTimers();
  });
});
