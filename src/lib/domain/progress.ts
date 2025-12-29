import type { Exercise } from "./exercise";

export interface WordProgress {
  word: string;
  lastReviewed: number;
  nextReview: number;
  intervalSeconds: number;
  consecutiveSuccesses: number;
}

export interface WordIntervalChange {
  word: string;
  pinyin: string;
  oldIntervalSeconds: number | null;
  newIntervalSeconds: number;
  nextReview: number;
  wasEarlyReview: boolean;
  wasFailure: boolean;
}

export interface ExerciseHistory {
  exerciseIndex: number;
  completedAt: number;
  success: boolean;
  chinese: string;
  pinyin: string;
  english: string;
  wordChanges: WordIntervalChange[];
}

export interface StudentProgress {
  words: Record<string, WordProgress>;
  history: ExerciseHistory[];
  exerciseLastSeen: Record<number, number>;
}
