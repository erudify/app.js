import type { Exercise, StudentProgress, WordIntervalChange } from "./types";

export interface ScoredExercise {
  exercise: Exercise;
  index: number;
  score: number;
  breakdown: {
    hasNewWords: boolean;
    futureReviewWordsCount: number;
    isUnseen: boolean;
  };
}

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

/**
 * Get all candidate exercises for a word, ranked by score
 */
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
    let score = 0;

    const newWords = getNewWords(exercise, progress);
    const hasNewWords = newWords.length > 0;
    const exerciseWords = getExerciseWords(exercise);

    // Score calculations
    if (!hasNewWords) score += 1000;

    const futureReviewWordsCount = exerciseWords.filter((w) => {
      const wp = progress.words[w];
      return wp && wp.nextReview > now;
    }).length;
    score += futureReviewWordsCount * 100;

    const isUnseen = !progress.seenExercises.has(index);
    if (isUnseen) score += 10;

    return {
      exercise,
      index,
      score,
      breakdown: {
        hasNewWords,
        futureReviewWordsCount,
        isUnseen,
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score);
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
        const candidates = exercises
          .map((ex, idx) => ({ exercise: ex, index: idx }))
          .filter(({ exercise }) => exerciseContainsWord(exercise, word));

        if (candidates.length > 0) {
          // Just pick the first candidate for now
          // We could score these as well, but first unseen is usually fine
          const firstUnseen = candidates.find(c => !progress.seenExercises.has(c.index));
          const result = firstUnseen || candidates[0];
          return { ...result, targetWord: word };
        }
      }
    }
  }

  // Fallback to old logic if no word list or all words in list are started
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    const newWords = getNewWords(exercise, progress);

    if (newWords.length > 0) {
      return { exercise, index: i, targetWord: newWords[0] };
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
