"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useViewOrg } from "@/context/ViewOrgContext";

export function CentralAssetsPage() {
  const { viewOrgId, viewOrg } = useViewOrg();
  const [assets, setAssets] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!viewOrgId) return;
    setLoading(true);
    apiRequest(`/api/v1/assets?page=1&page_size=50&organization_id=${viewOrgId}`)
      .then((res: { data?: unknown[] }) => setAssets(res?.data ?? []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [viewOrgId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ทรัพย์สินหน่วยงานย่อย</h1>
        <p className="text-muted-foreground text-sm">
          แสดงครุภัณฑ์ขององค์กรที่เลือก — เปลี่ยนองค์กรได้จากเมนูโปรไฟล์
        </p>
      </div>
      {viewOrg && (
        <p className="text-sm font-medium">
          องค์กรที่กำลังดู: <span className="text-primary">{viewOrg.title}</span>
        </p>
      )}
      <ul className="divide-y rounded-lg border text-sm">
        {(assets as {
          asset_number?: string;
          assetNumber?: string;
          asset_name?: string;
          assetName?: string;
          organization_id?: number;
        }[]).map((a, i) => (
          <li key={i} className="p-3">
            {(a.assetNumber ?? a.asset_number) || "—"} — {(a.assetName ?? a.asset_name) || "—"}
            {a.organization_id ? ` (org ${a.organization_id})` : ""}
          </li>
        ))}
        {!loading && assets.length === 0 && (
          <li className="text-muted-foreground p-3">ไม่มีข้อมูลทรัพย์สินสำหรับองค์กรนี้</li>
        )}
        {loading && <li className="text-muted-foreground p-3">กำลังโหลด...</li>}
      </ul>
    </div>
  );
}
