"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, Banknote, Wrench, CheckCircle2 } from "lucide-react";

interface PersonalKpiCardsProps {
  data?: {
    totalAssets: number;
    totalValue: number;
    pendingRepairs: number;
    activeAssets: number;
  } | null;
}

export function PersonalKpiCards({ data }: PersonalKpiCardsProps) {
  const totalAssets = data?.totalAssets ?? 0;
  const totalValue = data?.totalValue ?? 0;
  const pendingRepairs = data?.pendingRepairs ?? 0;
  const activeAssets = data?.activeAssets ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <div className="flex flex-row items-center justify-between pb-2">
            <CardDescription>สินทรัพย์ที่ดูแล</CardDescription>
            <Package className="text-muted-foreground h-4 w-4" />
          </div>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl @[250px]/card:text-3xl">
            <div className="truncate flex" title={totalAssets.toString()}>
              {totalAssets}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">รายการทั้งหมด</p>
        </CardContent>
      </Card>

      <Card className="@container/card overflow-hidden">
        <CardHeader>
          <div className="flex flex-row items-center justify-between pb-2">
            <CardDescription>มูลค่ารวม</CardDescription>
            <Banknote className="text-muted-foreground h-4 w-4 shrink-0" />
          </div>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl w-full">
            <div
              className="truncate block w-full"
              title={`฿${totalValue.toLocaleString()}`}
            >
              ฿{totalValue.toLocaleString()}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">รวมสินทรัพย์ที่ดูแล</p>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex flex-row items-center justify-between pb-2">
            <CardDescription>รอซ่อม</CardDescription>
            <Wrench className="text-muted-foreground h-4 w-4" />
          </div>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl @[250px]/card:text-3xl">
            <div className="truncate flex" title={pendingRepairs.toString()}>
              {pendingRepairs}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">สินทรัพย์ที่รอซ่อม</p>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex flex-row items-center justify-between pb-2">
            <CardDescription>ใช้งานปกติ</CardDescription>
            <CheckCircle2 className="text-muted-foreground h-4 w-4" />
          </div>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl @[250px]/card:text-3xl">
            <div className="truncate flex" title={activeAssets.toString()}>
              {activeAssets}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">สินทรัพย์พร้อมใช้</p>
        </CardContent>
      </Card>
    </div>
  );
}
