# Refactoring Opportunities for Erudify

## Overview

This document identifies refactoring opportunities to improve code readability, maintainability, and separation of concerns. The current codebase has several areas that would benefit from better organization.

---

## 1. **Extract Business Logic from Components**

### Problem: `src/app/read/page.tsx` is 931 lines

The read page component is a massive monolith that handles:
- Progress persistence (localStorage)
- Data fetching and YAML parsing
- Multiple utility functions
- Complex state management
- UI rendering (sidebar, main content, debug modal)
- History display and colorization
- Exercise selection coordination

### Recommendations:

#### 1.1 Extract Progress Persistence (High Priority)

Create a dedicated module for progress management:

**New file:** `src/lib/progress.ts`
- Move `loadProgress()` and `saveProgress()` from read/page.tsx
- Add migration logic as a separate function
- Consider adding a `ProgressManager` class for cleaner API
- Add error boundary handling for localStorage failures
- Make storage key a constant at module level

**Benefits:**
- Testable in isolation
- Reusable across components
- Clear separation of data persistence from UI

#### 1.2 Extract Data Layer (High Priority)

Create separate modules for data fetching and parsing:

**New file:** `src/lib/data-loader.ts`
```typescript
export async function loadExercises(): Promise<Exercise[]>
export async function loadWordList(): Promise<string[]>
export async function loadAllData(): Promise<{ exercises: Exercise[], wordList: string[] }>
```

**New file:** `src/lib/yaml-parser.ts` (or `src/lib/exercise-parser.ts`)
- Move `parseExercises()` from read/page.tsx to a dedicated module
- Add proper error handling and validation
- Consider using a YAML library instead of custom parser for robustness
- Add TypeScript types for the YAML structure

**Benefits:**
- Easier to test data parsing
- Can add caching layer later
- Clear separation of data concerns
- Enables server-side data fetching in the future

#### 1.3 Extract History Display Logic (Medium Priority)

The history display with colorization (lines 587-663) is complex and UI-focused but embedded in the main page.

**New file:** `src/components/HistoryDisplay.tsx`
- Extract the history rendering logic
- Create a sub-component for individual history items
- Extract the colorization logic into `src/lib/history-utils.ts`

**New file:** `src/lib/history-utils.ts`
```typescript
export function getRecentHistory(progress: StudentProgress, count: number): ExerciseHistory[]
export function colorizeChineseText(history: ExerciseHistory): React.ReactNode
export function getWordChangeColor(change: WordIntervalChange): string
```

**Benefits:**
- Makes the main page component much smaller
- History becomes a self-contained, testable unit
- Easier to modify history display independently

---

## 2. **Extract Utility Functions**

### Problem: Utility functions scattered throughout components

Multiple utility functions are defined in components where they could be in shared modules:

- `formatDuration()` - read/page.tsx:170
- `formatDate()` - read/page.tsx:198
- `normalizePinyin()` - duplicated in read/page.tsx:163 and test/page.tsx:35

### Recommendations:

#### 2.1 Create Centralized Utilities Module

**New file:** `src/lib/formatting.ts`
```typescript
export function formatDuration(seconds: number): string
export function formatDate(timestamp: number): string
export function formatTimeForDisplay(seconds: number): string
```

**Move to existing:** `src/lib/pinyin.ts`
```typescript
// Add this if not already there
export function normalizePinyin(pinyin: string): string
```

**Benefits:**
- Single source of truth for formatting logic
- Easier to test formatting functions
- Reusable across components
- Consistent formatting throughout the app

---

## 3. **Component Extraction**

### Problem: Large components with mixed concerns

#### 3.1 Extract Debug Modal (Low Priority)

The debug modal (read/page.tsx:865-927) is self-contained but adds ~60 lines to the main page.

**New file:** `src/components/DebugModal.tsx`
- Extract the debug modal component
- Create a hook for debug state management if needed

**Benefits:**
- Cleaner main component
- Debug features can be disabled in production builds
- Self-contained unit for testing

#### 3.2 Extract Exercise Display (Medium Priority)

The exercise display section (read/page.tsx:683-834) has two states (completion and input) with complex rendering logic.

**New file:** `src/components/ExerciseDisplay.tsx`
- Extract the exercise rendering logic
- Create a `ExerciseSegment` component for individual segments
- Separate the completed view from the input view

**New file:** `src/components/ExerciseSegment.tsx`
```typescript
interface ExerciseSegmentProps {
  segment: ExerciseSegment
  state: 'pending' | 'current' | 'completed'
  value?: string
  onChange?: (value: string) => void
  onKeyDown?: (e: KeyboardEvent) => void
  showHint?: boolean
}
```

**Benefits:**
- Exercise display becomes reusable
- Easier to modify exercise rendering
- Better separation of display logic

#### 3.3 Extract Sidebar (Medium Priority)

The sidebar (read/page.tsx:531-675) contains navigation, stats, Pomodoro timer, and history.

