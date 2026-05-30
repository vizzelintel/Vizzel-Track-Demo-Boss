import { test, expect } from "@playwright/test";
import { apiToken } from "./_helpers";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SAMPLE_PATH = resolve(__dirname, "../../elaas-sample.xlsx");

test.describe("ELAAS xlsx import", () => {
  test.skip(!existsSync(SAMPLE_PATH), "elaas-sample.xlsx not present");

  test("dry-run parses หลายร้อยแถวจากรายงานทะเบียนสินทรัพย์ อบต.", async ({ request }) => {
    const token = await apiToken(request);
    const buffer = readFileSync(SAMPLE_PATH);
    const res = await request.post("/api/v1/assets/import/elaas", {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "elaas-sample.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer,
        },
        dryRun: "true",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.dry_run).toBe(true);
    expect(body.data_rows).toBeGreaterThan(100);
    // The handler now surfaces the importable-row count via `imported`
    // during dry-run so the existing UI ("ยืนยันนำเข้า {N} รายการ") works
    // without bespoke wiring, plus a dedicated `validRows` field for new
    // consumers.
    expect(body.imported).toBeGreaterThan(100);
    expect(body.validRows).toBeGreaterThan(100);
    expect(body.created).toBe(0);
    expect(body.summary?.categories?.length).toBeGreaterThan(0);
    expect(body.summary?.types?.length).toBeGreaterThan(0);
    expect(Array.isArray(body.sample)).toBe(true);
  });

  test("real import creates assets and surfaces summary", async ({ request }) => {
    const token = await apiToken(request);
    const buffer = readFileSync(SAMPLE_PATH);
    const res = await request.post("/api/v1/assets/import/elaas", {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "elaas-sample.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer,
        },
        dryRun: "false",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.dry_run).toBe(false);
    expect(body.imported).toBeGreaterThan(100);
    expect(body.failed).toBe(0);
  });
});
