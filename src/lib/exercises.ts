import type { Exercise, StudentProgress, WordIntervalChange } from "./types";
import {
  updateWordStateSuccess,
  updateWordStateFailure,
  type WordState,
} from "./spaced-repetition";

export interface ScoredExercise {
  exercise: Exercise;
  index: number;
  score: number;
  breakdown: {
    wordScores: Record<string, number>;
    totalWordScore: number;
    lastSeen: number;
  };
}

/**
 * Get all words from an exercise (excluding punctuation - segments without pinyin)
 */
export function getExerciseWords(exercise: Exercise): string[] {
  return exercise.segments
    .filter((seg) => seg.pinyin !== "")
    .map((seg) => seg.chinese);
}

/**
 * Check if an exercise contains a specific word
 */
export function exerciseContainsWord(exercise: Exercise, word: string): boolean {
  return getExerciseWords(exercise).includes(word);
}

/**
 * Get words from an exercise that the student hasn't seen before
 */
export function getNewWords(
  exercise: Exercise,
  progress: StudentProgress
): string[] {
  return getExerciseWords(exercise).filter((word) => !progress.words[word]);
}

/**
 * Select the next exercise for the student based on spaced repetition algorithm
 */
export function selectNextExercise(
  exercises: Exercise[],
  progress: StudentProgress,
  orderedWordList: string[] = []
): { exercise: Exercise; index: number; targetWord?: string } | null {
  const now = Date.now();

  // Find words that need review (nextReview is in the past)
  const wordsNeedingReview = Object.values(progress.words)
    .filter((wp) => wp.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview); // sort by nearest review time

  if (wordsNeedingReview.length > 0) {
    // We have words to review - pick the most urgent one
    const targetWord = wordsNeedingReview[0].word;

    // Use the new helper to score candidates
    const scoredExercises = getExerciseCandidates(targetWord, exercises, progress);

    if (scoredExercises.length === 0) {
      // This word is in progress but no exercises contain it?
      // Fall back to new words or next in list
      return selectNewExercise(exercises, progress, orderedWordList);
    }

    return {
      exercise: scoredExercises[0].exercise,
      index: scoredExercises[0].index,
      targetWord,
    };
  }

  // No words need review - pick the next word in the HSK list that isn't mastered
  return selectNewExercise(exercises, progress, orderedWordList);
}

export function getExerciseCandidates(
  word: string,
  exercises: Exercise[],
  progress: StudentProgress
): ScoredExercise[] {
  const now = Date.now();

  const candidateExercises = exercises
    .map((ex, idx) => ({ exercise: ex, index: idx }))
    .filter(({ exercise }) => exerciseContainsWord(exercise, word));

  const scored = candidateExercises.map(({ exercise, index }) => {
    const exerciseWords = getExerciseWords(exercise);
    const wordScores: Record<string, number> = {};
    let totalWordScore = 0;

    for (const w of exerciseWords) {
      const wp = progress.words[w];
      let wordScore = 0;
      if (!wp) {
        // New word: high score to avoid introducing too many at once
        wordScore = 5;
      } else if (wp.nextReview <= now) {
        // Due for review: treating as safe context (0 score)
        wordScore = 0;
      }
      wordScores[w] = wordScore;
      totalWordScore += wordScore;
    }

    const lastSeen = progress.exerciseLastSeen[index] || 0;

    return {
      exercise,
      index,
      score: totalWordScore,
      breakdown: {
        wordScores,
        totalWordScore,
        lastSeen,
      },
    };
  });

  // Sort by word score (lowest first), then by last seen date (oldest/never first)
  return scored.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return a.breakdown.lastSeen - b.breakdown.lastSeen;
  });
}


/**
 * Select a new exercise (one that introduces new words)
 */
