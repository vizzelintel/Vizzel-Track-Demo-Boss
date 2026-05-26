/**
 * Lightweight unit checks for normalize helpers (no vitest required).
 * Run: node scripts/test-normalize.mjs
 */
import assert from "node:assert/strict";

// Inline copies of critical logic for CI-less runs — keep in sync with TS sources.
function formatLocaleNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function truncateLabel(value, maxLen = 15) {
  const s = value == null ? "" : String(value);
  if (s.length <= maxLen) return s;
  return `${s.substring(0, maxLen)}...`;
}

assert.equal(formatLocaleNumber(undefined), "0");
assert.equal(formatLocaleNumber(1200), (1200).toLocaleString());
assert.equal(truncateLabel(null), "");
assert.equal(truncateLabel("abcdefghijklmnop", 10), "abcdefghij...");

function extractAssetListPayload(raw) {
  if (raw == null) return { data: [], total: 0 };
  if (Array.isArray(raw)) return { data: raw.filter((x) => x != null), total: raw.length };
  if (typeof raw !== "object") return { data: [], total: 0 };
  const r = raw;
  const total = Number(r.total);
  const inner = r.data;
  if (Array.isArray(inner)) {
    return {
      data: inner.filter((x) => x != null),
      total: Number.isFinite(total) ? total : inner.length,
    };
  }
  if (inner != null && typeof inner === "object" && Array.isArray(inner.data)) {
    const rows = inner.data.filter((x) => x != null);
    const nestedTotal = Number(inner.total ?? r.total);
    return {
      data: rows,
      total: Number.isFinite(nestedTotal) ? nestedTotal : rows.length,
    };
  }
  return { data: [], total: 0 };
}

const nested = extractAssetListPayload({
  data: { data: [{ id: 1 }, null], total: 5 },
  total: 5,
});
assert.equal(nested.data.length, 1);
assert.equal(nested.total, 5);

function filterRefRows(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((x) => {
    if (x == null || typeof x !== "object") return false;
    const id = x.id ?? x.ID;
    if (id == null || id === "") return false;
    const n = Number(id);
    return Number.isFinite(n) ? n > 0 : true;
  });
}

function toFacetOptions(items, labelKeys) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const raw of items) {
    if (raw == null || typeof raw !== "object") continue;
    const id = raw.id ?? raw.ID;
    if (id == null || id === "") continue;
    let label = "";
    for (const key of labelKeys) {
      if (raw[key] != null && String(raw[key]).trim()) {
        label = String(raw[key]);
        break;
      }
    }
    if (!label) label = String(raw.title ?? raw.name ?? id);
    out.push({ label, value: String(id) });
  }
  return out;
}

assert.deepEqual(filterRefRows([{ id: 1 }, null, {}, { id: 0 }]), [{ id: 1 }]);
assert.deepEqual(
  toFacetOptions([null, { id: 2, categoryName: "IT" }], ["categoryName"]),
  [{ label: "IT", value: "2" }],
);

function hasBootstrapRows(initialData) {
  return (
    (initialData?.total ?? 0) > 0 || (initialData?.data?.length ?? 0) > 0
  );
}

assert.equal(hasBootstrapRows(undefined), false);
assert.equal(hasBootstrapRows({ data: [], total: 0 }), false);
assert.equal(hasBootstrapRows({ data: [], total: 3 }), true);
assert.equal(hasBootstrapRows({ data: [{ id: 1 }], total: 0 }), true);

function normalizeOrgUserRow(raw) {
  if (raw == null || typeof raw !== "object") return null;
  const row = raw;
  const nested = row.user;
  if (nested != null && typeof nested === "object") {
    const id = Number(nested.id ?? row.id);
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
      user: {
        id,
        name: String(nested.name ?? ""),
        surname: String(nested.surname ?? ""),
        username: String(nested.username ?? nested.email ?? ""),
      },
    };
  }
  const id = Number(row.id ?? row.ID);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    user: {
      id,
      name: String(row.name ?? ""),
      surname: String(row.surname ?? ""),
      username: String(row.username ?? row.email ?? ""),
    },
  };
}

function normalizeOrgUserRows(items) {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeOrgUserRow).filter((u) => u != null);
}

assert.deepEqual(normalizeOrgUserRows(null), []);
assert.deepEqual(
  normalizeOrgUserRows([
    null,
    { id: 0 },
    { user: { id: 5, name: "A", email: "a@x.com" } },
    { id: 7, name: "B", email: "b@x.com" },
  ]),
  [
    { user: { id: 5, name: "A", surname: "", username: "a@x.com" } },
    { user: { id: 7, name: "B", surname: "", username: "b@x.com" } },
  ],
);

console.log("OK: normalize helper checks passed");
