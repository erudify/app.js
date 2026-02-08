import { decode } from "cbor-x";
import { decompress } from "fzstd";
import { EXERCISE_FILE, WORD_LIST_FILE } from "./config";
import type { Exercise } from "./domain/exercise";

function toExerciseArray(data: unknown): Exercise[] {
  if (!Array.isArray(data)) {
    throw new Error("Exercise payload is not an array.");
  }

  const exercises: Exercise[] = [];

  for (const item of data) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as {
      english?: unknown;
      segments?: unknown;
    };

    if (typeof record.english !== "string" || !Array.isArray(record.segments)) {
      continue;
    }

    const segments: Exercise["segments"] = [];

    for (const segment of record.segments) {
      if (!segment || typeof segment !== "object") {
        continue;
      }

      const chunk = segment as {
        chinese?: unknown;
        pinyin?: unknown;
        transliteration?: unknown;
      };

      if (typeof chunk.chinese !== "string" || typeof chunk.pinyin !== "string") {
        continue;
      }

      segments.push({
        chinese: chunk.chinese,
        pinyin: chunk.pinyin,
        transliteration:
          typeof chunk.transliteration === "string" ? chunk.transliteration : undefined,
      });
    }

    exercises.push({
      english: record.english,
      segments,
    });
  }

  return exercises;
}

/**
 * Load exercises from CBOR + ZSTD file
 */
export async function loadExercises(): Promise<Exercise[]> {
  const response = await fetch(EXERCISE_FILE);
  if (!response.ok) {
    throw new Error(`Failed to load exercises: ${response.statusText}`);
  }
  const compressed = new Uint8Array(await response.arrayBuffer());
  const decompressed = decompress(compressed);
  const payload = decode(decompressed);
  return toExerciseArray(payload);
}

/**
 * Load word list from text file
 */
export async function loadWordList(): Promise<string[]> {
  const response = await fetch(WORD_LIST_FILE);
  if (!response.ok) {
    throw new Error(`Failed to load word list: ${response.statusText}`);
  }
  const text = await response.text();
  return text
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w !== "" && !w.startsWith("#"));
}

/**
 * Load all data (exercises and word list)
 */
export async function loadAllData(): Promise<{
  exercises: Exercise[];
  wordList: string[];
}> {
  const [exercises, wordList] = await Promise.all([
    loadExercises(),
    loadWordList(),
  ]);
  return { exercises, wordList };
}
