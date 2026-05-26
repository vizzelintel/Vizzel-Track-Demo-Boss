import { expect, type Page } from "@playwright/test";

export async function login(
  page: Page,
  email = "admin@demo.local",
  password = "demo1234",
) {
  await page.goto("/login");
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("login-button-submit").click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function apiToken(
  request: Page["request"] | { post: Function },
  email = "admin@demo.local",
  password = "demo1234",
): Promise<string> {
  // @ts-expect-error - request shape comes from Playwright fixtures
  const res = await request.post("/api/v1/auth/login", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.access_token as string;
}
