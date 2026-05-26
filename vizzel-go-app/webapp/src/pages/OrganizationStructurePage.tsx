import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Network } from "lucide-react";
import { EntityCrudPage } from "@/components/data/EntityCrudPage";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  { id: "institutes", label: "สำนัก", list: "/api/v1/organization/institutes", kind: "institutes" },
  { id: "departments", label: "ฝ่าย", list: "/api/v1/organization/departments", kind: "departments" },
  {
    id: "sections",
    label: "งาน",
    list: "/api/v1/organization/sections",
    kind: "sections",
    parent: { label: "ฝ่าย", list: "/api/v1/organization/departments" },
  },
  { id: "positions", label: "ตำแหน่ง", list: "/api/v1/organization/positions", kind: "positions" },
] as const;

type TabId = (typeof tabs)[number]["id"];
const tabIds = tabs.map((t) => t.id);

function isTabId(value: string | null): value is TabId {
  return value !== null && tabIds.includes(value as TabId);
}

export function OrganizationStructurePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get("tab");

  const activeTab: TabId = isTabId(tabParam) ? tabParam : "institutes";
  const active = tabs.find((t) => t.id === activeTab)!;

  useEffect(() => {
    if (!isTabId(tabParam)) {
      navigate("/organization-structure?tab=institutes", { replace: true });
    }
  }, [tabParam, navigate]);

  const onTabChange = (value: string) => {
    if (!isTabId(value)) return;
    navigate(`/organization-structure?tab=${value}`, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">จัดการโครงสร้างองค์กร</h1>
            <p className="text-muted-foreground text-sm">
              สำนัก ฝ่าย งาน และตำแหน่ง — ใช้กำหนดสิทธิ์และสายอนุมัติของสมาชิก
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={onTabChange} className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="flex-none px-4">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <EntityCrudPage
          key={active.id}
          title={active.label}
          listEndpoint={active.list}
          entityKind={active.kind}
          parentField={"parent" in active ? active.parent : undefined}
          columns={[{ key: "title", label: "ชื่อ" }]}
          createLabel={`เพิ่ม${active.label}`}
        />
      </Tabs>
    </div>
  );
}