**New file:** `src/components/Sidebar.tsx`
- Extract sidebar into its own component
- Pass stats and history as props
- Keep Pomodoro timer as a child component

**Benefits:**
- Main page focuses on exercise interaction
- Sidebar can be independently styled/modified
- Clearer component hierarchy

#### 3.4 Extract Instructions Panel (Low Priority)

The instructions section (read/page.tsx:836-860) is static but adds lines to the main component.

**New file:** `src/components/InstructionsPanel.tsx`
- Extract the instructions panel
- Make it reusable across pages

---

## 4. **Custom Hook Extraction**

### Problem: Complex state management logic embedded in components

The read page has multiple interrelated pieces of state and effects that could be encapsulated.

### Recommendations:

#### 4.1 Create Hooks for State Management

**New file:** `src/hooks/useExercises.ts`
```typescript
export function useExercises() {
  // Handle loading exercises and word list
  // Return: { exercises, wordList, loading, error }
}
```

**New file:** `src/hooks/useProgress.ts`
```typescript
export function useProgress() {
  // Handle progress loading, saving, and clearing
  // Return: { progress, updateProgress, clearProgress, stats }
}
```

**New file:** `src/hooks/useExerciseSelection.ts`
```typescript
export function useExerciseSelection(
  exercises: Exercise[],
  progress: StudentProgress,
  orderedWordList: string[]
) {
  // Handle selecting the next exercise
  // Return: { currentExercise, currentIndex, targetWord, advanceToNext }
}
```

**New file:** `src/hooks/useExerciseInput.ts`
```typescript
export function useExerciseInput(
  exercise: Exercise,
  onComplete: (result: ExerciseCompletion) => void
) {
  // Handle input state, checking answers, and completion
  // Return: { inputValue, setInputValue, currentInputIndex, hintsUsed, checkAndAdvance, etc. }
}
```

**Benefits:**
- Clear separation of state management logic
- Hooks can be tested independently
- Components become simpler and more focused
- State logic can be reused if needed

---

## 5. **Improve Type Safety and Type Organization**

### Problem: Types are well-defined but could be better organized

### Recommendations:

#### 5.1 Create Domain-Specific Type Modules

**New file:** `src/lib/domain/exercise.ts`
```typescript
export interface ExerciseSegment { ... }
export interface Exercise { ... }
export interface ScoredExercise { ... }
```

**New file:** `src/lib/domain/progress.ts`
```typescript
export interface WordProgress { ... }
export interface StudentProgress { ... }
export interface ExerciseHistory { ... }
export interface WordIntervalChange { ... }
```

**New file:** `src/lib/domain/timer.ts`
```typescript
export interface PomodoroState { ... }
export interface PomodoroConfig { ... }
```

**Keep in:** `src/lib/types.ts` (or remove and export from domain modules)

**Benefits:**
- Types co-located with their domain logic
- Easier to find related types
- Better organization for larger codebases

#### 5.2 Add Strict Type Checking for Config

**Current:** Constants are scattered throughout files

**Recommendation:** Create a centralized config module

**New file:** `src/lib/config.ts`
```typescript
export const STORAGE_KEY = "erudify-progress";
export const EXERCISE_FILE = "/HSK-1.yml";
export const WORD_LIST_FILE = "/HSK 1.txt";
export const MAX_HISTORY_ITEMS = 3;
export const DEBUG_MODE = import.meta.env.DEV;
```

**Benefits:**
- Single place for configuration
- Easy to change for different environments
- Clear visibility of what's configurable

---

## 6. **Remove Code Duplication**

### Problem: Duplicate logic between pages

#### 6.1 Input Handling Duplication

Both `read/page.tsx` and `test/page.tsx` have similar input handling logic:
- `normalizePinyin()` function
- Input checking and advancement
- Similar segment rendering

**Recommendation:**
- Extract common input logic into a custom hook: `usePinyinInput.ts`
- Create a shared `PinyinSegmentInput` component
- Use the shared utilities for input validation

**New file:** `src/hooks/usePinyinInput.ts`
```typescript
interface UsePinyinInputOptions {
  segments: ExerciseSegment[]
  onComplete?: () => void
}

export function usePinyinInput(options: UsePinyinInputOptions) {
  // Handle input state, validation, and advancement
  // Return: { currentValue, setCurrentValue, currentIndex, isComplete, handlers }
}
```

**Benefits:**
- Single source of truth for input logic
- Consistent behavior across pages
- Easier to maintain and test

---

## 7. **Improve Error Handling**

### Problem: Limited error handling throughout the codebase

### Recommendations:

#### 7.1 Add Error Boundaries

**New file:** `src/components/ErrorBoundary.tsx`
```typescript
export class ErrorBoundary extends React.Component {
  // Catch errors in component tree and display fallback UI
}
```

#### 7.2 Add Error Handling to Data Loading

