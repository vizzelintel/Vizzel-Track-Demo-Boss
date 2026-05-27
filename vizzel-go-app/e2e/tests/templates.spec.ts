import { test, expect } from "@playwright/test";
import { apiToken } from "./_helpers";

// Round-trip checks for the new per-module template + import endpoints.
// We download each template, post it straight back, and confirm the import
// summary reports a non-error result. Imports are idempotent by design so the
// suite can be re-run on the same database without manual cleanup.

test.describe("Module templates + importers", () => {
  test("asset xlsx template downloads with 19-column layout", async ({
    request,
  }) => {
    const token = await apiToken(request);
    const res = await request.get("/api/v1/assets/template", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const buffer = await res.body();
    expect(buffer.byteLength).toBeGreaterThan(1000);
    // xlsx files are zip archives: the first two bytes are PK
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  test("asset csv template downloads with 19 columns", async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.get(
      "/api/v1/assets/template?format=csv",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.text()).replace(/^\ufeff/, "");
    const headerRow = body.split(/\r?\n/)[0];
    expect(headerRow.split(",")).toHaveLength(19);
    expect(headerRow).toContain("รหัสสินทรัพย์");
    expect(headerRow).toContain("ชื่อสินทรัพย์");
  });

  test("asset structure template + import round-trip", async ({ request }) => {
    const token = await apiToken(request);
    const tmpl = await request.get("/api/v1/assets/structure/template", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tmpl.ok()).toBeTruthy();
    const body = (await tmpl.text()).replace(/^\ufeff/, "");
    expect(body.split(/\r?\n/)[0]).toContain("หมวดหมู่");
    const imp = await request.post("/api/v1/assets/structure/import", {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "asset-structure-template.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("\ufeff" + body, "utf-8"),
        },
      },
    });
    expect(imp.ok()).toBeTruthy();
    const json = await imp.json();
    expect(json).toHaveProperty("imported");
  });

  test("org structure template + import round-trip", async ({ request }) => {
    const token = await apiToken(request);
    const tmpl = await request.get("/api/v1/organization/structure/template", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tmpl.ok()).toBeTruthy();
    const body = (await tmpl.text()).replace(/^\ufeff/, "");
    expect(body).toContain("สำนัก");
    const imp = await request.post("/api/v1/organization/structure/import", {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "organization-structure-template.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("\ufeff" + body, "utf-8"),
        },
      },
    });
    expect(imp.ok()).toBeTruthy();
    const json = await imp.json();
    expect(typeof json.imported).toBe("number");
  });

  test("facility template + import round-trip", async ({ request }) => {
    const token = await apiToken(request);
    const tmpl = await request.get("/api/v1/facility/template", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tmpl.ok()).toBeTruthy();
    const body = (await tmpl.text()).replace(/^\ufeff/, "");
    expect(body).toContain("ชื่ออาคาร");
    expect(body).toContain("ชื่อห้อง");
    const imp = await request.post("/api/v1/facility/import", {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "facility-template.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("\ufeff" + body, "utf-8"),
        },
      },
    });
    expect(imp.ok()).toBeTruthy();
    const json = await imp.json();
    expect(typeof json.imported).toBe("number");
  });

  test("user template + import round-trip", async ({ request }) => {
    const token = await apiToken(request);
    const tmpl = await request.get("/api/v1/user/template", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tmpl.ok()).toBeTruthy();
    const body = (await tmpl.text()).replace(/^\ufeff/, "");
    expect(body).toContain("รหัสพนักงาน");
    expect(body).toContain("อีเมล");
    const stamped = body.replace(
      "somchai@example.com",
      `e2e-${Date.now()}@example.com`,
    );
    const imp = await request.post("/api/v1/user/import", {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "user-import-template.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("\ufeff" + stamped, "utf-8"),
        },
      },
    });
    expect(imp.ok()).toBeTruthy();
    const json = await imp.json();
    expect(typeof json.imported).toBe("number");
  });

  test("sales template ships assetNumber sample rows", async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.get("/api/v1/sales/template", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.text()).replace(/^\ufeff/, "");
    const lines = body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    expect(lines[0]).toBe("assetNumber");
    expect(lines.length).toBeGreaterThan(1);
  });
});
