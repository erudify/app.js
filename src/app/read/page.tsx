"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useProgress } from "@/hooks/useProgress";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseSelection } from "@/hooks/useExerciseSelection";
import { useExerciseInput } from "@/hooks/useExerciseInput";
import {
  updateWordSuccess,
  updateWordFailure,
  addExerciseToHistory,
  getExerciseWords,
  getPinyinForWord,
  selectNextExercise,
} from "@/lib/exercises";
import { PomodoroIndicator } from "@/components/PomodoroIndicator";
import { Sidebar } from "@/components/Sidebar";
import { ExerciseDisplay } from "@/components/ExerciseDisplay";
import { InstructionsPanel } from "@/components/InstructionsPanel";
import { DebugModal } from "@/components/DebugModal";
import { MetricsHistoryModal } from "@/components/MetricsHistoryModal";
import { WordProgressModal } from "@/components/WordProgressModal";
import { upsertTodayAndFillMissingDays } from "@/lib/progress-metrics";
import type { PomodoroState } from "@/components/PomodoroTimer";

export default function ReadPage() {
  const { progress, updateProgress, clearProgress } = useProgress();
  const { exercises, wordList, loading, error } = useExercises();
  const [displayedExerciseIndex, setDisplayedExerciseIndex] = useState<number | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showMetricsHistory, setShowMetricsHistory] = useState(false);
  const [showWordProgress, setShowWordProgress] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>({
    isRunning: false,
    isBreak: false,
    timeLeft: 0,
  });
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  const { currentExercise, currentIndex, targetWord, debugCandidates } = useExerciseSelection(
    exercises,
    progress,
    wordList,
    displayedExerciseIndex
  );

  useEffect(() => {
    if (displayedExerciseIndex === null && currentExercise) {
      setDisplayedExerciseIndex(currentIndex);
    }
  }, [displayedExerciseIndex, currentExercise, currentIndex]);

  const stats = useMemo(() => {
    const wordEntries = Object.values(progress.words);

    const knownCount = wordEntries.filter((w) => w.nextReview > currentTime).length;
    const reviewCount = wordEntries.filter((w) => w.nextReview <= currentTime).length;

    const progressWordsSet = new Set(Object.keys(progress.words));
    const leftCount = wordList.filter((word) => !progressWordsSet.has(word)).length;

    const futureReviews = wordEntries
      .map((w) => w.nextReview)
      .filter((t) => t > currentTime);
    const nextReviewTime = futureReviews.length > 0 ? Math.min(...futureReviews) : null;

    return {
      known: knownCount,
      review: reviewCount,
      left: leftCount,
      nextReviewTime,
    };
  }, [progress, wordList, currentTime]);

  useEffect(() => {
    if (stats.nextReviewTime === null) return;

    const timeUntilNextReview = stats.nextReviewTime - currentTime;
    if (timeUntilNextReview <= 0) {
      setCurrentTime(Date.now());
      return;
    }

    const delay = Math.min(timeUntilNextReview, 60000);
    const timer = setTimeout(() => {
      setCurrentTime(Date.now());
    }, delay);

    return () => clearTimeout(timer);
  }, [stats.nextReviewTime, currentTime]);

  useEffect(() => {
    updateProgress((prev) => upsertTodayAndFillMissingDays(prev, Date.now()));
  }, [progress.words, updateProgress]);

  const advanceToNextExercise = useCallback(
    (updatedProgress = progress) => {
      const next = selectNextExercise(exercises, updatedProgress, wordList);
      if (next) {
        setDisplayedExerciseIndex(next.index);
      }
      setShowCompletion(false);
    },
    [exercises, progress, wordList]
  );

  const {
    inputValue,
    setInputValue,
    currentInputIndex,
    showHint,
    hintedWordIndices,
    inputRef,
    handleKeyDown,
    handleChange,
    reset,
    state: exerciseInputState,
  } = useExerciseInput({
    segments: currentExercise?.segments ?? [],
    onSegmentComplete: () => {},
    onComplete: (hints) => handleExerciseCompletion(hints),
  });

  const handleExerciseCompletion = useCallback(
    (hintsUsed: Set<number>) => {
      if (!currentExercise) return;

      const completedAt = Date.now();
      let newProgress = progress;
      const words = getExerciseWords(currentExercise);
      const wordChanges: import("@/lib/domain").WordIntervalChange[] = [];

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const pinyin = getPinyinForWord(currentExercise, word);

        if (hintsUsed.has(i)) {
          const result = updateWordFailure(word, pinyin, newProgress, completedAt);
          newProgress = result.progress;
          wordChanges.push(result.change);
        } else {
          const result = updateWordSuccess(word, pinyin, newProgress, completedAt);
          newProgress = result.progress;
          wordChanges.push(result.change);
        }
      }

      newProgress = addExerciseToHistory(
        currentIndex,
        hintsUsed.size === 0,
        currentExercise,
        wordChanges,
        newProgress
      );

      updateProgress(newProgress);
      setInputValue("");
      setShowCompletion(true);
    },
    [currentExercise, progress, currentIndex, updateProgress, setInputValue]
  );

  const handleContinue = useCallback(() => {
    setShowCompletion(false);
    reset();
    advanceToNextExercise();
  }, [advanceToNextExercise, reset]);

  const handleClearProgress = useCallback(() => {
    if (confirm("Are you sure you want to clear all progress? This cannot be undone.")) {
      clearProgress();
      advanceToNextExercise();
    }
  }, [clearProgress, advanceToNextExercise]);

  useEffect(() => {
    if (showCompletion) {
      continueButtonRef.current?.focus();
    }
  }, [showCompletion]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-zinc-600">Loading exercises...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-zinc-600">No exercises available.</div>
      </div>
    );
  }

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

      <Sidebar
        progress={progress}
        stats={stats}
        onClearProgress={handleClearProgress}
        onPomodoroStateChange={setPomodoroState}
        onOpenMetricsHistory={() => setShowMetricsHistory(true)}
        onOpenWordProgress={() => setShowWordProgress(true)}
      />

      <main className="flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          <PomodoroIndicator state={pomodoroState} />

          <div className="relative mb-8 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
            <div className="absolute right-4 top-4">
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

            {showCompletion ? (
              <div>
                <ExerciseDisplay
                  exercise={currentExercise}
                  isComplete={true}
                  currentInputIndex={0}
                  inputValue=""
                  showHint={false}
                  hintedWordIndices={new Set()}
                  inputRef={inputRef}
                  onInputChange={() => {}}
                  onInputKeyDown={() => {}}
                />
                <div className="flex justify-end mt-6">
                  <button
                    ref={continueButtonRef}
                    type="button"
                    onClick={handleContinue}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <ExerciseDisplay
                exercise={currentExercise}
                isComplete={false}
                currentInputIndex={currentInputIndex}
                inputValue={inputValue}
                showHint={showHint}
                hintedWordIndices={hintedWordIndices}
                inputRef={inputRef}
                onInputChange={handleChange}
                onInputKeyDown={handleKeyDown}
                state={exerciseInputState}
              />
            )}
          </div>

          <InstructionsPanel />
        </div>
      </main>

      <DebugModal
        show={showDebug}
        onClose={() => setShowDebug(false)}
        targetWord={targetWord}
        currentIndex={currentIndex}
        candidates={debugCandidates}
      />

      <MetricsHistoryModal
        show={showMetricsHistory}
        onClose={() => setShowMetricsHistory(false)}
        history={progress.dailyMetricsHistory}
      />

      <WordProgressModal
        show={showWordProgress}
        onClose={() => setShowWordProgress(false)}
        wordList={wordList}
        words={progress.words}
        history={progress.history}
        exercises={exercises}
        now={currentTime}
      />
    </div>
  );
}
