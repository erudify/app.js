"use client";

import { ExerciseSegmentDisplay } from "./ExerciseSegmentDisplay";
import type { Exercise } from "@/lib/domain/exercise";

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
}: ExerciseDisplayProps) {
  if (isComplete) {
    return <CompletedExercise exercise={exercise} />;
  }

  return <InputExercise {...{ exercise, currentInputIndex, inputValue, showHint, hintedWordIndices, inputRef, onInputChange, onInputKeyDown }} />;
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
        const state =
          segmentInputIndex < currentInputIndex
            ? ("completed" as const)
            : segmentInputIndex === currentInputIndex
            ? ("current" as const)
            : ("pending" as const);

        return (
          <ExerciseSegmentDisplay
            key={idx}
            segment={segment}
            state={state}
            inputRef={state === "current" ? inputRef : undefined}
            inputValue={state === "current" ? inputValue : undefined}
            showHint={state === "current" && showHint}
            onInputChange={state === "current" ? onInputChange : undefined}
            onInputKeyDown={state === "current" ? onInputKeyDown : undefined}
          />
        );
      })}
    </div>
  );
}
