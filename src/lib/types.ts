/**
 * Represents a segment of an exercise (a word or punctuation)
 */
export interface ExerciseSegment {
  chinese: string;
  pinyin: string;
  transliteration?: string;
}

/**
 * Represents a complete exercise with Chinese text, pinyin, and English translation
 */
export interface Exercise {
  segments: ExerciseSegment[];
  english: string;
}

/**
 * Tracks a student's progress for a specific word
 */
export interface WordProgress {
  word: string;
  lastReviewed: number; // timestamp
  nextReview: number; // timestamp
  intervalSeconds: number; // current interval (30, 150, 750, etc.)
  consecutiveSuccesses: number; // count of consecutive successful recalls
}

/**
 * Tracks interval change for a word after review
 */
export interface WordIntervalChange {
  word: string;
  pinyin: string;
  oldIntervalSeconds: number | null; // null if new word
  newIntervalSeconds: number;
  nextReview: number; // timestamp
  wasEarlyReview: boolean; // true if reviewed before scheduled time (1.05x multiplier)
  wasFailure: boolean; // true if this was a failure (hint used)
}

/**
 * Tracks which exercises the student has completed
 */
export interface ExerciseHistory {
  exerciseIndex: number;
  completedAt: number; // timestamp
  success: boolean;
  chinese: string; // Full Chinese sentence
  pinyin: string; // Full pinyin
  english: string; // English translation
  wordChanges: WordIntervalChange[]; // Changes to each word's interval
}

/**
 * Student progress data stored in localStorage
 */
export interface StudentProgress {
  words: Record<string, WordProgress>; // keyed by word
  history: ExerciseHistory[];
  exerciseLastSeen: Record<number, number>; // exercise index -> timestamp
}
