import { Link } from "react-router-dom";
import { EntityCrudPage } from "@/components/data/EntityCrudPage";
import { Button } from "@/components/ui/Button";
import type { ListRow } from "@/lib/api";

export function AuditOngoingPage() {
  return (
    <EntityCrudPage
      title="การตรวจนับ (กำลังดำเนินการ)"
      listEndpoint="/api/v1/audit/ongoing"
      entityKind="audit-jobs"
      columns={[
        { key: "title", label: "งาน" },
        { key: "status", label: "สถานะ" },
        { key: "value", label: "ความคืบหน้า %", render: (r) => `${r.value ?? 0}%` },
        {
          key: "id",
          label: "",
          render: (r) => (
            <Link to={`/audit/ongoing/${r.id}`}>
              <Button variant="outline" className="h-7 px-2 text-xs">
                เปิดงาน
              </Button>
            </Link>
          ),
        },
      ]}
      createLabel="สร้างงานตรวจนับ"
    />
  );
}
