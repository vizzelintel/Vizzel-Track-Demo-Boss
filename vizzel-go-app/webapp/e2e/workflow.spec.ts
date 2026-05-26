import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

// Lightweight read-only checks of the major workflow pages so we catch
// regressions where a route or component starts crashing on first paint.

const PAGES: Array<{ path: string; expect: RegExp }> = [
  { path: "/withdrawal", expect: /เบิก|ยืม|withdrawal/i },
  { path: "/withdrawal/dashboard", expect: /ภาพรวม|กำลังยืม|withdrawal/i },
  { path: "/transfer", expect: /โอน|transfer|รับ/i },
  { path: "/repair", expect: /ซ่อม|repair/i },
  { path: "/sales", expect: /จำหน่าย|LOT|sales/i },
  { path: "/approval-queue", expect: /อนุมัติ|approval/i },
  { path: "/users", expect: /ผู้ใช้|users|ทั้งหมด/i },
  { path: "/organization", expect: /องค์กร|organization|สถานที่/i },
  { path: "/settings/roles", expect: /Role|สิทธิ์|Permissions/i },
];

for (const p of PAGES) {
  test(`page loads: ${p.path}`, async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(p.path);
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await expect(page.locator("body")).toContainText(p.expect, { timeout: 25_000 });
  });
}
