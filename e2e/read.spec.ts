import { test, expect } from "@playwright/test";

test.describe("Read Page - Spaced Repetition", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/read");
    await page.evaluate(() => {
      localStorage.removeItem("erudify-progress");
    });
    await page.reload();
  });

  test("completing exercise increases review count after 30 seconds", async ({ page }) => {
    test.setTimeout(70000); // Increase timeout for 31 second wait + overhead

    // Wait for exercises to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Get initial review count from the sidebar
    const initialReviewCount = await getReviewCount(page);

    // Complete the exercise by using hints
    await completeExerciseWithHints(page);

    // Get review count immediately after completion (should still be 0)
    const reviewCountAfterCompletion = await getReviewCount(page);
    expect(reviewCountAfterCompletion).toBe(0);

    // Continue to next exercise
    await page.getByRole("button", { name: "Continue" }).click();

    // Wait for the next exercise to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Wait 31 seconds (1 second buffer after the 30-second interval)
    // The page should automatically update the currentTime and recalculate stats
    await page.waitForTimeout(31000);

    // Wait for the automatic update to trigger and React to re-render
    // The setTimeout should fire around 30 seconds after completion
    await page.waitForTimeout(2000);

    // Get review count after 30+ seconds (without page reload)
    const finalReviewCount = await getReviewCount(page);

    // Verify review count has increased from initial
    expect(finalReviewCount).toBeGreaterThan(initialReviewCount);
  });

  test("review count remains zero immediately after completing exercise", async ({ page }) => {
    // Wait for exercises to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Complete the exercise
    await completeExerciseWithHints(page);

    // Verify review count is still 0 immediately after completion
    const reviewCount = await getReviewCount(page);
    expect(reviewCount).toBe(0);
  });

  test("focus is managed correctly during exercise flow", async ({ page }) => {
    // Wait for exercises to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Verify first input has focus when page loads
    const firstInput = page.locator('input[type="text"]').first();
    await expect(firstInput).toBeFocused();

    // Complete the exercise
    await completeExerciseWithHints(page);

    // Verify Continue button has focus after exercise completion
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeFocused();

    // Click Continue to move to next exercise
    await continueButton.click();

    // Wait for next exercise to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Verify first input has focus again
    await expect(firstInput).toBeFocused();
  });
});

/**
 * Get the current "Review words" count from the sidebar
 */
async function getReviewCount(page: any): Promise<number> {
  const reviewElement = page
    .locator('text=Review words:')
    .locator('..')
    .locator(':scope > span:last-child');
  const text = await reviewElement.textContent();
  return parseInt(text ?? "0", 10);
}

/**
 * Complete the current exercise using hints (Escape key) and typing the pinyin
 */
async function completeExerciseWithHints(page: any): Promise<void> {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    // Check if we're on completion screen
    const continueButton = page.getByRole("button", { name: "Continue" });
    const isVisible = await continueButton.isVisible().catch(() => false);
    if (isVisible) break;

    // Press Escape to show hint for current segment
    await page.keyboard.press("Escape");

    // Wait for hint to appear in placeholder
    await page.waitForTimeout(100);

    // Get the currently focused input and its placeholder
    const input = page.locator('input:focus');
    const count = await input.count();

    if (count > 0) {
      const placeholder = await input.getAttribute("placeholder");

      // Type the pinyin from the hint
      if (placeholder && placeholder !== "") {
        // Clear the input and type the pinyin with tone numbers
        await input.fill(placeholder);
      }
    }

    // Wait for input to process and potentially advance to next segment
    await page.waitForTimeout(500);

    attempts++;
  }

  // Verify completion screen appeared
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
}

