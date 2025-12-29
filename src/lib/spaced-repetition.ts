import type { WordIntervalChange } from "./types";

const MIN_INTERVAL_SECONDS = 30;
const MAX_INTERVAL_SECONDS = 365 * 24 * 60 * 60;
const EARLY_REVIEW_MULTIPLIER = 1.05;
const GOOD_REVIEW_MULTIPLIER = 5;
const FIRST_TIME_SUCCESS_INTERVAL_SECONDS = 7 * 24 * 60 * 60;

export interface SpacedRepetitionConfig {
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  earlyReviewMultiplier: number;
  goodReviewMultiplier: number;
  firstTimeSuccessIntervalSeconds: number;
}

export const DEFAULT_CONFIG: SpacedRepetitionConfig = {
  minIntervalSeconds: MIN_INTERVAL_SECONDS,
  maxIntervalSeconds: MAX_INTERVAL_SECONDS,
  earlyReviewMultiplier: EARLY_REVIEW_MULTIPLIER,
  goodReviewMultiplier: GOOD_REVIEW_MULTIPLIER,
  firstTimeSuccessIntervalSeconds: FIRST_TIME_SUCCESS_INTERVAL_SECONDS,
};

export interface WordState {
  intervalSeconds: number;
  lastReviewed: number;
  consecutiveSuccesses: number;
}

export function clampInterval(
  interval: number,
  config: SpacedRepetitionConfig
): number {
  return Math.max(
    config.minIntervalSeconds,
    Math.min(interval, config.maxIntervalSeconds)
  );
}

export function calculateNewInterval(
  state: WordState | null,
  completedAt: number,
  config: SpacedRepetitionConfig = DEFAULT_CONFIG
): {
  newInterval: number;
  consecutiveSuccesses: number;
  wasEarlyReview: boolean;
} {
  if (!state) {
    return {
      newInterval: config.firstTimeSuccessIntervalSeconds,
      consecutiveSuccesses: 1,
      wasEarlyReview: false,
    };
  }

  const actualElapsedSeconds = (completedAt - state.lastReviewed) / 1000;
  const isEarly = completedAt < state.lastReviewed + state.intervalSeconds * 1000;

  let newInterval: number;

  if (isEarly) {
    newInterval = clampInterval(
      actualElapsedSeconds * config.earlyReviewMultiplier,
      config
    );
  } else {
    newInterval = clampInterval(
      actualElapsedSeconds * config.goodReviewMultiplier,
      config
    );
  }

  return {
    newInterval,
    consecutiveSuccesses: state.consecutiveSuccesses + 1,
    wasEarlyReview: isEarly,
  };
}

export function calculateFailureInterval(
  config: SpacedRepetitionConfig = DEFAULT_CONFIG
): {
  newInterval: number;
  consecutiveSuccesses: number;
} {
  return {
    newInterval: config.minIntervalSeconds,
    consecutiveSuccesses: 0,
  };
}

export function updateWordStateSuccess(
  word: string,
  pinyin: string,
  existingState: WordState | null,
  completedAt: number,
  config: SpacedRepetitionConfig = DEFAULT_CONFIG
): {
  state: WordState;
  change: WordIntervalChange;
} {
  const { newInterval, consecutiveSuccesses, wasEarlyReview } =
    calculateNewInterval(existingState, completedAt, config);

  const state: WordState = {
    intervalSeconds: newInterval,
    lastReviewed: completedAt,
    consecutiveSuccesses,
  };

  const change: WordIntervalChange = {
    word,
    pinyin,
    oldIntervalSeconds: existingState?.intervalSeconds ?? null,
    newIntervalSeconds: newInterval,
    nextReview: completedAt + newInterval * 1000,
    wasEarlyReview,
    wasFailure: false,
  };

  return { state, change };
}

export function updateWordStateFailure(
  word: string,
  pinyin: string,
  completedAt: number,
  config: SpacedRepetitionConfig = DEFAULT_CONFIG
): {
  state: WordState;
  change: WordIntervalChange;
} {
  const { newInterval, consecutiveSuccesses } =
    calculateFailureInterval(config);

  const state: WordState = {
    intervalSeconds: newInterval,
    lastReviewed: completedAt,
    consecutiveSuccesses,
  };

  const change: WordIntervalChange = {
    word,
    pinyin,
    oldIntervalSeconds: null,
    newIntervalSeconds: newInterval,
    nextReview: completedAt + newInterval * 1000,
    wasEarlyReview: false,
    wasFailure: true,
  };

  return { state, change };
}
