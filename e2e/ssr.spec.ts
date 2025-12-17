import { test, expect } from "@playwright/test";

test.describe("Server-Side Rendering", () => {
  test.use({ javaScriptEnabled: false });

  test("renders page content without JavaScript", async ({ page }) => {
    await page.goto("/");

    // Verify the page title is rendered server-side
    await expect(page).toHaveTitle("Create Next App");

    // Verify main heading is present in the HTML
    await expect(
      page.getByRole("heading", {
        name: "To get started, edit the page.tsx file.",
      })
    ).toBeVisible();

    // Verify links are rendered
    await expect(page.getByRole("link", { name: "Templates" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Learning" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Documentation" })
    ).toBeVisible();

    // Verify images have proper alt text (important for SSR)
    await expect(page.getByAltText("Next.js logo")).toBeVisible();
  });
});
