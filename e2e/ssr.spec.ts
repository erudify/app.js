import { test, expect } from "@playwright/test";

test.describe("Server-Side Rendering", () => {
  test.use({ javaScriptEnabled: false });

  test("renders page content without JavaScript", async ({ page }) => {
    await page.goto("/");

    // Verify the page title is rendered server-side
    await expect(page).toHaveTitle(
      "Erudify - Learn Chinese with Spaced Repetition"
    );

    // Verify main heading is present in the HTML
    await expect(
      page.getByRole("heading", {
        name: /Learn Chinese.*Remember Forever/,
      })
    ).toBeVisible();

    // Verify key sections are rendered
    await expect(
      page.getByRole("heading", { name: "Why Spaced Repetition?" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ready to Start?" })
    ).toBeVisible();

    // Verify CTA links are rendered
    await expect(
      page.getByRole("link", { name: "Start Learning Free" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "How It Works" })
    ).toBeVisible();
  });
});
