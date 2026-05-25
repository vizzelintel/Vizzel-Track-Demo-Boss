import { useState } from "react";
import { EntityCrudPage } from "@/components/data/EntityCrudPage";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "categories", label: "หมวดหมู่", list: "/api/v1/assets/categories", kind: "categories" },
  { id: "types", label: "ประเภท", list: "/api/v1/assets/types", kind: "types", parent: { label: "หมวด", list: "/api/v1/assets/categories" } },
  { id: "classes", label: "กลุ่ม/ชนิด", list: "/api/v1/assets/classes", kind: "classes", parent: { label: "ประเภท", list: "/api/v1/assets/types" } },
] as const;

export function AssetsStructurePage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("categories");
  const active = tabs.find((t) => t.id === tab)!;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <EntityCrudPage
        title={`โครงสร้างสินทรัพย์ — ${active.label}`}
        listEndpoint={active.list}
        entityKind={active.kind}
        parentField={"parent" in active ? active.parent : undefined}
        columns={[{ key: "title", label: "ชื่อ" }, { key: "id", label: "ID" }]}
        createLabel={`เพิ่ม${active.label}`}
      />
    </div>
  );
}
