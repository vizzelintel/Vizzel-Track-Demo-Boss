# Vizzel Track — Go Demo (แบบ A: Go API + React)

แอปเดียว: **Go (chi)** + **React (Vite)** ฝังใน binary — เมนูและหน้าหลักครบตาม production (demo data)

## Live

https://vizzel-track-demo-boss.fly.dev/

| บัญชี | รหัสผ่าน | บทบาท |
|--------|----------|--------|
| admin@demo.local | demo1234 | Admin Org (เมนูครบ) |
| superadmin@demo.local | demo1234 | Super Admin |

## รัน local

```powershell
cd vizzel-go-app
.\scripts\build.ps1
.\server.exe
```

Dev UI: `cd webapp && npm run dev` (proxy `/api` → :8080)

## โมดูลที่ใช้งานได้ (ทุกเมนูใน Sidebar)

- แดชบอร์ด (สรุป KPI)
- จัดการองค์กร / โครงสร้าง / สมาชิก
- สินทรัพย์ (รายการ + โครงสร้าง)
- ตรวจนับ / ซ่อม / เบิก-ยืม / จำหน่าย
- Super Admin (เมนู org, menus)
- โปรไฟล์ / ตั้งค่า

## ขอบเขต vs Production

| Production (Next+Nest) | Demo นี้ |
|------------------------|----------|
| CRUD เต็ม, import Excel, charts | รายการ + seed demo |
| NextAuth refresh, Socket.io | JWT + REST |
| ~46 หน้า shadcn เต็ม | Layout เหมือน + หน้าทุก route |

ต่อยอดให้เหมือน production เป๊ะ = port API/UI ทีละโมดูลจาก `vizzeltrack` (read-only)

## API (`/api/v1/...`)

`health`, `auth/login`, `auth/me`, `assets`, `dashboard/summary`, `users`, `organization/*`, `assets/categories`, `assets/classes`, `audit/ongoing`, `audit/history`, `repairs`, `withdrawals`, `sales`, `menus`, `super-admin/organizations`