test.describe("Read Page - Study Loop", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to start from empty state
    await page.goto("/read");
    await page.evaluate(() => {
      localStorage.removeItem("erudify-progress");
    });
    await page.reload();
  });

  test("each word in exercise is prompted individually before completion", async ({ page }) => {
    // Wait for exercises to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Track each word that was prompted
    const promptedWords: string[] = [];
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      // Check if we're on completion screen
      const continueButton = page.getByRole("button", { name: "Continue" });
      const isComplete = await continueButton.isVisible().catch(() => false);
      if (isComplete) break;

      // Get the focused input and read the expected pinyin from the data attribute
      const input = page.locator('input[type="text"]:focus');
      const count = await input.count();

      if (count > 0) {
        const expectedPinyin = await input.getAttribute("data-pinyin");
        
        if (expectedPinyin) {
          // Record that this word was prompted
          promptedWords.push(expectedPinyin);

          // Type the correct answer
          await input.fill(expectedPinyin);

          // Wait for the input to be processed and advance to next word
          await page.waitForTimeout(200);
        }
      }

      attempts++;
    }

    // Verify we prompted multiple words (the first exercise has 3 words: 我 是 学生)
    expect(promptedWords.length).toBeGreaterThanOrEqual(3);
    
    // Verify that different words were prompted (not the same word repeated)
    const uniqueWords = new Set(promptedWords);
    expect(uniqueWords.size).toBeGreaterThanOrEqual(3);

    // Verify completion screen is shown
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("completion screen shows english translation and pinyin for each word", async ({ page }) => {
    // Wait for exercises to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Complete the exercise by typing correct answers
    await completeExerciseByTypingAnswers(page);

    // Verify the completion screen is shown
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeVisible();

    // Verify English translation is displayed in the completion area
    // The English text is shown in a rounded background container
    const englishContainer = page.locator('.rounded-lg.bg-zinc-50');
    await expect(englishContainer).toBeVisible();
    
    // Verify the English container has text content
    const englishText = await englishContainer.textContent();
    expect(englishText).toBeTruthy();
    expect(englishText!.length).toBeGreaterThan(5); // Should have meaningful text

    // Verify pinyin is shown for each completed segment
    // Look for the green-colored pinyin text that appears on completion
    const pinyinElements = page.locator('.text-green-600, .dark\\:text-green-400');
    const pinyinCount = await pinyinElements.count();
    expect(pinyinCount).toBeGreaterThanOrEqual(3); // At least 3 words with pinyin
  });

  test("continue button advances to next exercise", async ({ page }) => {
    // Wait for exercises to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Get the first word's expected pinyin to identify first exercise
    const firstExerciseFirstPinyin = await page
      .locator('input[type="text"]:focus')
      .getAttribute("data-pinyin");

    // Complete the first exercise
    await completeExerciseByTypingAnswers(page);

    // Click continue
    const continueButton = page.getByRole("button", { name: "Continue" });
    await continueButton.click();

    // Wait for next exercise to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Verify we're on a new exercise (different first word, or at least an input is shown)
    const newFirstInput = page.locator('input[type="text"]:focus');
    await expect(newFirstInput).toBeVisible();
    
    // The new exercise should have focus on the input
    await expect(newFirstInput).toBeFocused();
  });

  test("completes two full study loops correctly", async ({ page }) => {
    // Wait for exercises to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // --- First Loop ---
    const firstLoopWords: string[] = [];
    
    // Complete first exercise, tracking each word
    let attempts = 0;
    while (attempts < 20) {
      const continueButton = page.getByRole("button", { name: "Continue" });
      const isComplete = await continueButton.isVisible().catch(() => false);
      if (isComplete) break;

      const input = page.locator('input[type="text"]:focus');
      const count = await input.count();
      if (count > 0) {
        const pinyin = await input.getAttribute("data-pinyin");
        if (pinyin) {
          firstLoopWords.push(pinyin);
          await input.fill(pinyin);
          await page.waitForTimeout(200);
        }
      }
      attempts++;
    }

    // Verify first exercise completion
    expect(firstLoopWords.length).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();

    // Verify English text is shown on completion screen
    const englishAfterFirst = page.locator('.rounded-lg.bg-zinc-50');
    await expect(englishAfterFirst).toBeVisible();

    // Click continue to advance to second exercise
    await page.getByRole("button", { name: "Continue" }).click();

    // Wait for second exercise to load
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // --- Second Loop ---
    const secondLoopWords: string[] = [];
    
    attempts = 0;
    while (attempts < 20) {
      const continueButton = page.getByRole("button", { name: "Continue" });
      const isComplete = await continueButton.isVisible().catch(() => false);
      if (isComplete) break;

      const input = page.locator('input[type="text"]:focus');
      const count = await input.count();
      if (count > 0) {
        const pinyin = await input.getAttribute("data-pinyin");
        if (pinyin) {
          secondLoopWords.push(pinyin);
          await input.fill(pinyin);
          await page.waitForTimeout(200);
        }
      }
      attempts++;
    }

    // Verify second exercise completion
    expect(secondLoopWords.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();

    // Verify English text is shown for second exercise
    const englishAfterSecond = page.locator('.rounded-lg.bg-zinc-50');
    await expect(englishAfterSecond).toBeVisible();

    // Verify we completed two different exercises (different sets of words)
    // At least some words should be different between the two exercises
    const allFirstWords = firstLoopWords.join(',');
    const allSecondWords = secondLoopWords.join(',');
    
    // The two exercises should not be identical
    // (though they might share some common words like 我)
    const totalUniqueWords = new Set([...firstLoopWords, ...secondLoopWords]);
    expect(totalUniqueWords.size).toBeGreaterThan(Math.max(firstLoopWords.length, secondLoopWords.length));
  });
});

/**
 * Complete the current exercise by reading the expected pinyin from data-pinyin attribute
 */
async function completeExerciseByTypingAnswers(page: any): Promise<string[]> {
  const wordsPracticed: string[] = [];
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    // Check if we're on completion screen
    const continueButton = page.getByRole("button", { name: "Continue" });
    const isVisible = await continueButton.isVisible().catch(() => false);
    if (isVisible) break;

    // Get the focused input and its expected pinyin
    const input = page.locator('input[type="text"]:focus');
    const count = await input.count();

    if (count > 0) {
      const expectedPinyin = await input.getAttribute("data-pinyin");

      if (expectedPinyin) {
        wordsPracticed.push(expectedPinyin);
        await input.fill(expectedPinyin);
        await page.waitForTimeout(200);
      }
    }

    attempts++;
  }

  return wordsPracticed;
}
