# Issue regression tests (runtime UI crashes)

Fixed issues from production smoke on `vizzel-track-demo-boss.fly.dev`:

| ID | Route | Error | Root cause | Fix |
|----|-------|-------|------------|-----|
| ISSUE-1 | `/dashboard/personal` | `toLocaleString` on undefined | API uses `assetValue`; charts use `value`/`count` | `personal-dashboard-normalize.ts`, `safe-format.ts` |
| ISSUE-2 | Logout menu | `c is not a function` | `useLogout()` returns function but callers destructure `{ logout }` | `use-logout.ts` returns `{ logout }` |
| ISSUE-3 | `/organization-structure` | `null.length` | List API `data` null + chart `category` null | `unwrapListRows`, `truncateLabel`, safe `DataTable` rows |
| ISSUE-4 | `/assets/list` | `.get is not a function` | React Router `useSearchParams` is a tuple, not URLSearchParams | `next-navigation.ts` shim |
| ISSUE-5 | `/withdrawal` | `reading 'name'` | User API returns flat `{id,name}` not `{user:{...}}` | `org-user-normalize.ts` |
| ISSUE-6 | `/assets/list` | `reading 'id'` | Filter options map `c.id` when category row null | `asset-normalize.ts`, `toFacetOptions` |
| ISSUE-7 | Login UX | Google button (not in demo scope) | Removed divider + Google CTA | `LoginPage.tsx` |

## Run API regression smoke

From `vizzel-go-app/`:

```powershell
.\scripts\smoke-issue-fixes.ps1
```

Optional env:

- `SMOKE_BASE` — default `https://vizzel-track-demo-boss.fly.dev`
- `SMOKE_EMAIL` / `SMOKE_PASS` — demo credentials

Also run dashboard smoke:

```powershell
.\scripts\smoke-api.ps1
```

## Manual UI checklist

After deploy, hard-refresh and verify:

1. Login — styled card (Tailwind CSS loads)
2. Dashboard — no error boundary
3. รายงานส่วนตัว — charts + table render
4. โครงสร้างองค์กร — table loads (empty OK)
5. รายการสินทรัพย์ — table loads, filters work
6. ระบบเบิก-ยืม — user picker + buildings load
7. ออกจากระบบ — redirects to `/login`
