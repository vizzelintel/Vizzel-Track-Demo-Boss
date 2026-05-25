# API / UI parity matrix

เป้าหมาย: **หน้าตา production 100%** + API response ใกล้ Nest — schema แยกตาม `schema-map.md`

อ้างอิง production: `vizzeltrack/backend/src/**/*.controller.ts` (~220 endpoints รวม)

## สรุปภาพรวม (ประมาณ)

| Module | Production endpoints | Go `/api/v1` | Go compat (Nest path) | UI page |
|--------|---------------------|--------------|----------------------|---------|
| Auth | 13 | 6 | `/auth/login` | Login (custom) — **ต้อง port หน้า production** |
| Assets | 63+ | 12 | ~15 `/asset/*` | List (custom table) — **ต้อง port `assets/list`** |
| Dashboard | 19 | 3 | ~8 `/dashboard/*` | Dashboard + personal (partial charts) |
| Organization | 12+structure | 6 | 2 stubs | CRUD pages (simplified) |
| User | 13 | 1 list | 1 initial-data | EntityCrud |
| Audit / checkJob | 22 | 3 | 3 | Ongoing + job (simplified) |
| Withdrawal | 12 | 2 | 1 stats | EntityCrud + approval |
| Warranty | 3 | 1 | 2 | Reports (table) |
| Facility | 14 | 1 buildings | 1 | ใน org structure |
| Super admin | 20 | 8 | 1 overview | 3 pages |
| Master / LOV | 4+ | partial seed | — | — |
| Live session / WS | 1+ | — | — | — |
| Files / storage | many | — | — | Documents placeholder |

**Go รวมประมาณ:** ~50 handlers + ~30 compat aliases (ยังไม่ครบ 220)

## Auth

| Route (production) | Go | Status |
|---------------------|-----|--------|
| POST `/auth/login` | ✅ | JWT |
| POST `/auth/register` | ✅ | simplified |
| POST `/auth/refresh` | ✅ | |
| NextAuth session | shim `useSession` | partial |
| Org switch | — | missing |
| 2FA / email verify full | stub | partial |

## Assets (critical path)

| Route | Go | Status |
|-------|-----|--------|
| GET `/asset/initial-data/{org}/{page}/{size}` | ✅ compat | |
| GET `/asset/get/{org}/{page}/{size}` | ✅ | filters partial |
| POST `/asset/create` | ✅ | |
| PATCH `/asset/update/{id}` | ✅ | |
| PATCH `/asset/bulk-delete` | ✅ | |
| POST `/asset/import` | ✅ | |
| POST `/asset/export` | ✅ | |
| Doc upload / images | — | missing |
| Depreciation | — | missing |
| Source fund / getby | — | missing |

## UI parity (production Next → Vite)

| Area | Status |
|------|--------|
| `components/ui/*` (shadcn) | ✅ copied |
| `app-sidebar`, `nav-*`, `ProtectedLayout` | ✅ wired |
| `globals.css` / theme | ✅ (`index.css`) |
| Next shims (link, auth, image, themes) | ✅ |
| Page: `assets/list` (TanStack + toolbar) | ✅ port จาก production (`pages/assets/list/*`) |
| Page: login / register | ❌ ใช้ Card แบบง่าย |
| Breadcrumbs ตาม route production | partial |
| Profile dialog เต็ม | stub |
| Socket / notifications | — |

## ลำดับงานถัดไป (แนะนำ)

1. Port `frontend/app/(protected)/assets/list/*` → `webapp/src/pages/assets/`  
2. Port `frontend/app/login/*`  
3. `006_tab_core.sql` + store ใช้ชื่อ `tab_*`  
4. เติม Nest routes ทีละ controller ตามตารางด้านบน  
5. ลบ `/api/v1` ซ้ำเมื่อ compat ครบ (หรือเก็บเป็น internal)

## Deploy

- Binary แบบ A: `npm run build` → `internal/spa/dist` → `go build`  
- Fly: `vizzel-track-demo-boss.fly.dev`  
- DB: **Postgres only** — `DATABASE_URL` / `SUPABASE_DB_URL` บังคับ
