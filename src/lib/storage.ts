import { STORAGE_KEY } from "./config";
import type { StudentProgress } from "./domain/progress";

/**
 * Default empty progress
 */
const EMPTY_PROGRESS: StudentProgress = {
  words: {},
  history: [],
  exerciseLastSeen: {},
  dailyMetricsHistory: {},
};

/**
 * Load student progress from localStorage
 */
export function loadProgress(): StudentProgress {
  if (typeof window === "undefined") {
    return { ...EMPTY_PROGRESS };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const exerciseLastSeen = parsed.exerciseLastSeen || {};

      if (parsed.seenExercises) {
        parsed.seenExercises.forEach((idx: number) => {
          if (!exerciseLastSeen[idx]) exerciseLastSeen[idx] = 1;
        });
      }

      return {
        words: parsed.words || {},
        history: parsed.history || [],
        exerciseLastSeen,
        dailyMetricsHistory: parsed.dailyMetricsHistory || {},
      };
    }
  } catch (error) {
    console.error("Failed to load progress:", error);
  }

  return { ...EMPTY_PROGRESS };
}

/**
 * Save student progress to localStorage
 */
export function saveProgress(progress: StudentProgress): void {
  if (typeof window === "undefined") return;

  try {
    const toStore = {
      words: progress.words,
      history: progress.history,
      exerciseLastSeen: progress.exerciseLastSeen,
      dailyMetricsHistory: progress.dailyMetricsHistory,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
}

/**
 * Clear all progress
 */
export function clearProgress(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear progress:", error);
  }
}

/**
 * Get empty progress object
 */
export function getEmptyProgress(): StudentProgress {
  return { ...EMPTY_PROGRESS };
}
