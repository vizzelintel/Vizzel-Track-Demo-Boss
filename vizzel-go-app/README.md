# Vizzel Track — Go Demo

แอปเดียว (Go + chi) ให้ API และ UI ฝังใน binary — อ้างอิง domain จาก Vizzel Track production (NestJS + Next.js) แบบย่อสำหรับ public demo

## รัน local (SQLite)

```powershell
cd vizzel-go-app
go mod tidy
go run ./cmd/server
```

เปิด http://localhost:8080

| รายการ | ค่า |
|--------|-----|
| Login | `admin@demo.local` / `demo1234` |
| DB | `vizzel_demo.db` (สร้างอัตโนมัติ + seed ~200 assets) |

## API

| Method | Path | หมายเหตุ |
|--------|------|----------|
| GET | `/api/v1/health` | สถานะ + driver DB |
| POST | `/api/v1/auth/login` | `{ "email", "password" }` → JWT |
| GET | `/api/v1/assets` | Bearer token, `?limit=20&cursor=` |

## Supabase (Postgres)

ตั้งค่า environment แล้วรัน server (หรือ deploy Fly):

```text
SUPABASE_DB_URL=postgresql://...@...pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=<random-secret>
```

รัน migration บน Supabase SQL editor หรือ CLI:

```text
supabase/migrations/001_schema.sql
```

Server จะ seed org/user/assets เมื่อตารางว่าง (เหมือน SQLite)

## Fly.io

```powershell
cd vizzel-go-app
fly auth login
fly apps create vizzel-track-demo-boss   # ครั้งแรก
fly secrets set JWT_SECRET=... SUPABASE_DB_URL=...
fly deploy
```

## โครงสร้าง

```text
cmd/server/          entrypoint
internal/api/        handlers + JWT middleware
internal/auth/       JWT helpers
internal/config/     env
internal/server/     chi router
internal/store/      sqlite | postgres
webassets/web/       static UI
supabase/migrations/ Postgres schema
```
