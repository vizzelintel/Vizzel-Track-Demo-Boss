import { useEffect, useState } from "react";
import { Layers, Network, ShapesIcon } from "lucide-react";
import { toast } from "sonner";
import { EntityCrudPage } from "@/components/data/EntityCrudPage";
import { PageHeader, standardImportExportToolbar } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiDownload, apiRequest } from "@/lib/api";

const tabs = [
  {
    id: "categories",
    label: "หมวดหมู่",
    list: "/api/v1/assets/categories",
    kind: "categories",
    icon: Layers,
  },
  {
    id: "types",
    label: "ประเภท",
    list: "/api/v1/assets/types",
    kind: "types",
    icon: ShapesIcon,
    parent: { label: "หมวด", listEndpoint: "/api/v1/assets/categories" },
  },
  {
    id: "classes",
    label: "กลุ่ม/ชนิด",
    list: "/api/v1/assets/classes",
    kind: "classes",
    icon: Network,
    parent: { label: "ประเภท", listEndpoint: "/api/v1/assets/types" },
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AssetsStructurePage() {
  const [tab, setTab] = useState<TabId>("categories");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const active = tabs.find((t) => t.id === tab)!;
  const Icon = active.icon;

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
  }, []);

  const handleTemplate = () => {
    const headers = "ชื่อ,หมวดหมู่หลัก\n";
    const blob = new Blob(["\ufeff" + headers], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asset_structure_template_${active.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ดาวน์โหลดเทมเพลตสำเร็จ");
  };

  const handleImport = () => toast.info("ฟีเจอร์นำเข้าโครงสร้างสินทรัพย์อยู่ระหว่างพัฒนา");

  const handleExport = async () => {
    try {
      const res = await apiRequest<{ data?: { id: number; title: string }[] }>(
        active.list,
      );
      const arr = res?.data ?? [];
      const csv =
        "id,name\n" +
        arr.map((r) => `${r.id},"${String(r.title).replace(/"/g, '""')}"`).join("\n");
      const blob = new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asset_${active.id}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ส่งออกข้อมูลสำเร็จ");
    } catch {
      toast.error("ส่งออกข้อมูลไม่สำเร็จ");
      void apiDownload;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="โครงสร้างสินทรัพย์"
        subtitle="จัดการหมวดหมู่ / ประเภท / กลุ่มของครุภัณฑ์ในระบบ"
        icon={<Network className="h-5 w-5" />}
        toolbar={standardImportExportToolbar({
          onTemplate: handleTemplate,
          onImport: handleImport,
          onExport: handleExport,
          testIdPrefix: "assets-structure",
        })}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="gap-3">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/50 p-1">
          {tabs.map((t) => {
            const TabIcon = t.icon;
            const c = counts[t.id];
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="w-full gap-2 px-3 py-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-testid={`assets-structure-tab-${t.id}`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
                {typeof c === "number" && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 data-[state=active]:bg-primary/10">
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
          subtitle={`รายการ ${active.label} ที่ใช้ในการจัดหมวดหมู่สินทรัพย์`}
          icon={<Icon className="h-4 w-4" />}
          listEndpoint={active.list}
          entityKind={active.kind}
          parentField={"parent" in active ? active.parent : undefined}
          columns={[
            { key: "title", label: "ชื่อ", sortable: true },
            {
              key: "assetCount",
              label: "จำนวนสินทรัพย์",
              sortable: true,
              render: (r) => (
                <span className="font-medium tabular-nums">
                  {r.assetCount != null ? Number(r.assetCount) : 0}
                </span>
              ),
            },
            {
              key: "createdAt",
              label: "วันที่สร้าง",
              sortable: true,
              render: (r) => {
                if (!r.createdAt) return "—";
                return new Intl.DateTimeFormat("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }).format(new Date(String(r.createdAt)));
              },
            },
          ]}
          createLabel={`เพิ่ม${active.label}`}
          searchPlaceholder={`ค้นหา${active.label}...`}
        />
      </Tabs>
    </div>
  );
}
