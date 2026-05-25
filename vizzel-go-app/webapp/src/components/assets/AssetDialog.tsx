import { useEffect, useState } from "react";
import type { Asset, AssetReferenceData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  asset: Asset | null;
  refData: AssetReferenceData | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
};

export function AssetDialog({ open, asset, refData, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    asset_number: "",
    asset_name: "",
    rfid_num: "",
    category_id: "",
    class_id: "",
    building_name: "",
    room_name: "",
    owner_name: "",
    asset_status_name: "ใช้งาน",
    asset_value: "0",
  });

  useEffect(() => {
    if (asset) {
      setForm({
        asset_number: asset.asset_number,
        asset_name: asset.asset_name,
        rfid_num: asset.rfid_num || "",
        category_id: String(asset.category_id || ""),
        class_id: String(asset.class_id || ""),
        building_name: asset.building_name || "",
        room_name: asset.room_name || "",
        owner_name: asset.owner_name || "",
        asset_status_name: asset.asset_status_name || "ใช้งาน",
        asset_value: String(asset.asset_value),
      });
    } else {
      setForm({
        asset_number: "",
        asset_name: "",
        rfid_num: "",
        category_id: "",
        class_id: "",
        building_name: "",
        room_name: "",
        owner_name: "",
        asset_status_name: "ใช้งาน",
        asset_value: "0",
      });
    }
  }, [asset, open]);

  if (!open) return null;

  const cat = refData?.categories.find((c) => String(c.id) === form.category_id);
  const cls = refData?.classes.find((c) => String(c.id) === form.class_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="bg-background max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">{asset ? "แก้ไขสินทรัพย์" : "เพิ่มสินทรัพย์"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["asset_number", "เลขครุภัณฑ์"],
              ["asset_name", "ชื่อสินทรัพย์"],
              ["rfid_num", "RFID"],
              ["owner_name", "ผู้ถือครอง"],
              ["building_name", "อาคาร"],
              ["room_name", "ห้อง"],
              ["asset_value", "มูลค่า"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="text-muted-foreground mb-1 block text-xs">{label}</label>
              <Input
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">หมวด</label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            >
              <option value="">—</option>
              {refData?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">ชนิด</label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={form.class_id}
              onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
            >
              <option value="">—</option>
              {refData?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-muted-foreground mb-1 block text-xs">สถานะ</label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={form.asset_status_name}
              onChange={(e) => setForm((f) => ({ ...f, asset_status_name: e.target.value }))}
            >
              {refData?.statuses.map((s) => (
                <option key={s.id} value={s.title}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            onClick={() =>
              onSave({
                asset_number: form.asset_number,
                asset_name: form.asset_name,
                rfid_num: form.rfid_num,
                category_id: Number(form.category_id) || 0,
                class_id: Number(form.class_id) || 0,
                category_name: cat?.title || "",
                class_name: cls?.title || "",
                building_name: form.building_name,
                room_name: form.room_name,
                owner_name: form.owner_name,
                asset_status_name: form.asset_status_name,
                asset_value: Number(form.asset_value) || 0,
              })
            }
          >
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
