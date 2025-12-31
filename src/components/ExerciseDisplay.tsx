"use client";

import { ExerciseSegmentDisplay } from "./ExerciseSegmentDisplay";
import type { Exercise } from "@/lib/domain/exercise";
import type { ExerciseInputState } from "@/lib/domain/exercise-input";
import { getSegmentDisplayState } from "@/lib/domain/exercise-input";

interface ExerciseDisplayProps {
  exercise: Exercise;
  isComplete: boolean;
  currentInputIndex: number;
  inputValue: string;
  showHint: boolean;
  hintedWordIndices: Set<number>;
  inputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** The state machine state for computing segment display states */
  state?: ExerciseInputState;
}

export function ExerciseDisplay({
  exercise,
  isComplete,
  currentInputIndex,
  inputValue,
  showHint,
  hintedWordIndices,
  inputRef,
  onInputChange,
  onInputKeyDown,
  state,
}: ExerciseDisplayProps) {
  if (isComplete) {
    return <CompletedExercise exercise={exercise} />;
  }

  return (
    <InputExercise
      {...{
        exercise,
        currentInputIndex,
        inputValue,
        showHint,
        hintedWordIndices,
        inputRef,
        onInputChange,
        onInputKeyDown,
        state,
      }}
    />
  );
}

interface CompletedExerciseProps {
  exercise: Exercise;
}

function CompletedExercise({ exercise }: CompletedExerciseProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-2 text-[2.5rem]">
        {exercise.segments.map((segment, idx) => {
          if (segment.pinyin === "") {
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <span className="h-4 text-sm leading-4 text-transparent">.</span>
                <span className="text-zinc-900 dark:text-white">
                  {segment.chinese}
                </span>
              </div>
            );
          }

          const pinyinWidth = `${segment.pinyin.length * 0.6 + 1}rem`;

          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span className="h-4 text-sm leading-4 text-zinc-500 dark:text-zinc-400">
                {segment.transliteration ?? ""}
              </span>
              <span className="text-zinc-900 dark:text-white">
                {segment.chinese}
              </span>
              <span
                className="inline-block px-2 py-1 text-center text-base text-green-600 dark:text-green-400"
                style={{ width: pinyinWidth }}
              >
                {segment.pinyin}
              </span>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg bg-zinc-50 p-4 text-lg text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200">
        {exercise.english}
      </div>
    </div>
  );
}

interface InputExerciseProps {
  exercise: Exercise;
  currentInputIndex: number;
  inputValue: string;
  showHint: boolean;
  hintedWordIndices: Set<number>;
  inputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  state?: ExerciseInputState;
}

function InputExercise({
  exercise,
  currentInputIndex,
  inputValue,
  showHint,
  hintedWordIndices,
  inputRef,
  onInputChange,
  onInputKeyDown,
  state,
}: InputExerciseProps) {
  let inputSegmentIndex = 0;

  return (
    <div className="flex flex-wrap items-start gap-2 text-[2.5rem]">
      {exercise.segments.map((segment, idx) => {
        if (segment.pinyin === "") {
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span className="h-4 text-sm leading-4 text-transparent">.</span>
              <span className="text-zinc-900 dark:text-white">
                {segment.chinese}
              </span>
            </div>
          );
        }

        const segmentInputIndex = inputSegmentIndex++;

        // Use the state machine to compute display state if available,
        // otherwise fall back to legacy computation
        let visualState: "pending" | "current" | "completed";
        let segmentShowHint: boolean;

        if (state) {
          const displayState = getSegmentDisplayState(state, segmentInputIndex);
          visualState = displayState.visualState;
          segmentShowHint = displayState.showHint;
        } else {
          // Legacy fallback for backward compatibility
          visualState =
            segmentInputIndex < currentInputIndex
              ? "completed"
              : segmentInputIndex === currentInputIndex
              ? "current"
              : "pending";
          segmentShowHint =
            visualState === "current"
              ? showHint
              : hintedWordIndices.has(segmentInputIndex);
        }

        return (
          <ExerciseSegmentDisplay
            key={idx}
            segment={segment}
            state={visualState}
            inputRef={visualState === "current" ? inputRef : undefined}
            inputValue={visualState === "current" ? inputValue : undefined}
            showHint={segmentShowHint}
            onInputChange={visualState === "current" ? onInputChange : undefined}
            onInputKeyDown={visualState === "current" ? onInputKeyDown : undefined}
          />
        );
      })}
    </div>
  );
}
