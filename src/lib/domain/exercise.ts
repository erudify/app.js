export interface ExerciseSegment {
  chinese: string;
  pinyin: string;
  transliteration?: string;
}

export interface Exercise {
  segments: ExerciseSegment[];
  english: string;
}

export interface ScoredExercise {
  exercise: Exercise;
  index: number;
  score: {
    wordsNotInOrderedList: number;
    unknownOrReviewWordCount: number;
    hasBeenSeen: number;
    largestOrderedWordIndex: number;
    chineseCharacterCount: number;
  };
  breakdown: {
    wordStatuses: Record<string, "known" | "review" | "unknown">;
    orderedWordIndices: Record<string, number | null>;
    wordsNotInOrderedList: number;
    unknownOrReviewWordCount: number;
    largestOrderedWordIndex: number;
    chineseCharacterCount: number;
    lastSeen: number;
  };
}
