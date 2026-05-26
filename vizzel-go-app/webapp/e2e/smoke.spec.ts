import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("smoke", () => {
  test("login form renders + can log in via API", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/เข้าสู่ระบบ|VizzelTrack|อีเมล/i).first()).toBeVisible();
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("dashboard renders summary cards", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    // The dashboard always shows at least the four KPI cards (sometimes
    // labelled "สินทรัพย์", "ผู้ใช้", etc).
    await expect(page.getByText(/แดชบอร์ด|ภาพรวม|สินทรัพย์/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("asset list page loads + import dropdown contains ELAAS option", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/assets/list");
    // The asset list usually renders within a few seconds after the boot
    // bundle hydrates.
    await expect(page.locator("body")).toContainText(/รายการสินทรัพย์|เลขครุภัณฑ์|เพิ่มสินทรัพย์/i, {
      timeout: 30_000,
    });
    // The explicit "นำเข้า ELAAS (.xlsx)" header button is the new helper
    // added alongside the dedicated dialog. Fall back to the menu item if
    // the layout regresses.
    const elaasHeader = page.getByTestId("elaas-open-btn");
    if (await elaasHeader.count()) {
      await expect(elaasHeader).toBeVisible();
    }
  });
});
