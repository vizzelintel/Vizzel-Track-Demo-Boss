# Vizzel Track — Go Demo (แบบ A: Go API + React)

แอปเดียว: **Go (chi)** ให้ REST API + เสิร์ฟ **React (Vite)** ฝังใน binary — เป้าหมาย UI/UX ใกล้เคียง Vizzel Track production (Next.js) ทีละ phase

## รัน local

```powershell
cd vizzel-go-app
.\scripts\build.ps1
.\server.exe
```

หรือ dev แยก UI:

```powershell
# Terminal 1 — API
go run ./cmd/server

# Terminal 2 — UI hot reload (proxy /api → :8080)
cd webapp
npm install
npm run dev
```

เปิด http://localhost:8080 (หรือ http://localhost:5173 ตอน dev)

| Login | `admin@demo.local` / `demo1234` |

## Phase 1 (ปัจจุบัน)

- หน้า Login สไตล์ production
- Layout + Sidebar เมนูหลัก (แดชบอร์ด, org, assets, audit, …)
- **ใช้งานได้:** Dashboard, รายการสินทรัพย์ (`/assets/list`)
- หน้าอื่น: placeholder (Phase 2+)

## API

| Method | Path |
|--------|------|
| GET | `/api/v1/health` |
| POST | `/api/v1/auth/login` |
| GET | `/api/v1/auth/me` |
| GET | `/api/v1/assets` |

## Supabase / Fly

ดู `.env.example` สำหรับ `SUPABASE_DB_URL` + `JWT_SECRET`

```powershell
fly deploy -a vizzel-track-demo-boss
```

Live: https://vizzel-track-demo-boss.fly.dev/

## โครงสร้าง

```text
cmd/server/           Go entry
internal/api/         handlers
internal/spa/dist/    React build output (embed)
webapp/               React + Vite source
supabase/migrations/
```
