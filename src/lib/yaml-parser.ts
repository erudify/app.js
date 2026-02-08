import type { Exercise } from "./domain/exercise";

/**
 * Parse YAML exercises (simple parser for our specific format)
 */
export function parseExercises(yaml: string): Exercise[] {
  const exercises: Exercise[] = [];
  const lines = yaml.split("\n");

  let currentExercise: { english?: string; segments: Exercise["segments"] } | null = null;
  let currentSegment: { chinese?: string; pinyin?: string; transliteration?: string } | null = null;
  let inChunks = false;

  const normalizeValue = (value: string): string => value.trim().replace(/^['"]|['"]$/g, "");

  const finalizeSegment = (): void => {
    if (!currentExercise || !currentSegment || !currentSegment.chinese) {
      return;
    }

    currentExercise.segments.push({
      chinese: currentSegment.chinese,
      pinyin: currentSegment.pinyin || "",
      transliteration: currentSegment.transliteration,
    });
    currentSegment = null;
  };

  const finalizeExercise = (): void => {
    if (!currentExercise) {
      return;
    }

    finalizeSegment();

    if (currentExercise.english) {
      exercises.push({
        english: currentExercise.english,
        segments: currentExercise.segments,
      });
    }

    currentExercise = null;
    inChunks = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;

    if (trimmed === "" || trimmed === "---") {
      continue;
    }

    if (indent === 0 && trimmed.startsWith("- ")) {
      finalizeExercise();
      currentExercise = { segments: [] };
      currentSegment = null;
      inChunks = false;

      if (trimmed.startsWith("- english:")) {
        currentExercise.english = normalizeValue(trimmed.slice(10));
      }
      continue;
    }

    if (!currentExercise) {
      continue;
    }

    if (indent === 2 && trimmed === "chunks:") {
      inChunks = true;
      continue;
    }

    if (indent === 2 && trimmed.startsWith("english:")) {
      currentExercise.english = normalizeValue(trimmed.slice(8));
      continue;
    }

    if (!inChunks) {
      continue;
    }

    if (indent === 2 && trimmed.startsWith("- chinese:")) {
      finalizeSegment();
      currentSegment = { chinese: normalizeValue(trimmed.slice(10)) };
      continue;
    }

    if (!currentSegment) {
      continue;
    }

    if (indent === 4 && trimmed.startsWith("pinyin:")) {
      let pinyin = normalizeValue(trimmed.slice(7));
      if (/^[.,!?;:，。？！：、]$/.test(pinyin)) {
        pinyin = "";
      }
      currentSegment.pinyin = pinyin;
      continue;
    }

    if (indent === 4 && trimmed.startsWith("transliteration:")) {
      currentSegment.transliteration = normalizeValue(trimmed.slice(16));
    }
  }

  finalizeExercise();

  return exercises;
}