Enhance data loading with proper error handling:

**Update:** `src/lib/data-loader.ts`
```typescript
export async function loadExercises(): Promise<Exercise[]> {
  try {
    const response = await fetch("/HSK-1.yml");
    if (!response.ok) {
      throw new Error(`Failed to load exercises: ${response.statusText}`);
    }
    // ...
  } catch (error) {
    console.error("Failed to load exercises:", error);
    throw new DataLoadError("Unable to load exercises", error);
  }
}
```

#### 7.3 Add Loading States

Extract loading state management:

**New file:** `src/hooks/useDataLoader.ts`
```typescript
export function useDataLoader() {
  // Handle loading, error, and retry logic
  // Return: { data, loading, error, retry }
}
```

**Benefits:**
- Better user experience
- Easier to debug issues
- More robust application

---

## 8. **Consider Adding a State Management Library**

### Problem: Complex state management in the read page

The read page has:
- Progress state
- Exercise state
- Input state
- UI state (hints, debug, completion)
- Timer state
- Current time updates

### Recommendations:

#### 8.1 Consider Zustand or Jotai for State Management

If the application grows, consider a state management library for:

**New file:** `src/store/exerciseStore.ts` (if using Zustand)
```typescript
interface ExerciseStore {
  // Exercise and progress state
  exercises: Exercise[]
  progress: StudentProgress
  currentExercise: Exercise | null
  // Actions
  loadExercises: () => Promise<void>
  updateProgress: (update: Partial<StudentProgress>) => void
  // ...
}
```

**Benefits:**
- Centralized state management
- Easier to test state transitions
- Better performance with selective re-renders
- Clear data flow

**Note:** This is optional. The current approach with hooks works well for this scale.

---

## 9. **Improve Testability**

### Problem: Some logic is hard to test due to tight coupling

### Recommendations:

#### 9.1 Make Components Pure Where Possible

- Extract business logic from components into utility functions
- Use dependency injection for services (like progress storage)
- Mock external dependencies in tests

#### 9.2 Add Integration Tests

The E2E tests exist, but consider adding:

- Component tests with React Testing Library
- Unit tests for utility functions
- Integration tests for hooks

#### 9.3 Test Data Structures

Add tests for:
- YAML parsing edge cases
- Progress state transitions
- Exercise selection algorithm
- Pinyin tone handling

---

## 10. **Documentation Improvements**

### Problem: Some functions lack clear documentation

### Recommendations:

#### 10.1 Add JSDoc Comments

Ensure all exported functions have clear JSDoc comments:
- Purpose
- Parameters with types
- Return value
- Examples if helpful

#### 10.2 Add Architecture Documentation

Create a `docs/` directory with:
- `architecture.md` - High-level architecture overview
- `state-management.md` - How state flows through the app
- `spaced-repetition.md` - How the algorithm works
- `component-hierarchy.md` - Component structure

---

## Priority Summary

### High Priority (Do First)
1. Extract progress persistence to `src/lib/progress.ts`
2. Extract data loading to `src/lib/data-loader.ts` and `src/lib/yaml-parser.ts`
3. Create hooks for state management (`useProgress`, `useExercises`, `useExerciseSelection`)
4. Extract utility functions to `src/lib/formatting.ts`

### Medium Priority (Do Second)
1. Extract history display to `src/components/HistoryDisplay.tsx`
2. Extract sidebar to `src/components/Sidebar.tsx`
3. Extract exercise display to `src/components/ExerciseDisplay.tsx`
4. Remove input handling duplication with `usePinyinInput` hook

### Low Priority (Nice to Have)
1. Extract debug modal to `src/components/DebugModal.tsx`
2. Extract instructions panel to `src/components/InstructionsPanel.tsx`
3. Reorganize types into domain modules
4. Consider state management library (Zustand/Jotai)

---

## Expected Outcomes

After implementing these refactorings:

1. **Reduced complexity:** The main read page will likely be reduced from 931 lines to ~300-400 lines
2. **Better testability:** Business logic can be unit tested without rendering components
3. **Improved maintainability:** Changes to one area won't affect others
4. **Clearer code organization:** Related code grouped together
5. **Easier onboarding:** New developers can understand the codebase faster
6. **Reusability:** Components and hooks can be reused across pages

---

## Implementation Strategy

1. **Start with data layer** (progress, data loading, parsing) - no UI changes
2. **Extract utilities** - formatting, pinyin normalization
3. **Create hooks** - extract state management from components
4. **Extract components** - sidebar, history, exercise display
5. **Refactor main page** - now it should be much simpler
6. **Add tests** - test the extracted units
7. **Update documentation** - document the new architecture

---

## Notes

- The current code is functional and well-typed. These are improvements, not fixes.
- Some refactorings can be done incrementally without breaking the app.
- Consider the team's capacity and priorities when deciding which to implement first.
- Always run tests after each refactoring to ensure nothing is broken.
