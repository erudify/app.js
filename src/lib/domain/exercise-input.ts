import { normalizePinyin } from "../pinyin";

/**
 * State for tracking exercise input progress.
 * This is a pure data structure with no React dependencies.
 */
export interface ExerciseInputState {
  /** Index of the current input segment (0-based, only counts segments with pinyin) */
  currentInputIndex: number;
  /** Current text in the input field */
  inputValue: string;
  /** Whether the hint is currently shown for the current segment */
  showHint: boolean;
  /** Set of segment indices where hints were used */
  hintedIndices: Set<number>;
  /** Total number of input segments in the exercise */
  totalInputs: number;
  /** Whether the exercise is complete */
  isComplete: boolean;
}

/**
 * Creates initial state for exercise input.
 */
export function createInitialState(totalInputs: number): ExerciseInputState {
  return {
    currentInputIndex: 0,
    inputValue: "",
    showHint: false,
    hintedIndices: new Set(),
    totalInputs,
    isComplete: false,
  };
}

/**
 * Result of a state transition that may trigger side effects.
 */
export interface StateTransitionResult {
  state: ExerciseInputState;
  segmentCompleted?: number; // Index of segment that was just completed
  exerciseCompleted?: boolean;
}

/**
 * Requests a hint for the current segment.
 * - Clears the input value
 * - Shows the hint
 * - Records that this segment used a hint
 */
export function requestHint(state: ExerciseInputState): ExerciseInputState {
  if (state.showHint || state.isComplete) {
    return state;
  }

  return {
    ...state,
    inputValue: "",
    showHint: true,
    hintedIndices: new Set(state.hintedIndices).add(state.currentInputIndex),
  };
}

/**
 * Updates the input value and checks if the answer is correct.
 * If correct, advances to the next segment or completes the exercise.
 */
export function updateInput(
  state: ExerciseInputState,
  newValue: string,
  expectedPinyin: string
): StateTransitionResult {
  if (state.isComplete) {
    return { state };
  }

  const isCorrect = normalizePinyin(newValue) === normalizePinyin(expectedPinyin);

  if (!isCorrect) {
    return {
      state: { ...state, inputValue: newValue },
    };
  }

  // Answer is correct - advance or complete
  const isLastSegment = state.currentInputIndex >= state.totalInputs - 1;

  if (isLastSegment) {
    return {
      state: {
        ...state,
        inputValue: newValue,
        isComplete: true,
      },
      segmentCompleted: state.currentInputIndex,
      exerciseCompleted: true,
    };
  }

  // Advance to next segment
  return {
    state: {
      ...state,
      currentInputIndex: state.currentInputIndex + 1,
      inputValue: "",
      showHint: false, // Reset hint for new segment
    },
    segmentCompleted: state.currentInputIndex,
  };
}

/**
 * Resets the state to initial values.
 */
export function resetState(totalInputs: number): ExerciseInputState {
  return createInitialState(totalInputs);
}

/**
 * Computes the visual state for a segment based on exercise input state.
 */
export type SegmentVisualState = "pending" | "current" | "completed";

export interface SegmentDisplayState {
  visualState: SegmentVisualState;
  showHint: boolean;
}

/**
 * Gets the display state for a specific segment.
 * 
 * @param state - The current exercise input state
 * @param segmentInputIndex - The index of this segment among input segments (not all segments)
 * @returns Display state including visual state and whether to show hint
 */
export function getSegmentDisplayState(
  state: ExerciseInputState,
  segmentInputIndex: number
): SegmentDisplayState {
  if (segmentInputIndex < state.currentInputIndex) {
    // Completed segment - show hint if it was hinted
    return {
      visualState: "completed",
      showHint: state.hintedIndices.has(segmentInputIndex),
    };
  }

  if (segmentInputIndex === state.currentInputIndex) {
    // Current segment
    return {
      visualState: "current",
      showHint: state.showHint,
    };
  }

  // Pending segment
  return {
    visualState: "pending",
    showHint: false,
  };
}
