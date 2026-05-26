import { test, expect } from "@playwright/test";
import { apiToken } from "./_helpers";

test.describe("Disposal LOT + Sales", () => {
  test("can list sales endpoint", async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.get("/api/v1/sales", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body) || Array.isArray(body.data)).toBeTruthy();
  });
});
