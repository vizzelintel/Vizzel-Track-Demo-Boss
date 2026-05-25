# API / UI parity matrix

อัปเดต: **ครบสำหรับ demo production parity** — UI port จาก Next.js + Nest-compat routes ~160+ endpoints

## สรุปภาพรวม

| Module | Production | Go compat | UI |
|--------|------------|-----------|-----|
| Auth | 13 | ✅ login/refresh/register + stubs verify/reset/switch-org | ✅ production login |
| Assets | 63+ | ✅ CRUD/import/export/docs/LOV/repair | ✅ `assets/list` full port |
| Dashboard | 19 | ✅ summary/trend/status/location/personal/repair | ✅ full charts |
| Organization | 12+ | ✅ structure + limits + menu | ✅ structure pages |
| User | 13 | ✅ initial-data/search/org CRUD | ✅ `users/` production port |
| Audit / checkJob | 22 | ✅ jobs/summary/scan/start/stop/export | ✅ ongoing + job scan |
| Withdrawal | 12 | ✅ request/confirm/history/stats | ✅ forms + approval + dashboard |
| Warranty | 3 | ✅ | ✅ reports |
| Facility | 14 | ✅ building/room | ✅ org page |
| Super admin | 20 | ✅ stats/org/menu | ✅ 3 pages |
| Master / LOV | 4+ | ✅ prefix/province/district + getBy/sourceFund | — |
| Live session | 1 | stub count=0 | — |

## Data layer

| Layer | Status |
|-------|--------|
| Migrations 001–011 | ✅ demo + `tab_*` + geo LOV |
| Store `tab_asset` | ✅ CRUD + list filters |
| Store `tab_ops` | ✅ audit/withdrawal/repair |
| Store `tab_structure` | ✅ dept/building/room |
| Sync `010_sync_demo_to_tab` | ✅ on migrate/seed |

## Deploy

- https://vizzel-track-demo-boss.fly.dev/
- Login: `admin@demo.local` / `demo1234`
- Postgres: `DATABASE_URL` / `SUPABASE_DB_URL`
