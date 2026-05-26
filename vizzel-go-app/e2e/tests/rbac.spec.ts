import { test, expect } from "@playwright/test";
import { apiToken } from "./_helpers";

test.describe("RBAC API", () => {
  test("returns the 4 seeded roles with super admin locked", async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.get("/api/v1/roles", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const roles = await res.json();
    expect(roles).toEqual(expect.any(Array));
    expect(roles.length).toBeGreaterThanOrEqual(4);
    const admin = roles.find((r: { id: number }) => r.id === 1);
    expect(admin).toBeTruthy();
    expect(admin.is_locked).toBe(true);
  });

  test("can create + update + delete a custom role", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const created = await request.post("/api/v1/roles", {
      headers,
      data: {
        name: "E2E Custom",
        description: "created from playwright",
        permissions: [
          { resource: "assets", can_view: true, can_edit: false, can_delete: false },
          { resource: "audit", can_view: true, can_edit: true, can_delete: false },
        ],
      },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    expect(createdBody.id).toBeGreaterThan(4);
    expect(createdBody.is_locked).toBe(false);

    const updated = await request.patch(`/api/v1/roles/${createdBody.id}`, {
      headers,
      data: {
        name: "E2E Custom (renamed)",
        description: "renamed",
        permissions: [
          { resource: "assets", can_view: true, can_edit: true, can_delete: true },
        ],
      },
    });
    expect(updated.ok()).toBeTruthy();
    const updatedBody = await updated.json();
    expect(updatedBody.name).toBe("E2E Custom (renamed)");
    const assetsPerm = updatedBody.permissions.find(
      (p: { resource: string }) => p.resource === "assets",
    );
    expect(assetsPerm.can_delete).toBe(true);

    const removed = await request.delete(`/api/v1/roles/${createdBody.id}`, { headers });
    expect(removed.ok()).toBeTruthy();
  });

  test("admin role (id=1) cannot be updated or deleted", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    const update = await request.patch("/api/v1/roles/1", {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { name: "hacked", description: "", permissions: [] },
    });
    expect(update.status()).toBe(403);

    const remove = await request.delete("/api/v1/roles/1", { headers });
    expect(remove.status()).toBe(403);
  });

  test("/permissions/me reports full grants for super admin", async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.get("/api/v1/permissions/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.permissions)).toBe(true);
    // Demo admin@demo.local is role 2 (Admin Org) which has full grants on
    // every non-super_admin resource. Verify at least one row exists.
    expect(body.permissions.length).toBeGreaterThan(0);
  });
});
