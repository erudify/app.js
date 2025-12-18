import type { Exercise, StudentProgress, WordIntervalChange } from "./types";

const INITIAL_INTERVAL = 30; // 30 seconds
const INTERVAL_MULTIPLIER = 5;
const EARLY_REVIEW_MULTIPLIER = 1.05; // For words reviewed before their scheduled time

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
  progress: StudentProgress
): { exercise: Exercise; index: number; targetWord?: string } | null {
  const now = Date.now();

  // Find words that need review (nextReview is in the past)
  const wordsNeedingReview = Object.values(progress.words)
    .filter((wp) => wp.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview); // sort by nearest review time

  if (wordsNeedingReview.length > 0) {
    // We have words to review - pick the most urgent one
    const targetWord = wordsNeedingReview[0].word;

    // Filter exercises that contain the target word
    const candidateExercises = exercises
      .map((ex, idx) => ({ exercise: ex, index: idx }))
      .filter(({ exercise }) => exerciseContainsWord(exercise, targetWord));

    if (candidateExercises.length === 0) {
      // This shouldn't happen, but handle it gracefully
      return selectNewExercise(exercises, progress);
    }

    // Score each exercise based on priorities
    const scoredExercises = candidateExercises.map(({ exercise, index }) => {
      let score = 0;

      const newWords = getNewWords(exercise, progress);
      const hasNewWords = newWords.length > 0;
      const exerciseWords = getExerciseWords(exercise);

      // Priority 1: Prefer exercises with no new words (high priority)
      if (!hasNewWords) {
        score += 1000;
      }

      // Priority 2: Prefer exercises with words that have future review dates
      const futureReviewWords = exerciseWords.filter((word) => {
        const wp = progress.words[word];
        return wp && wp.nextReview > now;
      });
      score += futureReviewWords.length * 100;

      // Priority 3: Prefer exercises not seen before
      if (!progress.seenExercises.has(index)) {
        score += 10;
      }

      return { exercise, index, score };
    });

    // Sort by score (highest first)
    scoredExercises.sort((a, b) => b.score - a.score);

    return {
      exercise: scoredExercises[0].exercise,
      index: scoredExercises[0].index,
      targetWord,
    };
  }

  // No words need review - pick a new exercise with new words
  return selectNewExercise(exercises, progress);
}

/**
 * Select a new exercise (one that introduces new words)
 */
function selectNewExercise(
  exercises: Exercise[],
  progress: StudentProgress
): { exercise: Exercise; index: number } | null {
  // Find the first exercise that contains at least one new word
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    const newWords = getNewWords(exercise, progress);

    if (newWords.length > 0) {
      return { exercise, index: i };
    }
  }

  // All exercises have been seen with all words known
  // Just pick the first unseen exercise, or cycle back to the beginning
  for (let i = 0; i < exercises.length; i++) {
    if (!progress.seenExercises.has(i)) {
      return { exercise: exercises[i], index: i };
    }
  }

  // Everything has been seen - start from the beginning
  return exercises.length > 0 ? { exercise: exercises[0], index: 0 } : null;
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

  let newInterval: number;
  let consecutiveSuccesses: number;
  let wasEarlyReview = false;

  if (!existing) {
    // First time seeing this word
    newInterval = INITIAL_INTERVAL;
    consecutiveSuccesses = 1;
  } else if (existing.nextReview > completedAt) {
    // Early review - word was reviewed before its scheduled time
    // Use smaller multiplier (1.05x)
    newInterval = Math.round(existing.intervalSeconds * EARLY_REVIEW_MULTIPLIER);
    consecutiveSuccesses = existing.consecutiveSuccesses + 1;
    wasEarlyReview = true;
  } else {
    // Normal review - word was due or overdue
    // Use full multiplier (5x)
    newInterval = existing.intervalSeconds * INTERVAL_MULTIPLIER;
    consecutiveSuccesses = existing.consecutiveSuccesses + 1;
  }

  const nextReview = completedAt + newInterval * 1000;

  const change: WordIntervalChange = {
    word,
    pinyin,
    oldIntervalSeconds: existing?.intervalSeconds ?? null,
    newIntervalSeconds: newInterval,
    nextReview,
    wasEarlyReview,
    wasFailure: false,
  };

  return {
    progress: {
      ...progress,
      words: {
        ...progress.words,
        [word]: {
          word,
          lastReviewed: completedAt,
          nextReview,
          intervalSeconds: newInterval,
          consecutiveSuccesses,
        },
      },
    },
    change,
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
  const existing = progress.words[word];
  const nextReview = completedAt + INITIAL_INTERVAL * 1000;

  const change: WordIntervalChange = {
    word,
    pinyin,
    oldIntervalSeconds: existing?.intervalSeconds ?? null,
    newIntervalSeconds: INITIAL_INTERVAL,
    nextReview,
    wasEarlyReview: false, // Failures are never considered "early"
    wasFailure: true,
  };

  return {
    progress: {
      ...progress,
      words: {
        ...progress.words,
        [word]: {
          word,
          lastReviewed: completedAt,
          nextReview,
          intervalSeconds: INITIAL_INTERVAL,
          consecutiveSuccesses: 0,
        },
      },
    },
    change,
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
  const newSeenExercises = new Set(progress.seenExercises);
  newSeenExercises.add(exerciseIndex);

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
        completedAt: Date.now(),
        success,
        chinese,
        pinyin,
        english: exercise.english,
        wordChanges,
      },
    ],
    seenExercises: newSeenExercises,
  };
}

/**
 * Get pinyin for a word from exercise segments
 */
export function getPinyinForWord(exercise: Exercise, word: string): string {
  const segment = exercise.segments.find((s) => s.chinese === word);
  return segment?.pinyin ?? "";
}
