import { formatDuration } from "./formatting";
import type { WordIntervalChange } from "./domain/progress";

export function getWordChangeColor(change: WordIntervalChange): string {
  if (change.wasFailure) {
    return "text-red-600 dark:text-red-400";
  } else if (change.wasEarlyReview) {
    return "text-zinc-900 dark:text-white";
  } else {
    return "text-green-600 dark:text-green-400";
  }
}
