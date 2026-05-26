import { test, expect } from "@playwright/test";
import { apiToken } from "./_helpers";

test.describe("SuperAdmin endpoints", () => {
  test("stats + org list + permissions APIs respond", async ({ request }) => {
    // SuperAdminStats handler is restricted to role_id = 1. Use the
    // pre-seeded superadmin@demo.local user instead of admin@demo.local.
    const token = await apiToken(request, "superadmin@demo.local");
    const headers = { Authorization: `Bearer ${token}` };

    const stats = await request.get("/api/v1/super-admin/stats", { headers });
    expect(stats.ok()).toBeTruthy();

    const orgs = await request.get("/api/v1/super-admin/organizations", { headers });
    expect(orgs.ok()).toBeTruthy();
    const orgsBody = await orgs.json();
    const orgRows = Array.isArray(orgsBody) ? orgsBody : orgsBody.data ?? [];
    expect(orgRows.length).toBeGreaterThan(0);

    const access = await request.get("/api/v1/super-admin/org-access", { headers });
    expect(access.ok()).toBeTruthy();

    const resources = await request.get("/api/v1/permissions/resources", { headers });
    expect(resources.ok()).toBeTruthy();
    const resList = await resources.json();
    expect(resList.length).toBeGreaterThanOrEqual(10);
  });
});
