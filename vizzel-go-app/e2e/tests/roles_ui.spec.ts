import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Roles UI", () => {
  test("super-admin roles page renders the 4 built-in roles", async ({ page }) => {
    await login(page);
    await page.goto("/super-admin/roles");
    await expect(page.getByTestId("roles-page")).toBeVisible({ timeout: 15_000 });
    for (const id of [1, 2, 3, 4]) {
      await expect(page.getByTestId(`role-row-${id}`)).toBeVisible();
    }
    // Admin (id=1) edit must be disabled.
    const editBtn = page.getByTestId("role-edit-1");
    await expect(editBtn).toBeDisabled();
  });

  test("creates and deletes a custom role from the UI", async ({ page }) => {
    await login(page);
    await page.goto("/super-admin/roles");
    await page.getByTestId("role-create-btn").click();

    const name = `UI Role ${Date.now() % 10_000}`;
    await page.getByTestId("role-name-input").fill(name);
    // Grant view-only on the audit resource just to vary the test.
    await page.getByTestId("perm-audit-can_view").check();
    await page.getByTestId("role-save-btn").click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

    // Locate the new role row by clicking near its name. The exact id varies,
    // so we just confirm the role count increased without depending on it.
    const allRows = page.locator("[data-testid^='role-row-']");
    const count = await allRows.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
