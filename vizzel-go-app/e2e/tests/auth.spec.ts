import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Login + bootstrap", () => {
  test("admin logs in and lands on dashboard", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("input-email").fill("admin@demo.local");
    await page.getByTestId("input-password").fill("nope-wrong");
    await page.getByTestId("login-button-submit").click();
    await expect(page.getByTestId("login-alert-error")).toBeVisible({ timeout: 15000 });
  });
});
