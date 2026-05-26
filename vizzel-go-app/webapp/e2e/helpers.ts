import { expect, type Page } from "@playwright/test";

export const DEMO_EMAIL = process.env.DEMO_EMAIL || "admin@demo.local";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";

// loginAsAdmin handles the JSON login + token bootstrap so each test starts on
// the dashboard without sitting through the login form. We hit the API
// directly (the same endpoint LoginPage uses) and persist the access token
// into localStorage so that the SPA's auth context picks it up.
export async function loginAsAdmin(page: Page) {
  const baseURL = page.context()._options.baseURL ?? "";
  const res = await page.request.post(`${baseURL}/api/v1/auth/login`, {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  expect(res.ok(), `login ${res.status()}: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  await page.goto("/login");
  await page.evaluate(([token]) => {
    localStorage.setItem("vizzel_access_token", token as string);
  }, [body.access_token]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
}

// waitForToast polls for a toast message containing the given text. Useful
// because Sonner mounts toasts into a portal that may animate in.
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole("status").or(page.locator("li[data-sonner-toast]"))
    .filter({ hasText: text }))
    .toBeVisible({ timeout: 10_000 });
}
