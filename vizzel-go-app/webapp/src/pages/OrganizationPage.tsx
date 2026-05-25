import { EntityCrudPage } from "@/components/data/EntityCrudPage";

export function OrganizationPage() {
  return (
    <div className="space-y-6">
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
  );
}
