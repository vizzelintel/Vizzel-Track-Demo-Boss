# Vizzel Track — Go + React (Production Replacement)

## เป้าหมาย

แทน `vizzeltrack` (Next.js + NestJS + MySQL) ด้วย:

- **Backend:** Go (`apps/server` → ปัจจุบัน `vizzel-go-app/`)
- **Frontend:** React + Vite SPA ฝังใน binary (**แบบ A**)
- **Database:** **Postgres only** (Supabase / self-hosted)
- **UI/UX:** เหมือน production **100%** (port จาก `vizzeltrack/frontend`)

## Monorepo (เป้าหมาย)

```text
vizzel-track/
├── apps/
│   ├── server/          # Go API + embed SPA
│   └── web/             # Vite React (source)
├── packages/
│   ├── ui/              # (อนาคต) แชร์ components
│   └── api-client/      # (อนาคต) OpenAPI client
├── migrations/          # Postgres SQL
├── docs/
│   ├── parity-matrix.md   # ✅
│   └── schema-map.md      # ✅
└── deploy/
```

**สถานะปัจจุบัน:** โค้ดอยู่ที่ `vizzel-go-app/` — ย้ายเป็น `apps/*` ในรอบถัดไป

## หลักการพัฒนา

1. **UI ก่อน** — port `components/ui`, layout, sidebar จาก production → คุณเห็นหน้าตาเดิมก่อน schema/API ครบ
2. **Schema อ้างอิง** — ตาราง `tab_*` ตาม Prisma (`docs/schema-map.md`)
3. **API ทีละ module** — เทียบ response กับ Nest
4. **Postgres only** — ไม่ seed SQLite ใน production (`DATABASE_URL` / `SUPABASE_DB_URL` บังคับ)

## Dev

```bash
# Terminal 1
cd vizzel-go-app && go run ./cmd/server   # ต้องมี SUPABASE_DB_URL

# Terminal 2
cd vizzel-go-app/webapp && npm run dev    # :5173 → proxy API
```

## Deploy

```bash
cd vizzel-go-app && fly deploy
```
