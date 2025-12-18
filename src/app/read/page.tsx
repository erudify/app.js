"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  KeyboardEvent,
  ChangeEvent,
  useCallback,
} from "react";
import Link from "next/link";
import type {
  Exercise,
  StudentProgress,
  ExerciseHistory,
  WordIntervalChange,
} from "@/lib/types";
import {
  selectNextExercise,
  updateWordSuccess,
  updateWordFailure,
  addExerciseToHistory,
  getExerciseWords,
  getPinyinForWord,
} from "@/lib/exercises";
import { processPinyinInput } from "@/lib/pinyin";

const STORAGE_KEY = "erudify-progress";

/**
 * Load student progress from localStorage
 */
function loadProgress(): StudentProgress {
  if (typeof window === "undefined") {
    return { words: {}, history: [], seenExercises: new Set() };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        words: parsed.words || {},
        history: parsed.history || [],
        seenExercises: new Set(parsed.seenExercises || []),
      };
    }
  } catch (error) {
    console.error("Failed to load progress:", error);
  }

  return { words: {}, history: [], seenExercises: new Set() };
}

/**
 * Save student progress to localStorage
 */
function saveProgress(progress: StudentProgress): void {
  if (typeof window === "undefined") return;

  try {
    const toStore = {
      words: progress.words,
      history: progress.history,
      seenExercises: Array.from(progress.seenExercises),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
}

/**
 * Parse YAML exercises (simple parser for our specific format)
 */
function parseExercises(yaml: string): Exercise[] {
  const exercises: Exercise[] = [];
  const lines = yaml.split("\n");

  let currentExercise: Exercise | null = null;
  let currentSegment: { chinese?: string; pinyin?: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "- segments:") {
      // Start new exercise
      if (currentExercise) {
        exercises.push(currentExercise);
      }
      currentExercise = { segments: [], english: "" };
      currentSegment = null;
    } else if (trimmed.startsWith("- chinese:")) {
      // Start new segment
      if (currentSegment && currentSegment.chinese && currentExercise) {
        currentExercise.segments.push({
          chinese: currentSegment.chinese,
          pinyin: currentSegment.pinyin || "",
        });
      }
      currentSegment = { chinese: trimmed.slice(10).trim() };
    } else if (trimmed.startsWith("pinyin:")) {
      // Add pinyin to current segment
      if (currentSegment) {
        currentSegment.pinyin = trimmed.slice(7).trim().replace(/'/g, "");
      }
    } else if (trimmed.startsWith("english:")) {
      // Add English translation
      if (currentSegment && currentSegment.chinese && currentExercise) {
        currentExercise.segments.push({
          chinese: currentSegment.chinese,
          pinyin: currentSegment.pinyin || "",
        });
        currentSegment = null;
      }
      if (currentExercise) {
        currentExercise.english = trimmed.slice(8).trim();
      }
    }
  }

  // Don't forget the last exercise
  if (currentExercise) {
    exercises.push(currentExercise);
  }

  return exercises;
}

/**
 * Normalize pinyin for comparison (lowercase, remove spaces)
 */
function normalizePinyin(pinyin: string): string {
  return pinyin.toLowerCase().replace(/\s+/g, "");
}

/**
 * Format duration in short form (e.g., "1w 2d", "3h 15min", "30sec")
 */
function formatDuration(seconds: number): string {
  const weeks = Math.floor(seconds / (7 * 24 * 60 * 60));
  seconds %= 7 * 24 * 60 * 60;
  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= 24 * 60 * 60;
  const hours = Math.floor(seconds / (60 * 60));
  seconds %= 60 * 60;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds}sec`);

  // Return at most 2 parts
  return parts.slice(0, 2).join(" ") || "0sec";
}

/**
 * Format a date for display
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function ReadPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [progress, setProgress] = useState<StudentProgress>(() => loadProgress());
  const [displayedExerciseIndex, setDisplayedExerciseIndex] = useState<number | null>(null);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintedWordIndices, setHintedWordIndices] = useState<Set<number>>(new Set()); // Track which word indices had hints
  const inputRef = useRef<HTMLInputElement>(null);

  // Load exercises on mount
  useEffect(() => {
    async function loadExercises() {
      try {
        const response = await fetch("/exercises_1.yaml");
        const yamlText = await response.text();

        const parsed = parseExercises(yamlText);
        setExercises(parsed);
      } catch (error) {
        console.error("Failed to load exercises:", error);
      }
    }

    loadExercises();
  }, []);

  // Calculate the next exercise recommendation
  const nextExerciseData = useMemo(() => {
    if (exercises.length === 0) {
      return null;
    }
    return selectNextExercise(exercises, progress);
  }, [exercises, progress]);

  // Set initial exercise when exercises load
  useEffect(() => {
    if (displayedExerciseIndex === null && nextExerciseData) {
      setDisplayedExerciseIndex(nextExerciseData.index);
    }
  }, [displayedExerciseIndex, nextExerciseData]);

  // Get the currently displayed exercise
  const currentExercise = displayedExerciseIndex !== null ? exercises[displayedExerciseIndex] : null;
  const currentIndex = displayedExerciseIndex ?? -1;
  const targetWord = nextExerciseData?.index === displayedExerciseIndex ? nextExerciseData.targetWord : undefined;

  // Save progress whenever it changes
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // Focus input when currentInputIndex changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentInputIndex]);

  // Get segments that need pinyin input (non-empty pinyin)
  const inputSegments = useMemo(() => {
    return currentExercise
      ? currentExercise.segments.filter((seg) => seg.pinyin !== "")
      : [];
  }, [currentExercise]);
  const totalInputs = inputSegments.length;

  // Move to next exercise (pass the updated progress to get correct next exercise)
  const advanceToNextExercise = useCallback((updatedProgress: StudentProgress) => {
    const next = selectNextExercise(exercises, updatedProgress);
    if (next) {
      setDisplayedExerciseIndex(next.index);
    }
    setCurrentInputIndex(0);
    setInputValue("");
    setShowHint(false);
    setHintedWordIndices(new Set());
  }, [exercises]);

  // Check if input matches and advance to next segment
  const checkAndAdvance = useCallback(
    (newValue: string) => {
      const currentSegment = inputSegments[currentInputIndex];
      if (
        currentSegment &&
        normalizePinyin(newValue) === normalizePinyin(currentSegment.pinyin)
      ) {
        // Move to next segment
        if (currentInputIndex < totalInputs - 1) {
          setCurrentInputIndex((prev) => prev + 1);
          setInputValue("");
          setShowHint(false);
        } else {
          // All segments completed - update progress and immediately advance
          if (currentExercise) {
            const completedAt = Date.now(); // Use same timestamp for all words
            let newProgress = progress;
            const words = getExerciseWords(currentExercise);
            const wordChanges: WordIntervalChange[] = [];

            // Update each word based on whether a hint was used for that specific word
            for (let i = 0; i < words.length; i++) {
              const word = words[i];
              const pinyin = getPinyinForWord(currentExercise, word);
              
              if (hintedWordIndices.has(i)) {
                // Hint was used for this word - mark as failure
                const result = updateWordFailure(word, pinyin, newProgress, completedAt);
                newProgress = result.progress;
                wordChanges.push(result.change);
              } else {
                // No hint for this word - mark as success
                const result = updateWordSuccess(word, pinyin, newProgress, completedAt);
                newProgress = result.progress;
                wordChanges.push(result.change);
              }
            }

            // Add to history (success if no hints were used at all)
            newProgress = addExerciseToHistory(
              currentIndex,
              hintedWordIndices.size === 0,
              currentExercise,
              wordChanges,
              newProgress
            );

            setProgress(newProgress);

            // Immediately advance to next exercise with updated progress
            advanceToNextExercise(newProgress);
          }
        }
      }
    },
    [currentInputIndex, inputSegments, totalInputs, currentExercise, progress, hintedWordIndices, currentIndex, advanceToNextExercise]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const key = e.key;

      // Handle Escape key for hints
      if (key === "Escape") {
        e.preventDefault();
        if (!showHint && currentInputIndex < inputSegments.length) {
          setInputValue("");
          setShowHint(true);
          // Track that this specific word index had a hint
          setHintedWordIndices((prev) => new Set(prev).add(currentInputIndex));
        }
        return;
      }

      // Check if it's a tone number (0-4)
      if (/^[0-4]$/.test(key)) {
        e.preventDefault();
        const input = e.currentTarget;
        const selectionStart = input.selectionStart ?? inputValue.length;

        const { newText, newCursorPos } = processPinyinInput(
          inputValue,
          selectionStart,
          parseInt(key, 10)
        );

        setInputValue(newText);
        checkAndAdvance(newText);

        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
      }
    },
    [inputValue, checkAndAdvance, showHint, currentInputIndex, inputSegments]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      checkAndAdvance(newValue);
    },
    [checkAndAdvance]
  );

  /**
   * Get recent history (last 3 exercises)
   */
  function getRecentHistory(): ExerciseHistory[] {
    return progress.history.slice(-3).reverse();
  }

  /**
   * Clear all progress and start from scratch
   */
  const handleClearProgress = useCallback(() => {
    if (confirm("Are you sure you want to clear all progress? This cannot be undone.")) {
      const emptyProgress: StudentProgress = {
        words: {},
        history: [],
        seenExercises: new Set(),
      };
      setProgress(emptyProgress);
      saveProgress(emptyProgress);

      // Use advanceToNextExercise with empty progress to select first exercise
      advanceToNextExercise(emptyProgress);
    }
  }, [advanceToNextExercise]);

  if (!currentExercise) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-zinc-600">Loading exercises...</div>
      </div>
    );
  }

  // Track which segment index we're currently at for rendering
  let inputSegmentIndex = 0;

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <style>{`
        @keyframes historySlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .history-item-animate {
          animation: historySlideIn 0.3s ease-out;
        }
      `}</style>
      {/* Sidebar */}
      <aside className="w-80 overflow-y-auto border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-white">
          Erudify
        </h2>

        <nav className="space-y-2">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Home
          </Link>
          <Link
            href="/read"
            className="block rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950 dark:text-red-400"
          >
            Study
          </Link>
        </nav>

        <div className="mt-8">
          <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Progress
          </h3>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <div>Words: {Object.keys(progress.words).length}</div>
            <div>Exercises: {progress.seenExercises.size}</div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Recent History
          </h3>
          <div className="space-y-3">
            {getRecentHistory().map((item) => (
              <div
                key={item.completedAt}
                className="history-item-animate rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-700"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={item.success ? "text-green-600" : "text-red-600"}>
                    {item.success ? "✓" : "✗"}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {item.chinese}
                  </span>
                </div>
                <div className="mb-1 text-zinc-500 dark:text-zinc-400">
                  {item.pinyin}
                </div>
                <div className="mb-2 text-zinc-600 dark:text-zinc-300">
                  {item.english}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.wordChanges?.map((change, cidx) => {
                    // Determine color: red for failure, gray for early review, green for normal increase
                    let colorClass: string;
                    if (change.wasFailure) {
                      colorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                    } else if (change.wasEarlyReview) {
                      colorClass = "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400";
                    } else {
                      colorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                    }

                    // Show + for increases, nothing for failures/resets
                    const showPlus = !change.wasFailure && (
                      change.oldIntervalSeconds === null ||
                      change.newIntervalSeconds > change.oldIntervalSeconds
                    );

                    return (
                      <span
                        key={cidx}
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${colorClass}`}
                        title={`Next review: ${formatDate(change.nextReview)}`}
                      >
                        <span>{change.word}</span>
                        <span>
                          {showPlus ? "+" : ""}
                          {formatDuration(change.newIntervalSeconds)}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleClearProgress}
            className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            Clear Progress
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          {/* Current exercise */}
          <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
            {targetWord && (
              <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Reviewing: <span className="font-medium">{targetWord}</span>
              </div>
            )}

            {/* Chinese sentence with input fields */}
            <div className="flex flex-wrap items-start gap-2 text-4xl">
              {currentExercise.segments.map((segment, idx) => {
                // Punctuation or empty pinyin
                if (segment.pinyin === "") {
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <span className="text-zinc-900 dark:text-white">
                        {segment.chinese}
                      </span>
                    </div>
                  );
                }

                const segmentInputIndex = inputSegmentIndex;
                inputSegmentIndex++;

                const isCurrentInput = segmentInputIndex === currentInputIndex;
                const isCompleted = segmentInputIndex < currentInputIndex;

                const pinyinWidth = `${segment.pinyin.length * 0.6 + 1}rem`;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-zinc-900 dark:text-white">
                      {segment.chinese}
                    </span>
                    {isCurrentInput ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={showHint ? segment.pinyin : ""}
                        style={{ width: pinyinWidth }}
                        className="rounded border border-red-300 bg-red-50 px-2 py-1 text-center text-base text-zinc-900 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-red-700 dark:bg-red-900/20 dark:text-white dark:placeholder-zinc-400"
                        autoFocus
                      />
                    ) : isCompleted ? (
                      <span 
                        className="inline-block px-2 py-1 text-center text-base text-green-600 dark:text-green-400"
                        style={{ width: pinyinWidth }}
                      >
                        {segment.pinyin}
                      </span>
                    ) : (
                      <span 
                        className="inline-block px-2 py-1 text-center text-base text-zinc-400 dark:text-zinc-600"
                        style={{ width: pinyinWidth }}
                      >
                        ___
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <p className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
              How to study:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Type pinyin followed by a tone number (1-4) for tone marks</li>
              <li>
                Example:{" "}
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">
                  wo3
                </code>{" "}
                becomes wǒ
              </li>
              <li>
                Press{" "}
                <kbd className="rounded bg-zinc-200 px-2 py-1 font-mono dark:bg-zinc-700">
                  Escape
                </kbd>{" "}
                to see a hint (will affect your review schedule)
              </li>
              <li>Use 0 to remove the last tone mark</li>
              <li>v = ü (e.g., lv4 → lǜ)</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
