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
  getExerciseCandidates,
  ScoredExercise,
} from "@/lib/exercises";
import { processPinyinInput } from "@/lib/pinyin";

const STORAGE_KEY = "erudify-progress";

/**
 * Load student progress from localStorage
 */
function loadProgress(): StudentProgress {
  if (typeof window === "undefined") {
    return { words: {}, history: [], exerciseLastSeen: {} };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: Convert seenExercises Set array to exerciseLastSeen map
      const exerciseLastSeen = parsed.exerciseLastSeen || {};
      if (parsed.seenExercises) {
        parsed.seenExercises.forEach((idx: number) => {
          if (!exerciseLastSeen[idx]) exerciseLastSeen[idx] = 1; // Default old seen entries
        });
      }

      return {
        words: parsed.words || {},
        history: parsed.history || [],
        exerciseLastSeen: exerciseLastSeen,
      };
    }
  } catch (error) {
    console.error("Failed to load progress:", error);
  }

  return { words: {}, history: [], exerciseLastSeen: {} };
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
      exerciseLastSeen: progress.exerciseLastSeen,
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
  let currentSegment: { chinese?: string; pinyin?: string; transliteration?: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- english:")) {
      // Start new exercise
      if (currentExercise) {
        // Add the last segment of the previous exercise if it exists
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
      // Just a marker
    } else if (trimmed.startsWith("- chinese:")) {
      // Start new segment
      if (currentSegment && currentSegment.chinese && currentExercise) {
        currentExercise.segments.push({
          chinese: currentSegment.chinese,
          pinyin: currentSegment.pinyin || "",
          transliteration: currentSegment.transliteration,
        });
      }
      currentSegment = { chinese: trimmed.slice(10).trim() };
    } else if (trimmed.startsWith("pinyin:")) {
      // Add pinyin to current segment
      if (currentSegment) {
        let p = trimmed.slice(7).trim().replace(/'/g, "");
        // If it's punctuation, set to empty string to avoid requiring input for it
        if (/^[.,!?;:，。？！：、]$/.test(p)) {
          p = "";
        }
        currentSegment.pinyin = p;
      }
    } else if (trimmed.startsWith("transliteration:")) {
      // Add transliteration to current segment
      if (currentSegment) {
        currentSegment.transliteration = trimmed.slice(16).trim().replace(/'/g, "");
      }
    }
  }

  // Add the last segment and exercise
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
  const [orderedWordList, setOrderedWordList] = useState<string[]>([]);
  const [progress, setProgress] = useState<StudentProgress>(() => loadProgress());
  const [displayedExerciseIndex, setDisplayedExerciseIndex] = useState<number | null>(null);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintedWordIndices, setHintedWordIndices] = useState<Set<number>>(new Set()); // Track which word indices had hints
  const [showDebug, setShowDebug] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load exercises and word list on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [exRes, wordRes] = await Promise.all([
          fetch("/HSK-1.yml"),
          fetch("/HSK 1.txt")
        ]);

        const yamlText = await exRes.text();
        const wordText = await wordRes.text();

        const parsedEx = parseExercises(yamlText);
        const parsedWords = wordText.split("\n").map(w => w.trim()).filter(w => w !== "" && !w.startsWith("#"));

        setExercises(parsedEx);
        setOrderedWordList(parsedWords);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    }

    loadData();
  }, []);

  // Calculate progress stats
  const stats = useMemo(() => {
    const now = Date.now();
    const wordEntries = Object.values(progress.words);

    const knownCount = wordEntries.filter((w) => w.nextReview > now).length;
    const reviewCount = wordEntries.filter((w) => w.nextReview <= now).length;

    // Words left in course:
    // We need to know which words in orderedWordList are NOT in progress.words
    const progressWordsSet = new Set(Object.keys(progress.words));
    const leftCount = orderedWordList.filter((word) => !progressWordsSet.has(word)).length;

    return {
      known: knownCount,
      review: reviewCount,
      left: leftCount,
    };
  }, [progress, orderedWordList]);

  // Calculate the next exercise recommendation
  const nextExerciseData = useMemo(() => {
    if (exercises.length === 0) {
      return null;
    }
    return selectNextExercise(exercises, progress, orderedWordList);
  }, [exercises, progress, orderedWordList]);

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

  // Calculate debug candidates if targetWord is present
  const debugCandidates = useMemo(() => {
    if (!targetWord || !showDebug) return [];
    return getExerciseCandidates(targetWord, exercises, progress);
  }, [targetWord, showDebug, exercises, progress]);

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
    const next = selectNextExercise(exercises, updatedProgress, orderedWordList);
    if (next) {
      setDisplayedExerciseIndex(next.index);
    }
    setCurrentInputIndex(0);
    setInputValue("");
    setShowHint(false);
    setHintedWordIndices(new Set());
  }, [exercises, orderedWordList]);

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
        exerciseLastSeen: {},
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
          <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Known words:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.known}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Review words:</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {stats.review}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Words left:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.left}
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Exercises: {Object.keys(progress.exerciseLastSeen).length}
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
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Reviewing: <span className="font-medium">{targetWord}</span>
                </div>
                <button
                  onClick={() => setShowDebug(true)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  title="Debug exercise selection"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m8 2 1.88 1.88" />
                    <path d="M14.12 3.88 16 2" />
                    <path d="M9 7.13v-1a3.003 3.003 0 0 1 6 0v1" />
                    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
                    <path d="M12 20v-9" />
                    <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
                    <path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4" />
                    <path d="M8.5 13h7" />
                  </svg>
                </button>
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

      {/* Debug Modal */}
      {showDebug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                Exercise Selection Debug: {targetWord}
              </h3>
              <button
                onClick={() => setShowDebug(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {debugCandidates.map((cand) => (
                  <div
                    key={cand.index}
                    className={`rounded-xl border p-4 ${cand.index === currentIndex
                      ? "border-red-500 bg-red-50/50 dark:border-red-900 dark:bg-red-900/20"
                      : "border-zinc-200 dark:border-zinc-800"
                      }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        Option #{cand.index} {cand.index === currentIndex && " (Selected)"}
                      </span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm font-mono font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Score: {cand.score}
                      </span>
                    </div>
                    <div className="mb-3">
                      <div className="text-lg text-zinc-900 dark:text-white">{cand.exercise.segments.map(s => s.chinese).join("")}</div>
                      <div className="text-sm text-zinc-500">{cand.exercise.english}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Object.entries(cand.breakdown.wordScores).map(([word, score]) => (
                        <span key={word} className={`rounded-full px-2 py-0.5 ${score > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                          {word}: {score}
                        </span>
                      ))}
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Last seen: {cand.breakdown.lastSeen === 0 ? "Never" : new Date(cand.breakdown.lastSeen).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-zinc-200 p-6 dark:border-zinc-800">
              <button
                onClick={() => setShowDebug(false)}
                className="w-full rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
