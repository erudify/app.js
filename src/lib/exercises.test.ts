import { describe, expect, it, vi } from "vitest";
import { getExerciseCandidates } from "./exercises";
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
