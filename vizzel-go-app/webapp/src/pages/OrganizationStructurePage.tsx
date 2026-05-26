import { useEffect, useState } from "react";
import { useSearchParams } from "@/shims/next-navigation";
import { EntityCrudPage } from "@/components/data/EntityCrudPage";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "institutes", label: "สำนัก", list: "/api/v1/organization/institutes", kind: "institutes" },
  { id: "departments", label: "ฝ่าย", list: "/api/v1/organization/departments", kind: "departments" },
  { id: "sections", label: "งาน", list: "/api/v1/organization/sections", kind: "sections", parent: { label: "ฝ่าย", list: "/api/v1/organization/departments" } },
  { id: "positions", label: "ตำแหน่ง", list: "/api/v1/organization/positions", kind: "positions" },
] as const;

const tabIds = tabs.map((t) => t.id);

export function OrganizationStructurePage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam && tabIds.includes(tabParam as (typeof tabs)[number]["id"])
      ? (tabParam as (typeof tabs)[number]["id"])
      : "institutes";
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>(initialTab);

  useEffect(() => {
    if (tabParam && tabIds.includes(tabParam as (typeof tabs)[number]["id"])) {
      setTab(tabParam as (typeof tabs)[number]["id"]);
    }
  }, [tabParam]);
  const active = tabs.find((t) => t.id === tab)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border">
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
        title={`โครงสร้างองค์กร — ${active.label}`}
        listEndpoint={active.list}
        entityKind={active.kind}
        parentField={"parent" in active ? active.parent : undefined}
        columns={[{ key: "title", label: "ชื่อ" }]}
      />
    </div>
  );
}
