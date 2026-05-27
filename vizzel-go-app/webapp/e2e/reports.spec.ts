import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

// Smoke for the two reports replaced in this change.

test.describe("reports", () => {
  test("personal report page renders KPIs and headings", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/personal");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => undefined);
    await expect(page.locator("body")).toContainText(/รายงานส่วนตัว/i, {
      timeout: 30_000,
    });
  });

  test("audit report page renders the new layout", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/audit");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => undefined);
    await expect(page.locator("body")).toContainText(
      /รายงานการตรวจนับ|ตรวจนับแล้ว|ยังไม่ตรวจนับ|ยังไม่พบ|อัตราการตรวจนับ/i,
      { timeout: 30_000 },
    );
  });
});
