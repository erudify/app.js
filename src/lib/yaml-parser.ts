import type { Exercise } from "./domain/exercise";

/**
 * Parse YAML exercises (simple parser for our specific format)
 */
export function parseExercises(yaml: string): Exercise[] {
  const exercises: Exercise[] = [];
  const lines = yaml.split("\n");

  let currentExercise: Exercise | null = null;
  let currentSegment: { chinese?: string; pinyin?: string; transliteration?: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- english:")) {
      if (currentExercise) {
        if (currentSegment && currentSegment.chinese) {
          currentExercise.segments.push({
            chinese: currentSegment.chinese,
            pinyin: currentSegment.pinyin || "",
            transliteration: currentSegment.transliteration,
          });
          currentSegment = null;
        }
        exercises.push(currentExercise);
      }
      currentExercise = { segments: [], english: trimmed.slice(10).trim() };
      currentSegment = null;
    } else if (trimmed === "chunks:") {
    } else if (trimmed.startsWith("- chinese:")) {
      if (currentSegment && currentSegment.chinese && currentExercise) {
        currentExercise.segments.push({
          chinese: currentSegment.chinese,
          pinyin: currentSegment.pinyin || "",
          transliteration: currentSegment.transliteration,
        });
      }
      currentSegment = { chinese: trimmed.slice(10).trim() };
    } else if (trimmed.startsWith("pinyin:")) {
      if (currentSegment) {
        let p = trimmed.slice(7).trim().replace(/'/g, "");
        if (/^[.,!?;:，。？！：、]$/.test(p)) {
          p = "";
        }
        currentSegment.pinyin = p;
      }
    } else if (trimmed.startsWith("transliteration:")) {
      if (currentSegment) {
        currentSegment.transliteration = trimmed.slice(16).trim().replace(/'/g, "");
      }
    }
  }

  if (currentExercise && currentSegment && currentSegment.chinese) {
    currentExercise.segments.push({
      chinese: currentSegment.chinese,
      pinyin: currentSegment.pinyin || "",
      transliteration: currentSegment.transliteration,
    });
  }
  if (currentExercise) {
    exercises.push(currentExercise);
  }

  return exercises;
}
