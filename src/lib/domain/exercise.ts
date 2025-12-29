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
  score: number;
  breakdown: {
    wordScores: Record<string, number>;
    totalWordScore: number;
    lastSeen: number;
  };
}
