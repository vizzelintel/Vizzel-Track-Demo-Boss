"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function WithdrawalVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ data: Record<string, string> }>(`/withdrawal/verify/${token}`)
      .then((r) => setData(r?.data ?? null))
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-destructive">ไม่พบรายการ หรือโทเคนไม่ถูกต้อง</p>
      </div>
    );
  }

  if (!data) {
    return <p className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</p>;
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-xl font-bold">ใบยืมครุภัณฑ์ (QR)</h1>
      <Badge>{data.status}</Badge>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">ผู้ยืม</dt>
          <dd className="font-medium">{data.requesterName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">รายการ</dt>
          <dd>{data.itemName}</dd>
        </div>
        {data.assetNumber && (
          <div>
            <dt className="text-muted-foreground">เลขครุภัณฑ์</dt>
            <dd>{data.assetNumber}</dd>
          </div>
        )}
        {data.dueDate && (
          <div>
            <dt className="text-muted-foreground">กำหนดคืน</dt>
            <dd>{data.dueDate}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
