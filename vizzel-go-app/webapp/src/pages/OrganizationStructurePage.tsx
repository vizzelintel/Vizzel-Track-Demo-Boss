import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building, Landmark, Layers, Network, Users } from "lucide-react";
import { toast } from "sonner";
import { EntityCrudPage } from "@/components/data/EntityCrudPage";
import { PageHeader, standardImportExportToolbar } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api";

const tabs = [
  {
    id: "institutes",
    label: "สำนัก",
    list: "/api/v1/organization/institutes",
    kind: "institutes",
    icon: Landmark,
  },
  {
    id: "departments",
    label: "แผนก",
    list: "/api/v1/organization/departments",
    kind: "departments",
    icon: Building,
  },
  {
    id: "sections",
    label: "ฝ่าย",
    list: "/api/v1/organization/sections",
    kind: "sections",
    icon: Layers,
    parent: { label: "แผนก", listEndpoint: "/api/v1/organization/departments" },
  },
  {
    id: "positions",
    label: "ตำแหน่ง",
    list: "/api/v1/organization/positions",
    kind: "positions",
    icon: Users,
  },
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
  const ActiveIcon = active.icon;
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all(
      tabs.map(async (t) => {
        try {
          const res = await apiRequest<{ data?: unknown[] }>(t.list);
          const arr = Array.isArray(res?.data) ? res!.data : [];
          return [t.id, arr.length] as const;
        } catch {
          return [t.id, 0] as const;
        }
      }),
    ).then((pairs) => {
      const next: Record<string, number> = {};
      for (const [id, n] of pairs) next[id] = n;
      setCounts(next);
    });
  }, [activeTab]);

  useEffect(() => {
    if (!isTabId(tabParam)) {
      navigate("/organization-structure?tab=institutes", { replace: true });
    }
  }, [tabParam, navigate]);

  const onTabChange = (value: string) => {
    if (!isTabId(value)) return;
    navigate(`/organization-structure?tab=${value}`, { replace: true });
  };

  const handleTemplate = () => {
    const headers = "ชื่อ\n";
    const blob = new Blob(["\ufeff" + headers], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `org_structure_${active.id}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ดาวน์โหลดเทมเพลตสำเร็จ");
  };

  const handleImport = () => toast.info("ฟีเจอร์นำเข้าโครงสร้างองค์กรอยู่ระหว่างพัฒนา");

  const handleExport = async () => {
    try {
      const res = await apiRequest<{ data?: { id: number; title?: string; name?: string }[] }>(
        active.list,
      );
      const arr = res?.data ?? [];
      const csv =
        "id,name\n" +
        arr
          .map(
            (r) =>
              `${r.id},"${String(r.title ?? r.name ?? "").replace(/"/g, '""')}"`,
          )
          .join("\n");
      const blob = new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `org_${active.id}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ส่งออกข้อมูลสำเร็จ");
    } catch {
      toast.error("ส่งออกข้อมูลไม่สำเร็จ");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="จัดการโครงสร้าง"
        subtitle="บริหารจัดการหน่วยงานภายในองค์กร — สำนัก / แผนก / ฝ่าย / ตำแหน่ง"
        icon={<Network className="h-5 w-5" />}
        toolbar={standardImportExportToolbar({
          onTemplate: handleTemplate,
          onImport: handleImport,
          onExport: handleExport,
          testIdPrefix: "org-structure",
        })}
      />

      <Tabs value={activeTab} onValueChange={onTabChange} className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/50 p-1 sm:grid-cols-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            const c = counts[t.id];
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="w-full gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-testid={`org-structure-tab-${t.id}`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                {typeof c === "number" && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {c}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <EntityCrudPage
          key={active.id}
          title={active.label}
          subtitle={`รายการ ${active.label}ทั้งหมดขององค์กร`}
          icon={<ActiveIcon className="h-4 w-4" />}
          listEndpoint={active.list}
          entityKind={active.kind}
          parentField={"parent" in active ? active.parent : undefined}
          columns={[
            { key: "title", label: "ชื่อ", sortable: true },
            {
              key: "createdAt",
              label: "วันที่สร้าง",
              sortable: true,
              render: (r) =>
                r.createdAt
                  ? new Intl.DateTimeFormat("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(String(r.createdAt)))
                  : "—",
            },
          ]}
          createLabel={`เพิ่ม${active.label}`}
          searchPlaceholder={`ค้นหา${active.label}...`}
        />
      </Tabs>
    </div>
  );
}
