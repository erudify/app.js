import { useMemo } from "react";
import { getExerciseCandidates, selectNextExercise } from "../lib/exercises";
import type { Exercise, StudentProgress, ScoredExercise } from "../lib/domain";

export interface UseExerciseSelectionReturn {
  currentExercise: Exercise | null;
  currentIndex: number;
  targetWord: string | undefined;
  debugCandidates: ScoredExercise[];
}

export function useExerciseSelection(
  exercises: Exercise[],
  progress: StudentProgress,
  wordList: string[],
  displayedIndex: number | null
): UseExerciseSelectionReturn {
  const nextExerciseData = useMemo(() => {
    if (exercises.length === 0) return null;
    return selectNextExercise(exercises, progress, wordList);
  }, [exercises, progress, wordList]);

  const currentIndex = displayedIndex ?? nextExerciseData?.index ?? -1;
  const currentExercise = currentIndex >= 0 && currentIndex < exercises.length ? exercises[currentIndex] : null;
  const targetWord = nextExerciseData?.index === currentIndex ? nextExerciseData.targetWord : undefined;

  const debugCandidates: ScoredExercise[] = useMemo(() => {
    if (!targetWord) return [];
    return getExerciseCandidates(targetWord, exercises, progress, wordList);
  }, [targetWord, exercises, progress, wordList]);

  return { currentExercise, currentIndex, targetWord, debugCandidates };
}
