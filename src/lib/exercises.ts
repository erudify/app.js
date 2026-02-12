import type {
  Exercise,
  ScoredExercise,
  StudentProgress,
  WordIntervalChange,
} from "./domain";
import {
  updateWordStateSuccess,
  updateWordStateFailure,
  type WordState,
} from "./spaced-repetition";

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
  const allowedWords = new Set(orderedWordList);

  // Find words that need review (nextReview is in the past), limited to
  // the loaded ordered word list when it is provided.
  const wordsNeedingReview = Object.values(progress.words)
    .filter((wp) => {
      if (wp.nextReview > now) return false;
      if (allowedWords.size === 0) return true;
      return allowedWords.has(wp.word);
    })
    .sort((a, b) => a.nextReview - b.nextReview); // sort by nearest review time

  for (const reviewWord of wordsNeedingReview) {
    const targetWord = reviewWord.word;

    // A review sentence is unlocked only when all other words are already known
    // (present in progress and not currently due).
    const scoredExercises = getExerciseCandidates(
      targetWord,
      exercises,
      progress,
      orderedWordList
    ).filter(({ exercise }) => {
      const otherWords = getExerciseWords(exercise).filter((w) => w !== targetWord);
      return otherWords.every((w) => {
        const wp = progress.words[w];
        return wp != null && wp.nextReview > now;
      });
    });

    if (scoredExercises.length > 0) {
      return {
        exercise: scoredExercises[0].exercise,
        index: scoredExercises[0].index,
        targetWord,
      };
    }
  }

  // No teachable review words - pick the next word in the HSK list that isn't mastered
  return selectNewExercise(exercises, progress, orderedWordList);
}

export function getExerciseCandidates(
  word: string,
  exercises: Exercise[],
  progress: StudentProgress,
  orderedWordList: string[] = []
): ScoredExercise[] {
  const now = Date.now();
  const orderedWordIndex = new Map<string, number>(
    orderedWordList.map((orderedWord, index) => [orderedWord, index])
  );

  const candidateExercises = exercises
    .map((ex, idx) => ({ exercise: ex, index: idx }))
    .filter(({ exercise }) => exerciseContainsWord(exercise, word));

  const scored = candidateExercises.map(({ exercise, index }) => {
    const exerciseWords = getExerciseWords(exercise);
    const wordStatuses: Record<string, "known" | "review" | "unknown"> = {};
    const orderedWordIndices: Record<string, number | null> = {};
    let wordsNotInOrderedList = 0;
    let unknownOrReviewWordCount = 0;
    let largestOrderedWordIndex = -1;

    for (const w of exerciseWords) {
      const wp = progress.words[w];
      const isKnownWord = Boolean(wp && wp.nextReview > now);
      const wordListIndex = orderedWordIndex.get(w);

      if (isKnownWord) {
        wordStatuses[w] = "known";
        orderedWordIndices[w] = wordListIndex ?? null;
        continue;
      }

      if (!wp) {
        wordStatuses[w] = "unknown";
      } else {
        wordStatuses[w] = "review";
      }

      orderedWordIndices[w] = wordListIndex ?? null;
      unknownOrReviewWordCount += 1;

      if (wordListIndex === undefined) {
        wordsNotInOrderedList += 1;
      } else {
        largestOrderedWordIndex = Math.max(largestOrderedWordIndex, wordListIndex);
      }
    }

    const sentence = exercise.segments.map((seg) => seg.chinese).join("");
    const chineseCharacterCount =
      sentence.match(/\p{Script=Han}/gu)?.length ?? 0;
    const lastSeen = progress.exerciseLastSeen[index] || 0;
    const hasBeenSeen = lastSeen > 0 ? 1 : 0;

    return {
      exercise,
      index,
      score: {
        wordsNotInOrderedList,
        unknownOrReviewWordCount,
        hasBeenSeen,
        largestOrderedWordIndex,
        chineseCharacterCount,
      },
      breakdown: {
        wordStatuses,
        orderedWordIndices,
        wordsNotInOrderedList,
        unknownOrReviewWordCount,
        largestOrderedWordIndex,
        chineseCharacterCount,
        lastSeen,
      },
    };
  });

  // Sort by readability for beginners using a lexicographic score tuple.
  return scored.sort((a, b) => {
    if (a.score.wordsNotInOrderedList !== b.score.wordsNotInOrderedList) {
      return a.score.wordsNotInOrderedList - b.score.wordsNotInOrderedList;
    }

    if (a.score.unknownOrReviewWordCount !== b.score.unknownOrReviewWordCount) {
      return a.score.unknownOrReviewWordCount - b.score.unknownOrReviewWordCount;
    }

    if (a.score.hasBeenSeen !== b.score.hasBeenSeen) {
      return a.score.hasBeenSeen - b.score.hasBeenSeen;
    }

    if (a.score.largestOrderedWordIndex !== b.score.largestOrderedWordIndex) {
      return a.score.largestOrderedWordIndex - b.score.largestOrderedWordIndex;
    }

    if (a.score.chineseCharacterCount !== b.score.chineseCharacterCount) {
      return a.score.chineseCharacterCount - b.score.chineseCharacterCount;
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
        const candidates = getExerciseCandidates(
          word,
          exercises,
          progress,
          orderedWordList
        );

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
      const candidates = getExerciseCandidates(
        newWords[0],
        exercises,
        progress,
        orderedWordList
      );
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
