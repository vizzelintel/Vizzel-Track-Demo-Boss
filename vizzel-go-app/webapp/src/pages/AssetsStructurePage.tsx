import { ModuleListPage } from "./ModuleListPage";

export function AssetsStructurePage() {
  return (
    <div className="space-y-6">
      <ModuleListPage
        title="หมวดสินทรัพย์"
        endpoint="/api/v1/assets/categories"
        columns={[
          { key: "title", label: "ชื่อหมวด" },
          { key: "id", label: "ID" },
        ]}
      />
      <ModuleListPage
        title="คลาสสินทรัพย์"
        endpoint="/api/v1/assets/classes"
        columns={[
          { key: "title", label: "ชื่อคลาส" },
          { key: "id", label: "ID" },
        ]}
      />
    </div>
  );
}
