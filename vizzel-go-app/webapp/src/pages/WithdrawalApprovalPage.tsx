import { apiRequest } from "@/lib/api";
import { EntityCrudPage } from "@/components/data/EntityCrudPage";
import { Button } from "@/components/ui/button";
import type { ListRow } from "@/lib/api";

export function WithdrawalApprovalPage() {
  return (
    <EntityCrudPage
      title="อนุมัติการเบิก-ยืม"
      listEndpoint="/api/v1/withdrawals?status=pending"
      columns={[
        { key: "title", label: "ผู้ขอ", render: (r) => r.title },
        { key: "subtitle", label: "รายการ", render: (r) => r.subtitle },
        { key: "status", label: "สถานะ" },
        {
          key: "id",
          label: "ดำเนินการ",
          render: (r) => (
            <div className="flex gap-1">
              <Button
                className="h-7 px-2 text-xs"
                onClick={async () => {
                  await apiRequest(`/api/v1/withdrawals/${r.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "approved" }),
                  });
                  window.location.reload();
                }}
              >
                อนุมัติ
              </Button>
              <Button
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={async () => {
                  await apiRequest(`/api/v1/withdrawals/${r.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "rejected" }),
                  });
                  window.location.reload();
                }}
              >
                ปฏิเสธ
              </Button>
            </div>
          ),
        },
      ]}
    />
  );
}
