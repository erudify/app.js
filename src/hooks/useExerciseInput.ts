import { useState, useCallback, KeyboardEvent, ChangeEvent, useRef, useEffect } from "react";
import { processPinyinInput, normalizePinyin } from "../lib/pinyin";
import type { ExerciseSegment } from "../lib/domain";

export interface UseExerciseInputOptions {
  segments: ExerciseSegment[];
  onSegmentComplete?: (index: number) => void;
  onComplete?: (hintsUsed: Set<number>) => void;
}

export interface UseExerciseInputReturn {
  inputValue: string;
  setInputValue: (value: string) => void;
  currentInputIndex: number;
  showHint: boolean;
  setShowHint: (show: boolean) => void;
  hintedWordIndices: Set<number>;
  inputRef: React.RefObject<HTMLInputElement>;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
  completeExercise: () => void;
}

export function useExerciseInput(
  options: UseExerciseInputOptions
): UseExerciseInputReturn {
  const { segments, onSegmentComplete, onComplete } = options;

  const inputSegments = segments.filter((seg) => seg.pinyin !== "");
  const totalInputs = inputSegments.length;

  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintedWordIndices, setHintedWordIndices] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentInputIndex]);

  const checkAndAdvance = useCallback(
    (newValue: string) => {
      const currentSegment = inputSegments[currentInputIndex];
      if (
        currentSegment &&
        normalizePinyin(newValue) === normalizePinyin(currentSegment.pinyin)
      ) {
        if (currentInputIndex < totalInputs - 1) {
          setCurrentInputIndex((prev) => prev + 1);
          setInputValue("");
          setShowHint(false);
          onSegmentComplete?.(currentInputIndex);
        } else {
          onComplete?.(hintedWordIndices);
        }
      }
    },
    [currentInputIndex, inputSegments, totalInputs, hintedWordIndices, onSegmentComplete, onComplete]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!showHint && currentInputIndex < inputSegments.length) {
          setInputValue("");
          setShowHint(true);
          setHintedWordIndices((prev) => new Set(prev).add(currentInputIndex));
        }
        return;
      }

      if (/^[0-4]$/.test(e.key)) {
        e.preventDefault();
        const input = e.currentTarget;
        const selectionStart = input.selectionStart ?? inputValue.length;

        const { newText, newCursorPos } = processPinyinInput(
          inputValue,
          selectionStart,
          parseInt(e.key, 10)
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

  const reset = useCallback(() => {
    setCurrentInputIndex(0);
    setInputValue("");
    setShowHint(false);
    setHintedWordIndices(new Set());
  }, []);

  const completeExercise = useCallback(() => {
    onComplete?.(hintedWordIndices);
  }, [hintedWordIndices, onComplete]);

  return {
    inputValue,
    setInputValue,
    currentInputIndex,
    showHint,
    setShowHint,
    hintedWordIndices,
    inputRef: inputRef as React.RefObject<HTMLInputElement>,
    handleKeyDown,
    handleChange,
    reset,
    completeExercise,
  };
}
