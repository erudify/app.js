import { useState, useCallback, KeyboardEvent, ChangeEvent, useRef, useEffect } from "react";
import { processPinyinInput, normalizePinyin } from "../lib/pinyin";
import type { ExerciseSegment } from "../lib/domain";

export interface UsePinyinInputOptions {
  segments: ExerciseSegment[];
  onComplete?: () => void;
  autoAdvance?: boolean;
}

export interface UsePinyinInputReturn {
  currentValue: string;
  setCurrentValue: (value: string) => void;
  currentIndex: number;
  isComplete: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
}

export function usePinyinInput(
  options: UsePinyinInputOptions
): UsePinyinInputReturn {
  const { segments, onComplete, autoAdvance = true } = options;

  const inputSegments = segments.filter((seg) => seg.pinyin !== "");
  const totalInputs = inputSegments.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex]);

  const checkAndAdvance = useCallback(
    (newValue: string) => {
      const currentSegment = inputSegments[currentIndex];
      if (
        currentSegment &&
        normalizePinyin(newValue) === normalizePinyin(currentSegment.pinyin)
      ) {
        if (currentIndex < totalInputs - 1) {
          setCurrentIndex((prev) => prev + 1);
          setCurrentValue("");
        } else if (autoAdvance) {
          onComplete?.();
        }
      }
    },
    [currentIndex, inputSegments, totalInputs, onComplete, autoAdvance]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const key = e.key;
      if (/^[0-4]$/.test(key)) {
        e.preventDefault();
        const input = e.currentTarget;
        const selectionStart = input.selectionStart ?? currentValue.length;

        const { newText, newCursorPos } = processPinyinInput(
          currentValue,
          selectionStart,
          parseInt(key, 10)
        );

        setCurrentValue(newText);
        checkAndAdvance(newText);

        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
      }
    },
    [currentValue, checkAndAdvance]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setCurrentValue(newValue);
      checkAndAdvance(newValue);
    },
    [checkAndAdvance]
  );

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setCurrentValue("");
  }, []);

  return {
    currentValue,
    setCurrentValue,
    currentIndex,
    isComplete: currentIndex >= totalInputs - 1,
    inputRef: inputRef as React.RefObject<HTMLInputElement>,
    handleKeyDown,
    handleChange,
    reset,
  };
}
