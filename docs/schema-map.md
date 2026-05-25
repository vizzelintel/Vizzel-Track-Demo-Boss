# Schema map — Production (MySQL/Prisma) → Go app (Postgres)

อ้างอิง `vizzeltrack/backend/prisma/schema.prisma` — ชื่อตารางจริงคือ `@@map("tab_*")` / `lov_*` / `log_*`

## สถานะ Go / Supabase ปัจจุบัน

| Production table | Prisma model | Go/Postgres (Demo-Boss) | หมายเหตุ |
|------------------|--------------|-------------------------|----------|
| `tab_organization` | TabOrganization | `organizations` | ยังไม่มี branch, limits, soft delete |
| `tab_user` | TabUser | `users` | ยังไม่มี prefix, mobile, image, lastActive |
| `tab_user_organization_role` | TabUserOrganizationRole | — (role ใน JWT claims) | ต้องเพิ่มตาราง |
| `tab_asset` | TabAsset | `assets` | ฟิลด์ย่อยมาก (category, class, owner, address…) |
| `tab_asset_category` | TabAssetCategory | `asset_categories` (002) | |
| `tab_asset_type` | TabAssetType | `asset_types` | |
| `tab_asset_class` | TabAssetClass | `asset_classes` | |
| `tab_asset_status` | TabAssetStatus | ใน reference seed | |
| `tab_asset_doc` | TabAssetDoc | `asset_docs` (005) | |
| `tab_assetClass_doc` | TabAssetClassDoc | `asset_class_docs` (005) | |
| `tab_refresh_token` | TabRefreshToken | `refresh_tokens` (005) | |
| `tab_dept` | TabDept | `departments` (002) | |
| `tab_institute` | TabInstitute | `institutes` | |
| `tab_section` | TabSection | `sections` | |
| `tab_position` | TabPosition | `positions` | |
| `tab_building` | TabBuilding | `buildings` | |
| `tab_room` | TabRoom | `rooms` | |
| `tab_check_job` | TabCheckJob | `audit_jobs` (002) | |
| `tab_asset_repair` | TabAssetRepair | `repairs` | |
| `tab_widthdraw_log` / `tab_withdrawal` | … | `withdrawals` | |
| `tab_asset_sell` | TabAssetSell | `sales` | |
| `tab_organization_menu` | TabOrganizationMenu | `org_menus` | |
| `lov_menu` | LovMenu | `menus` seed | |
| `lov_role` | LovRole | hardcoded roles | |
| `lov_province` … `lov_subdistrict` | Lov* | — | ยังไม่ port |
| `tab_internal_request_withdrawal` | … | stub API | |
| `tab_external_request_withdrawal` | … | — | |
| `tab_approve_withdraw` | … | — | |
| `tab_asset_image` | TabAssetImage | `image_url` บน assets | |
| `tab_asset_address` | TabAssetAddress | — | |
| `tab_asset_owner` | TabAssetOwner | — | |
| `tab_asset_out` / sell / out_doc | … | — | |
| `log_*` / `depreciation_log` | … | — | |
| `tab_system_config` | TabSystemConfig | — | |
| `tab_email_verification` | TabEmailVerification | stub verify route | |
| `tab_password_reset` | TabPasswordReset | stub forgot/reset | |

## ตาราง production ทั้งหมด (50+)

```
tab_room, tab_institute, tab_section, tab_building, tab_organization,
tab_dept, tab_position, tab_user, tab_email_verification, tab_refresh_token,
tab_password_reset, tab_user_organization_role, tab_asset_category,
tab_asset_class, tab_asset_doc, tab_assetClass_doc, tab_asset_type, tab_asset,
tab_asset_repair, tab_asset_image, tab_asset_address, tab_asset_owner,
tab_asset_out, tab_asset_lot_list, tab_asset_sell, tab_asset_sell_doc,
tab_asset_out_doc, tab_asset_status, log_asset_Status, lov_user_organization,
lov_get_by, lov_source_fund, tab_widthdraw_log, lov_province, lov_district,
lov_geography, lov_subdistrict, lov_role, lov_prefix, lov_menu,
tab_organization_menu, tab_check_job, tab_check_job_assign, log_checked_asset,
log_checked_image, log_check_note, tab_checked_result, depreciation_log,
tab_internal_request_withdrawal, tab_external_request_withdrawal,
tab_approve_withdraw, tab_withdrawal, tab_system_config, log_user_login
```

## แผน migration Postgres (แนะนำ)

1. `006_tab_core.sql` — org, user, user_organization_role, lov_role, lov_menu  
2. `007_tab_asset.sql` — asset + category/type/class/status/doc/image/address/owner  
3. `008_tab_org_structure.sql` — institute, dept, section, position, building, room  
4. `009_tab_ops.sql` — check_job, withdrawal, repair, sell, logs  
5. `010_lov_geo.sql` — province, district, subdistrict  

ใช้ชื่อตาราง **`tab_*` เหมือน production** จะได้คิด schema ตรงกับ Prisma โดยไม่ต้องจำ mapping ชื่อใหม่

## Migrations ที่มีแล้วใน repo

| File | เนื้อหา |
|------|---------|
| `001_schema.sql` | organizations, users, assets |
| `002_modules.sql` | modules, audit, org structure, menus |
| `003_assets_enrich.sql` | taxonomy + statuses |
| `004_extended.sql` | repairs, withdrawals, sales |
| `005_production.sql` | refresh_tokens, asset_docs, warranties |