function selectNewExercise(
  exercises: Exercise[],
  progress: StudentProgress,
  orderedWordList: string[]
): { exercise: Exercise; index: number; targetWord?: string } | null {
  // If we have an ordered word list, pick the first word that isn't in progress
  if (orderedWordList.length > 0) {
    for (const word of orderedWordList) {
      if (!progress.words[word]) {
        // Find an exercise that contains this word
        const candidates = getExerciseCandidates(word, exercises, progress);

        if (candidates.length > 0) {
          return {
            exercise: candidates[0].exercise,
            index: candidates[0].index,
            targetWord: word
          };
        }
      }
    }
  }

  // Fallback to old logic if no word list or all words in list are started
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    const newWords = getNewWords(exercise, progress);

    if (newWords.length > 0) {
      // Re-score using the new logic to find the best candidate for this new word
      const candidates = getExerciseCandidates(newWords[0], exercises, progress);
      if (candidates.length > 0) {
        return {
          exercise: candidates[0].exercise,
          index: candidates[0].index,
          targetWord: newWords[0]
        };
      }
    }
  }

  // Everything has been seen - start from the beginning or pick earliest review
  if (exercises.length === 0) return null;
  return { exercise: exercises[0], index: 0 };
}

/**
 * Update word progress after a successful recall
 * Returns new progress and the interval change info
 * @param completedAt - timestamp when the exercise was completed (used for all words)
 */
export function updateWordSuccess(
  word: string,
  pinyin: string,
  progress: StudentProgress,
  completedAt: number
): { progress: StudentProgress; change: WordIntervalChange } {
  const existing = progress.words[word];
  const existingState: WordState | null = existing
    ? {
        intervalSeconds: existing.intervalSeconds,
        lastReviewed: existing.lastReviewed,
        consecutiveSuccesses: existing.consecutiveSuccesses,
      }
    : null;

  const { state: newState, change } = updateWordStateSuccess(
    word,
    pinyin,
    existingState,
    completedAt
  );

  const nextReview = completedAt + newState.intervalSeconds * 1000;
  const updatedChange = { ...change, nextReview };

  return {
    progress: {
      ...progress,
      words: {
        ...progress.words,
        [word]: {
          word,
          lastReviewed: newState.lastReviewed,
          nextReview,
          intervalSeconds: newState.intervalSeconds,
          consecutiveSuccesses: newState.consecutiveSuccesses,
        },
      },
    },
    change: updatedChange,
  };
}

/**
 * Update word progress after a failed recall
 * Returns new progress and the interval change info
 * @param completedAt - timestamp when the exercise was completed (used for all words)
 */
export function updateWordFailure(
  word: string,
  pinyin: string,
  progress: StudentProgress,
  completedAt: number
): { progress: StudentProgress; change: WordIntervalChange } {
  const { state: newState, change } = updateWordStateFailure(
    word,
    pinyin,
    completedAt
  );

  const nextReview = completedAt + newState.intervalSeconds * 1000;
  const updatedChange = { ...change, nextReview };

  return {
    progress: {
      ...progress,
      words: {
        ...progress.words,
        [word]: {
          word,
          lastReviewed: newState.lastReviewed,
          nextReview,
          intervalSeconds: newState.intervalSeconds,
          consecutiveSuccesses: newState.consecutiveSuccesses,
        },
      },
    },
    change: updatedChange,
  };
}

/**
 * Mark an exercise as completed
 */
export function addExerciseToHistory(
  exerciseIndex: number,
  success: boolean,
  exercise: Exercise,
  wordChanges: WordIntervalChange[],
  progress: StudentProgress
): StudentProgress {
  const newLastSeen = { ...progress.exerciseLastSeen };
  const completedAt = Date.now();
  newLastSeen[exerciseIndex] = completedAt;

  const chinese = exercise.segments.map((s) => s.chinese).join("");
  const pinyin = exercise.segments
    .map((s) => s.pinyin)
    .filter((p) => p)
    .join(" ");

  return {
    ...progress,
    history: [
      ...progress.history,
      {
        exerciseIndex,
        completedAt,
        success,
        chinese,
        pinyin,
        english: exercise.english,
        wordChanges,
      },
    ],
    exerciseLastSeen: newLastSeen,
  };
}

/**
 * Get pinyin for a word from exercise segments
 */
export function getPinyinForWord(exercise: Exercise, word: string): string {
  const segment = exercise.segments.find((s) => s.chinese === word);
  return segment?.pinyin ?? "";
}
