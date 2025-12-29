import { useState, useEffect } from "react";
import { loadAllData } from "../lib/data-loader";
import type { Exercise } from "../lib/domain/exercise";

export interface UseExercisesReturn {
  exercises: Exercise[];
  wordList: string[];
  loading: boolean;
  error: Error | null;
}

export function useExercises(): UseExercisesReturn {
  const [data, setData] = useState<{ exercises: Exercise[]; wordList: string[] }>({
    exercises: [],
    wordList: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await loadAllData();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load data"));
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { ...data, loading, error };
}
