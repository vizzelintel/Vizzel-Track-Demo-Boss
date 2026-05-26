"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { listChildOrganizations } from "@/lib/transfer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function CentralAssetsPage() {
  const { user } = useUser();
  const orgID = user?.organizationRelation?.organizationID;
  const [includeChildren, setIncludeChildren] = useState(false);
  const [children, setChildren] = useState<{ id: number; title: string }[]>([]);
  const [assets, setAssets] = useState<unknown[]>([]);

  useEffect(() => {
    listChildOrganizations().then(setChildren).catch(() => setChildren([]));
  }, []);

  useEffect(() => {
    if (!orgID) return;
    const q = includeChildren ? "&include_children=1" : "";
    apiRequest(`/api/v1/assets?page=1&page_size=50${q}`)
      .then((res: { data?: unknown[] }) => setAssets(res?.data ?? []))
      .catch(() => setAssets([]));
  }, [orgID, includeChildren]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ทรัพย์สินรวม (หน่วยงานย่อย)</h1>
        <p className="text-muted-foreground text-sm">
          ดูครุภัณฑ์ของหน่วยงานลูกที่ผูก parent_organization_id
        </p>
      </div>
      {children.length > 0 && (
        <p className="text-sm">
          หน่วยงานย่อย: {children.map((c) => c.title || c.id).join(", ")}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Switch id="inc" checked={includeChildren} onCheckedChange={setIncludeChildren} />
        <Label htmlFor="inc">รวมทรัพย์สินหน่วยงานย่อย</Label>
      </div>
      <ul className="divide-y rounded-lg border text-sm">
        {(assets as { asset_number?: string; assetNumber?: string; asset_name?: string; assetName?: string; organization_id?: number }[]).map(
          (a, i) => (
            <li key={i} className="p-3">
              {(a.assetNumber ?? a.asset_number) || "—"} — {(a.assetName ?? a.asset_name) || "—"}
              {a.organization_id ? ` (org ${a.organization_id})` : ""}
            </li>
          ),
        )}
        {assets.length === 0 && (
          <li className="text-muted-foreground p-3">ไม่มีข้อมูล — เปิดสวิตช์หรือตั้ง parent org ใน migration 016</li>
        )}
      </ul>
    </div>
  );
}
