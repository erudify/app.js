"use client";

import type { ExerciseSegment } from "@/lib/domain/exercise";

interface ExerciseSegmentDisplayProps {
  segment: ExerciseSegment;
  state: "pending" | "current" | "completed";
  inputRef?: React.RefObject<HTMLInputElement>;
  inputValue?: string;
  showHint?: boolean;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function ExerciseSegmentDisplay({
  segment,
  state,
  inputRef,
  inputValue,
  showHint,
  onInputChange,
  onInputKeyDown,
}: ExerciseSegmentDisplayProps) {
  if (segment.pinyin === "") {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="h-4 text-sm leading-4 text-transparent">.</span>
        <span className="text-zinc-900 dark:text-white">{segment.chinese}</span>
      </div>
    );
  }

  const pinyinWidth = `${segment.pinyin.length * 0.6 + 1}rem`;

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`h-4 text-sm leading-4 ${
          state === "current" && showHint && segment.transliteration
            ? "text-zinc-500 dark:text-zinc-400"
            : "text-transparent"
        }`}
      >
        {state === "current" && showHint && segment.transliteration
          ? segment.transliteration
          : "."}
      </span>
      <span className="text-zinc-900 dark:text-white">{segment.chinese}</span>
      {state === "current" ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue ?? ""}
          onChange={onInputChange}
          onKeyDown={onInputKeyDown}
          placeholder={showHint ? segment.pinyin : ""}
          style={{ width: pinyinWidth }}
          className="rounded border border-red-300 bg-red-50 px-2 py-1 text-center text-base text-zinc-900 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-red-700 dark:bg-red-900/20 dark:text-white dark:placeholder-zinc-400"
          autoFocus
        />
      ) : state === "completed" ? (
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
}
