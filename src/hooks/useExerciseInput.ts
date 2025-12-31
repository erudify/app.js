import { useState, useCallback, KeyboardEvent, ChangeEvent, useRef, useEffect } from "react";
import { processPinyinInput } from "../lib/pinyin";
import type { ExerciseSegment } from "../lib/domain";
import {
  ExerciseInputState,
  createInitialState,
  requestHint,
  updateInput,
  resetState,
} from "../lib/domain/exercise-input";

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
  /** The underlying state machine state (for use with getSegmentDisplayState) */
  state: ExerciseInputState;
}

export function useExerciseInput(
  options: UseExerciseInputOptions
): UseExerciseInputReturn {
  const { segments, onSegmentComplete, onComplete } = options;

  const inputSegments = segments.filter((seg) => seg.pinyin !== "");
  const totalInputs = inputSegments.length;

  const [state, setState] = useState<ExerciseInputState>(() =>
    createInitialState(totalInputs)
  );
  const inputRef = useRef<HTMLInputElement>(null!);

  // Keep track of callbacks in refs to avoid stale closures
  const onSegmentCompleteRef = useRef(onSegmentComplete);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onSegmentCompleteRef.current = onSegmentComplete;
    onCompleteRef.current = onComplete;
  }, [onSegmentComplete, onComplete]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [state.currentInputIndex]);

  const checkAndAdvance = useCallback(
    (newValue: string) => {
      const currentSegment = inputSegments[state.currentInputIndex];
      if (!currentSegment) return;

      const result = updateInput(state, newValue, currentSegment.pinyin);
      setState(result.state);

      if (result.segmentCompleted !== undefined) {
        onSegmentCompleteRef.current?.(result.segmentCompleted);
      }
      if (result.exerciseCompleted) {
        onCompleteRef.current?.(result.state.hintedIndices);
      }
    },
    [state, inputSegments]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setState(requestHint(state));
        return;
      }

      if (/^[0-4]$/.test(e.key)) {
        e.preventDefault();
        const input = e.currentTarget;
        const selectionStart = input.selectionStart ?? state.inputValue.length;

        const { newText, newCursorPos } = processPinyinInput(
          state.inputValue,
          selectionStart,
          parseInt(e.key, 10)
        );

        // First update the input value in state
        setState((prev) => ({ ...prev, inputValue: newText }));
        // Then check if this completes the segment
        checkAndAdvance(newText);

        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
      }
    },
    [state, checkAndAdvance]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setState((prev) => ({ ...prev, inputValue: newValue }));
      checkAndAdvance(newValue);
    },
    [checkAndAdvance]
  );

  const reset = useCallback(() => {
    setState(resetState(totalInputs));
  }, [totalInputs]);

  const completeExercise = useCallback(() => {
    onCompleteRef.current?.(state.hintedIndices);
  }, [state.hintedIndices]);

  // For backward compatibility, expose individual state properties
  const setInputValue = useCallback((value: string) => {
    setState((prev) => ({ ...prev, inputValue: value }));
  }, []);

  const setShowHint = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showHint: show }));
  }, []);

  return {
    inputValue: state.inputValue,
    setInputValue,
    currentInputIndex: state.currentInputIndex,
    showHint: state.showHint,
    setShowHint,
    hintedWordIndices: state.hintedIndices,
    inputRef: inputRef as React.RefObject<HTMLInputElement>,
    handleKeyDown,
    handleChange,
    reset,
    completeExercise,
    state,
  };
}
