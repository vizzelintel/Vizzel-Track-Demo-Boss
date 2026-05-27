"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X, Percent, AlertCircle } from "lucide-react";

export interface AuditKpiData {
  checked: number;
  notChecked: number;
  checkRate: number;
  notFound: number;
}

interface AuditKpiSummaryProps {
  data?: AuditKpiData | null;
}

export function AuditKpiSummary({ data }: AuditKpiSummaryProps) {
  const stats: AuditKpiData = {
    checked: data?.checked ?? 0,
    notChecked: data?.notChecked ?? 0,
    checkRate: data?.checkRate ?? 0,
    notFound: data?.notFound ?? 0,
  };
  const total = stats.checked + stats.notChecked;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            จำนวนสินทรัพย์ที่ตรวจนับแล้ว
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.checked.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            จากทั้งหมด {total.toLocaleString()} รายการ
          </div>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <X className="h-4 w-4" />
            สินทรัพย์ที่ยังไม่ได้ตรวจนับ
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.notChecked.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            ยังต้องดำเนินการตรวจนับ
          </div>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            อัตราการตรวจนับ
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.checkRate.toFixed(1)}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            สินทรัพย์ที่ตรวจนับแล้ว / ทั้งหมด
          </div>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            จำนวนสินทรัพย์ที่ &quot;ยังไม่พบ&quot;
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.notFound.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">ต้องตรวจสอบ</div>
        </CardContent>
      </Card>
    </div>
  );
}
