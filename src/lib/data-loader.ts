import { parseExercises } from "./yaml-parser";
import { EXERCISE_FILE, WORD_LIST_FILE } from "./config";
import type { Exercise } from "./domain/exercise";

/**
 * Load exercises from YAML file
 */
export async function loadExercises(): Promise<Exercise[]> {
  const response = await fetch(EXERCISE_FILE);
  if (!response.ok) {
    throw new Error(`Failed to load exercises: ${response.statusText}`);
  }
  const yamlText = await response.text();
  return parseExercises(yamlText);
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
