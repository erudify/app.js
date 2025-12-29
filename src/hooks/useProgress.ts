import { useState, useEffect } from "react";
import { loadProgress, saveProgress, clearProgress as clearProgressStorage } from "../lib/storage";
import type { StudentProgress } from "../lib/domain";

export interface UseProgressReturn {
  progress: StudentProgress;
  updateProgress: (update: Partial<StudentProgress> | ((prev: StudentProgress) => StudentProgress)) => void;
  clearProgress: () => void;
}

export function useProgress(): UseProgressReturn {
  const [progress, setProgress] = useState<StudentProgress>(() => loadProgress());

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const updateProgress = (
    update: Partial<StudentProgress> | ((prev: StudentProgress) => StudentProgress)
  ) => {
    setProgress((prev) => {
      const next = typeof update === "function" ? update(prev) : { ...prev, ...update };
      return next;
    });
  };

  const clearProgress = () => {
    clearProgressStorage();
    setProgress(loadProgress());
  };

  return { progress, updateProgress, clearProgress };
}
