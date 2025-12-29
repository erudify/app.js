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
    it("applies 1.05x multiplier to actual elapsed time", () => {
      const completedAt = 1000000;
      const lastReviewed = 900000;
      const intervalSeconds = 1000;

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      const actualElapsed = (completedAt - lastReviewed) / 1000;
      const expectedInterval = actualElapsed * 1.05;

      expect(result.newInterval).toBe(Math.round(expectedInterval));
      expect(result.wasEarlyReview).toBe(true);
      expect(result.consecutiveSuccesses).toBe(3);
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

    it("respects minimum interval of 30 seconds", () => {
      const completedAt = 1000000;
      const lastReviewed = 999999;
      const intervalSeconds = 60;

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

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
    it("early review gives 5% increase", () => {
      const completedAt = 1000000;
      const lastReviewed = 900000;
      const intervalSeconds = 1000;

      const state = {
        intervalSeconds,
        lastReviewed,
        consecutiveSuccesses: 2,
      };

      const result = calculateNewInterval(state, completedAt, DEFAULT_CONFIG);

      const actualElapsed = (completedAt - lastReviewed) / 1000;
      const expectedIncrease = actualElapsed * 1.05;

      expect(result.wasEarlyReview).toBe(true);
      expect(result.newInterval).toBe(Math.round(expectedIncrease));
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
