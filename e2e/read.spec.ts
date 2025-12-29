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
