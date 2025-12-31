import { describe, it, expect } from "vitest";
import {
  clampInterval,
  calculateNewInterval,
  calculateFailureInterval,
  updateWordStateSuccess,
  updateWordStateFailure,
  DEFAULT_CONFIG,
} from "./spaced-repetition";

describe("spaced-repetition", () => {
  describe("clampInterval", () => {
    it("enforces minimum interval of 30 seconds", () => {
      expect(clampInterval(10, DEFAULT_CONFIG)).toBe(30);
      expect(clampInterval(30, DEFAULT_CONFIG)).toBe(30);
      expect(clampInterval(31, DEFAULT_CONFIG)).toBe(31);
    });

    it("enforces maximum interval of 1 year", () => {
      const max = 365 * 24 * 60 * 60;
      expect(clampInterval(max + 1, DEFAULT_CONFIG)).toBe(max);
      expect(clampInterval(max, DEFAULT_CONFIG)).toBe(max);
      expect(clampInterval(max - 1, DEFAULT_CONFIG)).toBe(max - 1);
    });
  });

  describe("calculateNewInterval - first time success", () => {
    it("sets interval to 1 week for first-time success", () => {
      const completedAt = 1000000;
      const result = calculateNewInterval(null, completedAt, DEFAULT_CONFIG);

      expect(result.newInterval).toBe(7 * 24 * 60 * 60);
      expect(result.consecutiveSuccesses).toBe(1);
      expect(result.wasEarlyReview).toBe(false);
    });
  });

  describe("calculateNewInterval - early review", () => {
    it("applies 1.05x multiplier when calculated interval exceeds current interval", () => {
      // Setup: interval is 100 seconds, we review after 200 seconds (early since 200 < 100*1000ms)
      // Wait, that's not early. Let's fix: interval is 1000 seconds, we review after 960 seconds
      // 960 * 1.05 = 1008, which exceeds 1000, so we should get 1008
      const lastReviewed = 0;
      const intervalSeconds = 1000;
      const completedAt = 960 * 1000; // 960 seconds later (early, since < 1000 seconds)

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      const actualElapsed = completedAt / 1000; // 960 seconds
      const calculatedInterval = actualElapsed * 1.05; // 1008

      expect(result.wasEarlyReview).toBe(true);
      expect(result.newInterval).toBe(Math.round(calculatedInterval)); // 1008 > 1000, so use 1008
      expect(result.consecutiveSuccesses).toBe(3);
    });

    it("preserves current interval when calculated interval is smaller", () => {
      // Setup: interval is 1000 seconds, but only 100 seconds elapsed
      // 100 * 1.05 = 105, which is less than 1000, so keep 1000
      const lastReviewed = 0;
      const intervalSeconds = 1000;
      const completedAt = 100 * 1000; // Only 100 seconds later

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      expect(result.wasEarlyReview).toBe(true);
      expect(result.newInterval).toBe(intervalSeconds); // Keep current interval
      expect(result.consecutiveSuccesses).toBe(3);
    });

    it("never decreases interval on early review (regression test)", () => {
      // Scenario: word answered correctly first time gets 1 week interval,
      // then appears again in follow-up exercise 5 seconds later.
      // The interval should NOT reset to 30 seconds.
      const firstReviewTime = 1000000;
      const oneWeekInSeconds = 7 * 24 * 60 * 60;

      const state = {
        intervalSeconds: oneWeekInSeconds,
        lastReviewed: firstReviewTime,
        consecutiveSuccesses: 1,
      };

      // Word appears again 5 seconds later in a follow-up exercise
      const secondReviewTime = firstReviewTime + 5000;
      const result = calculateNewInterval(state, secondReviewTime, DEFAULT_CONFIG);

      expect(result.wasEarlyReview).toBe(true);
      // The interval should remain at 1 week, not drop to 30 seconds
      expect(result.newInterval).toBe(oneWeekInSeconds);
      expect(result.consecutiveSuccesses).toBe(2);
    });
  });

  describe("calculateNewInterval - good review", () => {
    it("applies 5x multiplier to actual elapsed time", () => {
      const completedAt = 1000000;
      const lastReviewed = 900000;
      const intervalSeconds = 100;

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      const actualElapsed = (completedAt - lastReviewed) / 1000;
      const expectedInterval = actualElapsed * 5;

      expect(result.newInterval).toBe(Math.round(expectedInterval));
      expect(result.wasEarlyReview).toBe(false);
      expect(result.consecutiveSuccesses).toBe(3);
    });

    it("uses actual elapsed time, not scheduled interval", () => {
      const lastReviewed = 0;
      const intervalSeconds = 3600;

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const completedAt = lastReviewed + intervalSeconds * 2000;

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      const actualElapsed = (completedAt - lastReviewed) / 1000;
      const expectedInterval = actualElapsed * 5;

      expect(result.wasEarlyReview).toBe(false);
      expect(result.newInterval).toBe(Math.round(expectedInterval));
    });

    it("respects minimum interval of 30 seconds for good review", () => {
      // Very short elapsed time on a good review (not early) should clamp to 30
      const lastReviewed = 0;
      const intervalSeconds = 1; // 1 second interval
      const completedAt = 2000; // 2 seconds later (past the 1 second interval, so not early)

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      // 2 seconds * 5 = 10 seconds, clamped to minimum 30
      expect(result.wasEarlyReview).toBe(false);
      expect(result.newInterval).toBe(30);
    });

    it("respects maximum interval of 1 year", () => {
      const completedAt = 100000000000;
      const lastReviewed = 50000000000;
      const intervalSeconds = 86400;

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 10,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      expect(result.newInterval).toBe(365 * 24 * 60 * 60);
    });
  });

  describe("calculateFailureInterval", () => {
    it("resets to minimum interval", () => {
      const result = calculateFailureInterval(DEFAULT_CONFIG);

      expect(result.newInterval).toBe(30);
      expect(result.consecutiveSuccesses).toBe(0);
    });
  });

  describe("updateWordStateSuccess", () => {
    it("creates new state for first-time success", () => {
      const completedAt = 1000000;
      const result = updateWordStateSuccess(
        "test",
        "test",
        null,
        completedAt,
        DEFAULT_CONFIG
      );

      expect(result.state.intervalSeconds).toBe(7 * 24 * 60 * 60);
      expect(result.state.lastReviewed).toBe(completedAt);
      expect(result.state.consecutiveSuccesses).toBe(1);

      expect(result.change.word).toBe("test");
      expect(result.change.pinyin).toBe("test");
      expect(result.change.oldIntervalSeconds).toBe(null);
      expect(result.change.newIntervalSeconds).toBe(7 * 24 * 60 * 60);
      expect(result.change.wasEarlyReview).toBe(false);
      expect(result.change.wasFailure).toBe(false);
    });

    it("updates existing state with early review", () => {
      const completedAt = 1000000;
      const lastReviewed = 900000;
      const intervalSeconds = 1000;

      const existing = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = updateWordStateSuccess(
        "test",
        "test",
        existing,
        completedAt,
        DEFAULT_CONFIG
      );

      expect(result.state.consecutiveSuccesses).toBe(3);
      expect(result.change.wasEarlyReview).toBe(true);
      expect(result.change.wasFailure).toBe(false);
    });
  });

  describe("updateWordStateFailure", () => {
    it("resets word state on failure", () => {
      const completedAt = 1000000;
      const result = updateWordStateFailure(
        "test",
        "test",
        completedAt,
        DEFAULT_CONFIG
      );

      expect(result.state.intervalSeconds).toBe(30);
      expect(result.state.lastReviewed).toBe(completedAt);
      expect(result.state.consecutiveSuccesses).toBe(0);

      expect(result.change.word).toBe("test");
      expect(result.change.pinyin).toBe("test");
      expect(result.change.oldIntervalSeconds).toBe(null);
      expect(result.change.newIntervalSeconds).toBe(30);
      expect(result.change.wasEarlyReview).toBe(false);
      expect(result.change.wasFailure).toBe(true);
    });
  });

  describe("integration test: review behavior", () => {
    it("early review preserves interval when elapsed time is short", () => {
      const completedAt = 1000000;
      const lastReviewed = 900000;
      const intervalSeconds = 1000; // Current interval is 1000 seconds

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      // 100 seconds elapsed * 1.05 = 105, but current interval is 1000
      // So we keep 1000
      expect(result.wasEarlyReview).toBe(true);
      expect(result.newInterval).toBe(intervalSeconds);
    });

    it("early review increases interval when elapsed time * multiplier exceeds current", () => {
      const lastReviewed = 0;
      const intervalSeconds = 100; // Short interval
      const completedAt = 99 * 1000; // 99 seconds (just before the 100 second mark)

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      // 99 * 1.05 = 103.95, which exceeds 100, so use 103.95
      expect(result.wasEarlyReview).toBe(true);
      expect(result.newInterval).toBe(99 * 1.05);
    });

    it("good review gives 5x increase", () => {
      const completedAt = 1000000;
      const lastReviewed = 900000;
      const intervalSeconds = 100;

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      const actualElapsed = (completedAt - lastReviewed) / 1000;
      const expectedIncrease = actualElapsed * 5;

      expect(result.wasEarlyReview).toBe(false);
      expect(result.newInterval).toBe(Math.round(expectedIncrease));
    });

    it("overdue review (reviewed after 2 hours instead of 1)", () => {
      const lastReviewed = 0;
      const completedAt = 7200000;
      const intervalSeconds = 3600;

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      const actualElapsed = (completedAt - lastReviewed) / 1000;
      const expectedIncrease = actualElapsed * 5;

      expect(result.newInterval).toBe(Math.round(expectedIncrease));
      expect(result.wasEarlyReview).toBe(false);
    });
  });
});
