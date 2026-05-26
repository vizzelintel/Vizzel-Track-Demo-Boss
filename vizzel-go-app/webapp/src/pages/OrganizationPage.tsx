import { Building2 } from "lucide-react";
import { EntityCrudPage } from "@/components/data/EntityCrudPage";
import { Separator } from "@/components/ui/separator";

export function OrganizationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ข้อมูลองค์กรและสถานที่</h1>
            <p className="text-muted-foreground text-sm">
              จัดการอาคารและห้องภายในองค์กร — ใช้กำหนดสถานที่ติดตั้งครุภัณฑ์
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-1">
        <EntityCrudPage
          title="อาคาร"
          listEndpoint="/api/v1/organization/buildings"
          entityKind="buildings"
          columns={[{ key: "title", label: "ชื่ออาคาร" }]}
          createLabel="เพิ่มอาคาร"
        />
        <EntityCrudPage
          title="ห้อง"
          listEndpoint="/api/v1/organization/rooms"
          entityKind="rooms"
          parentField={{ label: "อาคาร", listEndpoint: "/api/v1/organization/buildings" }}
          columns={[
            { key: "title", label: "ชื่อห้อง" },
            { key: "subtitle", label: "เลขห้อง" },
          ]}
          createLabel="เพิ่มห้อง"
        />
      </div>
    </div>
  );
}
