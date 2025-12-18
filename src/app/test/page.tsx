"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import { processPinyinInput } from "@/lib/pinyin";

interface Segment {
  chinese: string;
  pinyin: string;
}

interface SentenceData {
  segments: Segment[];
  english: string;
}

// Sample data
const sampleSentence: SentenceData = {
  segments: [
    { chinese: "我", pinyin: "wǒ" },
    { chinese: "是", pinyin: "shì" },
    { chinese: "学生", pinyin: "xué sheng" },
    { chinese: "。", pinyin: "" },
  ],
  english: "I am a student.",
};

// Normalize pinyin for comparison (lowercase, remove spaces)
function normalizePinyin(pinyin: string): string {
  return pinyin.toLowerCase().replace(/\s+/g, "");
}

export default function TestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get segments that need pinyin input (non-empty pinyin)
  const inputSegments = sampleSentence.segments.filter(
    (seg) => seg.pinyin !== ""
  );
  const totalInputs = inputSegments.length;

  // Focus input on mount and when currentIndex changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex]);

  // Check if input matches and advance to next segment
  const checkAndAdvance = useCallback(
    (newValue: string) => {
      const currentSegment = inputSegments[currentIndex];
      if (
        currentSegment &&
        normalizePinyin(newValue) === normalizePinyin(currentSegment.pinyin)
      ) {
        // Move to next segment
        if (currentIndex < totalInputs - 1) {
          setCurrentIndex((prev) => prev + 1);
          setInputValue("");
        } else {
          // All segments completed
          setIsComplete(true);
        }
      }
    },
    [currentIndex, inputSegments, totalInputs]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const key = e.key;

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

        // Set cursor position after React updates the input
        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
      }
    },
    [inputValue, checkAndAdvance]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      checkAndAdvance(newValue);
    },
    [checkAndAdvance]
  );

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setInputValue("");
    setIsComplete(false);
  }, []);

  // Track which segment index we're currently at for rendering
  let inputSegmentIndex = 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white p-8 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-white">
          Pinyin Input Exercise
        </h1>

        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Type the pinyin for each Chinese character. Use tone numbers (1-4)
            to add tone marks.
          </p>

          {/* Chinese sentence with input field */}
          <div className="mb-8 flex flex-wrap items-start gap-2 text-4xl">
            {sampleSentence.segments.map((segment, idx) => {
              // Punctuation or empty pinyin - display in same structure for alignment
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

              const isCurrentInput = segmentInputIndex === currentIndex;
              const isCompleted = segmentInputIndex < currentIndex || isComplete;

              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-zinc-900 dark:text-white">
                    {segment.chinese}
                  </span>
                  {isCurrentInput && !isComplete ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      className="w-24 rounded border border-red-300 bg-red-50 px-2 py-1 text-center text-base text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-red-700 dark:bg-red-900/20 dark:text-white"
                      autoFocus
                    />
                  ) : isCompleted ? (
                    <span className="text-base text-green-600 dark:text-green-400">
                      {segment.pinyin}
                    </span>
                  ) : (
                    <span className="text-base text-zinc-400 dark:text-zinc-600">
                      ___
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* English translation - shown when complete */}
          {isComplete && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-lg text-green-800 dark:text-green-200">
                {sampleSentence.english}
              </p>
            </div>
          )}

          {/* Progress indicator */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Progress:
            </span>
            <div className="flex gap-1">
              {inputSegments.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-8 rounded ${
                    idx < currentIndex || isComplete
                      ? "bg-green-500"
                      : idx === currentIndex
                        ? "bg-red-500"
                        : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {isComplete ? totalInputs : currentIndex}/{totalInputs}
            </span>
          </div>

          {/* Reset button */}
          {isComplete && (
            <button
              onClick={handleReset}
              className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              Try Again
            </button>
          )}

          {/* Instructions */}
          <div className="mt-6 space-y-2 border-t border-zinc-200 pt-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Tips:
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
              <li>Use 0 to remove the last tone mark</li>
              <li>v = ü (e.g., lv4 → lǜ)</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
