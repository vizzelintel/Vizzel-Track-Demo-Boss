"use client";

import { useState } from "react";
import { useRouter } from "@/shims/next-navigation";
import { useSession } from "@/shims/next-auth";
import useSWR, { mutate } from "swr";
import { apiRequest } from "@/lib/api";
import { Loader2, ArrowLeft, ScanLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  resolveScannedRfids,
  type ResolveScanResponse,
} from "@/lib/asset-components";
import { IconCalendar, IconUser } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatThaiDate } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { toast } from "sonner";
import { TEST_IDS } from "@/components/test-ids";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClientAuditScanningPageProps {
  initialJob: any;
  jobID: string;
  errorMsg?: string;
  orgID?: number;
}

export default function ClientAuditScanningPage({
  initialJob,
  jobID,
  errorMsg,
  orgID,
}: ClientAuditScanningPageProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // R2: bulk RFID scan resolver state.
  const [scanText, setScanText] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ResolveScanResponse | null>(null);

  const handleResolveScan = async () => {
    const list = scanText
      .split(/[\s,;\n\r\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error("กรุณาวาง RFID อย่างน้อย 1 รายการ");
      return;
    }
    setScanLoading(true);
    try {
      const res = await resolveScannedRfids(list);
      setScanResult(res);
      toast.success(
        `ตรวจสอบ ${res.total} รายการ — ครบ ${res.complete.length}, ครบบางส่วน ${res.partial.length}, ไม่พบ ${res.unmatched.length}`,
      );
    } catch (err: any) {
      console.error("resolve scan failed", err);
      toast.error(`ตรวจสอบล้มเหลว: ${err?.message || err}`);
    } finally {
      setScanLoading(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setScanText(text);
  };

  // Use the new API for assets/stats
  const { data: assetResponse } = useSWR(
    orgID && session?.accessToken ? [`/checkJob/asset/get`, jobID] : null,
    async ([, id]) => {
      const res = await apiRequest(`/checkJob/asset/get/${id}?isCount=true`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      return res; // apiRequest returns the body directly
    },
    {
      refreshInterval: 2000,
      revalidateOnFocus: true,
    },
  );

  const job = initialJob || {}; // Fallback for header info

  // Merge stats from new API if available
  const stats = assetResponse
    ? {
        total: assetResponse.assetCount,
        counted: assetResponse.countedCount,
        progress:
          assetResponse.assetCount > 0
            ? (assetResponse.countedCount / assetResponse.assetCount) * 100
            : 0,
      }
    : job.stats || { total: 0, counted: 0, progress: 0 };

  // Prepare scanned list from new API if available
  const rawScanned = assetResponse?.data || job.scannedAssets || [];

  // Sort by latest checked (descending)
  const scannedAssets = [...rawScanned]
    .sort((a, b) => {
      const tA = new Date(a.checkedAt || 0).getTime();
      const tB = new Date(b.checkedAt || 0).getTime();
      return tB - tA;
    })
    .map((item: any) => ({
      ...item,
      // Ensure location is formatted if coming from new API
      location:
        item.location ||
        `${item.buildingName || ""} ${item.roomName || ""}`.trim(),
    }));

  if (!initialJob) {
    return (
      <div className="bg-muted/5 flex h-screen flex-col items-center justify-center p-8 text-center px-4">
        <h1 className="mb-2 text-xl font-bold">ไม่พบข้อมูลการตรวจนับ</h1>
        <p className="text-muted-foreground mb-4">
          {errorMsg
            ? `Error: ${errorMsg}`
            : "อาจไม่พบรหัสงานนี้ หรือคุณไม่มีสิทธิ์เข้าถึง"}
        </p>
        <Button onClick={() => router.push("/audit/ongoing")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> กลับหน้ารายการ
        </Button>
      </div>
    );
  }

  const handleFinish = async () => {
    if (!job) return;

    try {
      await apiRequest(`/checkJob/stop/${job.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      toast.success("บันทึกการตรวจสอบเสร็จสิ้น");

      // Force refresh the job list cache to prevent stale data on history/ongoing pages
      if (orgID) {
        // Clear all audit-related SWR caches by using a key filter function
        await mutate(
          (key: any) => {
            if (Array.isArray(key)) return key[0]?.includes("/audit/");
            if (typeof key === "string") return key.includes("/audit/");
            return false;
          },
          undefined,
          { revalidate: true },
        );
      }

      router.push("/audit/history");
    } catch (error) {
      console.error("Failed to finish audit:", error);
      toast.error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-6 p-4 lg:p-6">
      {/* Page Content Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
              {job.name || `${job.jobCode || `#${job.id}`}`}
              <Badge
                variant={
                  ["In Progress", "Ongoing"].includes(job.status)
                    ? "default"
                    : "outline"
                }
                className="ml-2 whitespace-nowrap"
              >
                {["In Progress", "Ongoing"].includes(job.status)
                  ? "กำลังดำเนินการ"
                  : job.status === "Completed"
                    ? "เสร็จสิ้น"
                    : job.status ||
                      (job.isComplete ? "เสร็จสิ้น" : "กำลังดำเนินการ")}
              </Badge>
            </h1>
            <div className="text-muted-foreground mt-3 text-sm space-y-4">
              <p className="text-base">{job.desc || "ไม่มีรายละเอียด"}</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-2 text-muted-foreground/80 hover:text-foreground transition-colors">
                  <IconCalendar className="h-4 w-4" />
                  {formatThaiDate(job.createdAt)}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground/80 hover:text-foreground transition-colors">
                  <ScanLine className="h-4 w-4" />
                  Code: {job.jobCode || "-"}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground/80 hover:text-foreground transition-colors">
                  <ScanLine className="h-4 w-4" />
                  Ref: {job.refCode || "-"}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground/80 hover:text-foreground transition-colors">
                  <IconUser className="h-4 w-4" />
                  ผู้รับผิดชอบ:{" "}
                  {job.assignedUsers && job.assignedUsers.length > 0 ? (
                    <span className="text-foreground font-medium">
                      {job.assignedUsers
                        .map((u: any) =>
                          `${u.name || ""} ${u.surname || ""}`.trim(),
                        )
                        .join(", ")}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto mt-4 lg:mt-0">
          {/* Actions */}
          <Button
            variant="destructive"
            onClick={() => router.push("/audit/ongoing")}
            className="w-full lg:w-auto"
            data-testid={TEST_IDS.AUDIT_ONGOING.BUTTON_PAUSE_JOB}
          >
            พักการตรวจ
          </Button>

          {(() => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const startDate = job.startDate ? new Date(job.startDate) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            const isBeforeStart = startDate && now < startDate;

            if (isBeforeStart) {
              return (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {/* Wrap in div because disabled button won't trigger tooltip events */}
                      <div className="w-full lg:w-auto">
                        <Button disabled className="w-full">
                          ตรวจสอบเสร็จสิ้น
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ยังไม่ถึงเวลาเริ่มตรวจนับ</p>
                      <p className="text-xs text-muted-foreground">
                        เริ่มวันที่ {formatThaiDate(job.startDate)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return (
              <Button onClick={handleFinish} className="w-full lg:w-auto" data-testid={TEST_IDS.AUDIT_ONGOING.BUTTON_COMPLETE_JOB}>
                ตรวจสอบเสร็จสิ้น
              </Button>
            );
          })()}
        </div>
      </div>

      {/* Dash/Table Content */}
      <div className="flex-1 space-y-6">
        {/* Stats Cards - Adjusted for balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                ตรวจนับแล้ว
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-bold">{stats.counted}</div>
                <div className="text-muted-foreground mb-1 text-sm">
                  / {stats.total} รายการ
                </div>
              </div>
              <div className="bg-secondary mt-2 h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
          {/* Add a Placeholder/Summary Card to balance if needed, or leave as is but widen the grid */}
        </div>

        {/* R2: Bulk RFID scan resolver */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" /> ตรวจนับด้วย RFID
            </CardTitle>
            <CardDescription>
              วาง RFID ที่สแกนได้ (หนึ่งบรรทัดต่อหนึ่งรายการ)
              หรืออัปโหลดไฟล์ CSV/TXT แล้วกด &ldquo;ตรวจสอบ&rdquo;
              ระบบจะรวมเป็นรายทรัพย์สิน และแจ้งชิ้นที่ขาด
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="RFID-001\nRFID-002\nRFID-410-00-2222-CPU"
              value={scanText}
              onChange={(e) => setScanText(e.target.value)}
              rows={5}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleResolveScan}
                disabled={scanLoading}
              >
                {scanLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ScanLine className="mr-2 h-4 w-4" />
                )}
                ตรวจสอบ
              </Button>
              <label className="inline-flex">
                <Button asChild type="button" variant="outline">
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    เลือกไฟล์ CSV
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              {scanResult && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setScanResult(null);
                    setScanText("");
                  }}
                >
                  ล้างผลลัพธ์
                </Button>
              )}
            </div>

            {scanResult && (
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="border-green-200 bg-green-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-700">
                      ✓ ครบ ({scanResult.complete.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    {scanResult.complete.length === 0 ? (
                      <p className="text-muted-foreground">ไม่มี</p>
                    ) : (
                      scanResult.complete.map((a) => (
                        <div key={a.assetID} className="rounded border bg-white p-2">
                          <div className="font-medium">{a.assetNumber}</div>
                          <div className="text-muted-foreground">{a.assetName}</div>
                          <div>{a.matched}/{a.total} ชิ้น</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-yellow-700">
                      ⚠ ครบบางส่วน ({scanResult.partial.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    {scanResult.partial.length === 0 ? (
                      <p className="text-muted-foreground">ไม่มี</p>
                    ) : (
                      scanResult.partial.map((a) => (
                        <div key={a.assetID} className="rounded border bg-white p-2">
                          <div className="font-medium">{a.assetNumber}</div>
                          <div className="text-muted-foreground">{a.assetName}</div>
                          <div>{a.matched}/{a.total} ชิ้น</div>
                          {a.missingNames.length > 0 && (
                            <div className="mt-1 text-yellow-700">
                              ขาด: {a.missingNames.join(", ")}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-700">
                      ✗ ไม่พบในระบบ ({scanResult.unmatched.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    {scanResult.unmatched.length === 0 ? (
                      <p className="text-muted-foreground">ไม่มี</p>
                    ) : (
                      <ul className="font-mono">
                        {scanResult.unmatched.map((u) => (
                          <li key={u.rfid}>{u.rfid}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scanned Table */}
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>รายการสินทรัพย์ที่ตรวจนับ</CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <ScanLine className="h-3 w-3" /> Waiting for RFID...
              </Badge>
            </div>
            <CardDescription>
              รายการสินทรัพย์ที่ถูกสแกนแล้วแบบ Real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table data-testid={TEST_IDS.AUDIT_ONGOING.TABLE_ASSET}>
              <TableHeader>
                <TableRow>
                  <TableHead>ลำดับ</TableHead>
                  <TableHead>รหัสสินทรัพย์</TableHead>
                  <TableHead>สถานที่</TableHead>
                  <TableHead>เวลาที่ตรวจ</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scannedAssets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground h-24 text-center"
                    >
                      ยังไม่มีรายการที่ถูกสแกน
                    </TableCell>
                  </TableRow>
                ) : (
                  scannedAssets.map((log: any, index: number) => (
                    <TableRow key={log.id || index} data-testid={TEST_IDS.AUDIT_ONGOING.TABLE_ROW(log.id || index)}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.assetNumber}</span>
                          <span className="text-muted-foreground text-xs">
                            {log.assetName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{log.location || "-"}</TableCell>
                      <TableCell>{formatThaiDate(log.checkedAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="flex w-fit items-center gap-1 border-green-200 bg-green-50 text-green-700"
                        >
                          <IconCheck className="h-3 w-3" /> พบ
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
