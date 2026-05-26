import { test, expect } from "@playwright/test";
import { apiToken } from "./_helpers";

test.describe("Audit (ตรวจนับ)", () => {
  test("can create + list audit jobs", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const created = await request.post("/api/v1/entities/audit-jobs", {
      headers,
      data: { name: "งานตรวจนับ E2E", parent_id: 0 },
    });
    expect(created.ok()).toBeTruthy();

    const ongoing = await request.get("/api/v1/audit/ongoing", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(ongoing.ok()).toBeTruthy();
    const rows = await ongoing.json();
    const list = Array.isArray(rows) ? rows : rows.data ?? [];
    expect(list.length).toBeGreaterThan(0);
    expect(list.find((r: { title: string }) => r.title.includes("E2E"))).toBeTruthy();
  });

  test("RFID scan resolve endpoint responds with structured result", async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.post("/api/v1/assets/scan/resolve", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { rfids: ["RFID-DEMO-NOT-EXIST"] },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("unmatched");
    expect(Array.isArray(body.unmatched)).toBeTruthy();
    expect(body.unmatched.length).toBeGreaterThan(0);
  });
});
