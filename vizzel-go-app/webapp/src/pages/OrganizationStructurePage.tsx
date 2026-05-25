import { ModuleListPage } from "./ModuleListPage";

export function OrganizationStructurePage() {
  return (
    <div className="space-y-6">
      <ModuleListPage
        title="ฝ่าย / แผนก"
        endpoint="/api/v1/organization/departments"
        columns={[
          { key: "title", label: "ชื่อฝ่าย" },
          { key: "id", label: "ID" },
        ]}
      />
      <ModuleListPage
        title="อาคาร"
        endpoint="/api/v1/organization/buildings"
        columns={[
          { key: "title", label: "ชื่ออาคาร" },
          { key: "id", label: "ID" },
        ]}
      />
      <ModuleListPage
        title="ห้อง"
        endpoint="/api/v1/organization/rooms"
        columns={[
          { key: "title", label: "ชื่อห้อง" },
          { key: "subtitle", label: "เลขห้อง" },
        ]}
      />
    </div>
  );
}
