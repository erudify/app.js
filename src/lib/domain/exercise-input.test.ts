import { describe, it, expect } from "vitest";
import {
  createInitialState,
  requestHint,
  updateInput,
  resetState,
  getSegmentDisplayState,
} from "./exercise-input";

describe("exercise-input state machine", () => {
  describe("createInitialState", () => {
    it("creates initial state with correct defaults", () => {
      const state = createInitialState(3);

      expect(state.currentInputIndex).toBe(0);
      expect(state.inputValue).toBe("");
      expect(state.showHint).toBe(false);
      expect(state.hintedIndices.size).toBe(0);
      expect(state.totalInputs).toBe(3);
      expect(state.isComplete).toBe(false);
    });
  });

  describe("requestHint", () => {
    it("shows hint and records hinted index", () => {
      const state = createInitialState(3);
      const newState = requestHint(state);

      expect(newState.showHint).toBe(true);
      expect(newState.hintedIndices.has(0)).toBe(true);
      expect(newState.inputValue).toBe("");
    });

    it("clears input value when showing hint", () => {
      let state = createInitialState(3);
      state = { ...state, inputValue: "partial" };

      const newState = requestHint(state);

      expect(newState.inputValue).toBe("");
    });

    it("does nothing if hint already shown", () => {
      let state = createInitialState(3);
      state = requestHint(state);
      const originalState = state;

      state = requestHint(state);

      expect(state).toBe(originalState); // Same reference, no change
    });

    it("does nothing if exercise is complete", () => {
      let state = createInitialState(1);
      const result = updateInput(state, "correct", "correct");
      state = result.state;

      const newState = requestHint(state);

      expect(newState).toBe(state); // Same reference, no change
    });

    it("records hint for correct segment index when not at first segment", () => {
      let state = createInitialState(3);
      // Advance to segment 1
      const result = updateInput(state, "first", "first");
      state = result.state;
      expect(state.currentInputIndex).toBe(1);

      state = requestHint(state);

      expect(state.hintedIndices.has(0)).toBe(false);
      expect(state.hintedIndices.has(1)).toBe(true);
    });
  });

  describe("updateInput", () => {
    it("updates input value for incorrect answer", () => {
      const state = createInitialState(3);
      const result = updateInput(state, "wrong", "correct");

      expect(result.state.inputValue).toBe("wrong");
      expect(result.state.currentInputIndex).toBe(0);
      expect(result.segmentCompleted).toBeUndefined();
    });

    it("advances to next segment on correct answer", () => {
      const state = createInitialState(3);
      const result = updateInput(state, "correct", "correct");

      expect(result.state.currentInputIndex).toBe(1);
      expect(result.state.inputValue).toBe("");
      expect(result.segmentCompleted).toBe(0);
      expect(result.exerciseCompleted).toBeUndefined();
    });

    it("completes exercise on last segment correct answer", () => {
      let state = createInitialState(2);
      // Complete first segment
      let result = updateInput(state, "first", "first");
      state = result.state;

      // Complete second (last) segment
      result = updateInput(state, "second", "second");

      expect(result.state.isComplete).toBe(true);
      expect(result.segmentCompleted).toBe(1);
      expect(result.exerciseCompleted).toBe(true);
    });

    it("resets showHint when advancing to next segment", () => {
      let state = createInitialState(3);
      state = requestHint(state);
      expect(state.showHint).toBe(true);

      const result = updateInput(state, "correct", "correct");

      expect(result.state.showHint).toBe(false);
    });

    it("preserves hintedIndices when advancing", () => {
      let state = createInitialState(3);
      state = requestHint(state); // Hint on segment 0
      expect(state.hintedIndices.has(0)).toBe(true);

      const result = updateInput(state, "correct", "correct");

      expect(result.state.hintedIndices.has(0)).toBe(true);
    });

    it("does nothing if exercise is complete", () => {
      let state = createInitialState(1);
      let result = updateInput(state, "done", "done");
      state = result.state;
      expect(state.isComplete).toBe(true);

      result = updateInput(state, "more", "more");

      expect(result.state).toBe(state); // Same reference
    });

    it("normalizes pinyin for comparison (case insensitive)", () => {
      const state = createInitialState(2);
      // "HAO" should match "hao" after normalization (lowercase)
      const result = updateInput(state, "HAO", "hao");

      expect(result.state.currentInputIndex).toBe(1);
      expect(result.segmentCompleted).toBe(0);
    });
  });

  describe("resetState", () => {
    it("returns fresh initial state", () => {
      const state = resetState(5);

      expect(state.currentInputIndex).toBe(0);
      expect(state.inputValue).toBe("");
      expect(state.showHint).toBe(false);
      expect(state.hintedIndices.size).toBe(0);
      expect(state.totalInputs).toBe(5);
      expect(state.isComplete).toBe(false);
    });
  });

  describe("getSegmentDisplayState", () => {
    it("returns pending for future segments", () => {
      const state = createInitialState(3);
      const display = getSegmentDisplayState(state, 2);

      expect(display.visualState).toBe("pending");
      expect(display.showHint).toBe(false);
    });

    it("returns current with hint status for current segment", () => {
      let state = createInitialState(3);
      let display = getSegmentDisplayState(state, 0);

      expect(display.visualState).toBe("current");
      expect(display.showHint).toBe(false);

      state = requestHint(state);
      display = getSegmentDisplayState(state, 0);

      expect(display.visualState).toBe("current");
      expect(display.showHint).toBe(true);
    });

    it("returns completed for past segments", () => {
      let state = createInitialState(3);
      const result = updateInput(state, "first", "first");
      state = result.state;

      const display = getSegmentDisplayState(state, 0);

      expect(display.visualState).toBe("completed");
    });

    it("shows hint for completed segments that were hinted (regression test)", () => {
      // This is the key regression test:
      // 1. User is at segment 0
      // 2. User requests hint for segment 0
      // 3. User types correct answer
      // 4. User advances to segment 1
      // 5. Segment 0 should STILL show its transliteration (showHint=true)

      let state = createInitialState(3);

      // Step 2: Request hint
      state = requestHint(state);
      expect(state.hintedIndices.has(0)).toBe(true);

      // Step 3-4: Type correct answer and advance
      const result = updateInput(state, "correct", "correct");
      state = result.state;
      expect(state.currentInputIndex).toBe(1);

      // Step 5: Check that segment 0 still shows hint
      const display = getSegmentDisplayState(state, 0);
      expect(display.visualState).toBe("completed");
      expect(display.showHint).toBe(true); // THIS IS THE REGRESSION FIX
    });

    it("does not show hint for completed segments that were not hinted", () => {
      let state = createInitialState(3);
      // Complete segment 0 without hint
      const result = updateInput(state, "correct", "correct");
      state = result.state;

      const display = getSegmentDisplayState(state, 0);

      expect(display.visualState).toBe("completed");
      expect(display.showHint).toBe(false);
    });
  });

  describe("multi-segment scenario", () => {
    it("tracks hints across multiple segments correctly", () => {
      let state = createInitialState(4);

      // Segment 0: no hint
      let result = updateInput(state, "seg0", "seg0");
      state = result.state;

      // Segment 1: use hint
      state = requestHint(state);
      result = updateInput(state, "seg1", "seg1");
      state = result.state;

      // Segment 2: no hint
      result = updateInput(state, "seg2", "seg2");
      state = result.state;

      // Segment 3: use hint
      state = requestHint(state);
      result = updateInput(state, "seg3", "seg3");
      state = result.state;

      expect(state.isComplete).toBe(true);
      expect(state.hintedIndices.has(0)).toBe(false);
      expect(state.hintedIndices.has(1)).toBe(true);
      expect(state.hintedIndices.has(2)).toBe(false);
      expect(state.hintedIndices.has(3)).toBe(true);

      // Verify display states
      expect(getSegmentDisplayState(state, 0).showHint).toBe(false);
      expect(getSegmentDisplayState(state, 1).showHint).toBe(true);
      expect(getSegmentDisplayState(state, 2).showHint).toBe(false);
      expect(getSegmentDisplayState(state, 3).showHint).toBe(true);
    });
  });
});
