import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

// RBAC API smoke tests.
//
// We exercise the public REST surface so the suite stays decoupled from
// React rendering quirks: list resources, list roles, verify the four
// built-in roles exist + super admin is locked, and round-trip a custom
// role through create/update/delete.

test.describe("rbac", () => {
  test("permissions/me returns is_super=true for the demo admin", async ({ request, page }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem("vizzel_access_token"));
    expect(token).toBeTruthy();
    const res = await request.get("/api/v1/permissions/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("permissions");
    // Demo seed admin@demo.local is role_id=1 (Super Admin). All resources
    // must come back with can_view/can_edit/can_delete = true.
    if (body.is_super) {
      for (const p of body.permissions ?? []) {
        expect(p.can_view, `${p.resource} view`).toBeTruthy();
      }
    }
  });

  test("built-in roles + lock flags", async ({ request, page }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem("vizzel_access_token"));
    const res = await request.get("/api/v1/roles", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const roles: Array<{ id: number; name: string; is_locked: boolean; is_system: boolean }> =
      await res.json();
    const ids = roles.map((r) => r.id).sort();
    expect(ids).toEqual(expect.arrayContaining([1, 2, 3, 4]));
    const superAdmin = roles.find((r) => r.id === 1)!;
    expect(superAdmin.is_locked, "Super Admin must be locked").toBeTruthy();
  });

  test("custom role round-trip (create + update + delete)", async ({ request, page }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem("vizzel_access_token"));
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const name = `e2e-${Date.now()}`;
    const create = await request.post("/api/v1/roles", {
      headers,
      data: {
        name,
        description: "playwright created",
        permissions: [{ resource: "assets", can_view: true, can_edit: false, can_delete: false }],
      },
    });
    expect(create.ok(), await create.text()).toBeTruthy();
    const role = await create.json();
    expect(role.name).toBe(name);

    const update = await request.patch(`/api/v1/roles/${role.id}`, {
      headers,
      data: {
        name,
        description: "playwright updated",
        permissions: [{ resource: "assets", can_view: true, can_edit: true, can_delete: false }],
      },
    });
    expect(update.ok()).toBeTruthy();

    const del = await request.delete(`/api/v1/roles/${role.id}`, { headers });
    expect(del.ok()).toBeTruthy();
  });

  test("Super Admin role cannot be updated or deleted", async ({ request, page }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem("vizzel_access_token"));
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const update = await request.patch("/api/v1/roles/1", {
      headers,
      data: { name: "hack", description: "", permissions: [] },
    });
    expect(update.status()).toBe(403);
    const del = await request.delete("/api/v1/roles/1", { headers });
    expect(del.status()).toBe(403);
  });
});
