import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiRequest, getToken } from "@/lib/api";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ImportResult = {
  filename: string;
  sheet: string;
  header_row: number;
  data_rows: number;
  imported: number;
  failed: number;
  skipped: number;
  dry_run: boolean;
  summary?: {
    total_value: number;
    categories: string[];
    classes: string[];
  };
  sample?: Array<{
    seq: number;
    category: string;
    class: string;
    elaas_code: string;
    asset_number: string;
    asset_name: string;
    purchase_value: number;
    status: string;
  }>;
};

export type ElaasImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

// ElaasImportDialog uploads an ELAAS .xlsx report (รายงานทะเบียนข้อมูลสินทรัพย์)
// directly to /api/v1/assets/import/elaas. The backend parser is matched
// against the official อบต. layout but is resilient to small header shifts.
export function ElaasImportDialog({
  open,
  onOpenChange,
  onImported,
}: ElaasImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setPreviewed(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = async (dryRun: boolean) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("dryRun", dryRun ? "true" : "false");
      const token = getToken();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/v1/assets/import/elaas", {
        method: "POST",
        body: form,
        headers,
      });
      const data: ImportResult & { error?: string } = await res
        .json()
        .catch(() => ({}) as ImportResult & { error?: string });
      if (!res.ok) {
        const msg = data?.error || res.statusText || "นำเข้าไม่สำเร็จ";
        throw new Error(msg);
      }
      setResult(data);
      setPreviewed(dryRun);
      if (!dryRun) {
        toast.success(`นำเข้า ELAAS สำเร็จ ${data.imported} รายการ`);
        onImported?.();
      } else {
        toast.info(`พบ ${data.data_rows} แถวจากชีต ${data.sheet}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "นำเข้าไม่สำเร็จ";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            นำเข้าครุภัณฑ์จากระบบ ELAAS
          </DialogTitle>
          <DialogDescription>
            ใช้ไฟล์ "รายงานทะเบียนข้อมูลสินทรัพย์" (.xlsx) ที่ดาวน์โหลดจาก ELAAS โดยตรง
            ระบบจะอ่านโครงสร้างคอลัมน์อัตโนมัติ (รหัส อปท., ชื่อสินทรัพย์, ราคา ฯลฯ)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="elaas-file">เลือกไฟล์ .xlsx</Label>
            <input
              id="elaas-file"
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              data-testid="elaas-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setResult(null);
                setError(null);
                setPreviewed(false);
              }}
              className="block w-full cursor-pointer rounded-md border border-input bg-background p-2 text-sm"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                ไฟล์: {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {result.dry_run ? (
                  <>
                    <FileSpreadsheet className="size-4 text-primary" />
                    ตัวอย่างผลการอ่านไฟล์
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 text-green-600" />
                    นำเข้าสำเร็จ
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>ชีต: {result.sheet}</div>
                <div>แถว header: {result.header_row}</div>
                <div>แถวข้อมูล: {result.data_rows.toLocaleString()}</div>
                <div>นำเข้าได้: {result.imported.toLocaleString()}</div>
                <div>ผิดพลาด: {result.failed.toLocaleString()}</div>
                <div>ข้าม: {result.skipped.toLocaleString()}</div>
                {result.summary && (
                  <div className="col-span-2">
                    มูลค่ารวม: {result.summary.total_value.toLocaleString("th-TH", {
                      maximumFractionDigits: 2,
                    })} บาท · ประเภท {result.summary.categories.length} หมวด ·
                    ชนิด {result.summary.classes.length} ชนิด
                  </div>
                )}
              </div>
              {result.sample && result.sample.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-background/40">
                      <tr className="text-left">
                        <th className="p-1">#</th>
                        <th className="p-1">รหัส ELAAS</th>
                        <th className="p-1">เลขครุภัณฑ์</th>
                        <th className="p-1">ชื่อ</th>
                        <th className="p-1">หมวด</th>
                        <th className="p-1">ราคา</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sample.map((r, idx) => (
                        <tr key={idx} className="border-t border-border/50">
                          <td className="p-1">{r.seq}</td>
                          <td className="p-1 font-mono text-[11px]">{r.elaas_code}</td>
                          <td className="p-1 font-mono text-[11px]">{r.asset_number}</td>
                          <td className="p-1">{r.asset_name}</td>
                          <td className="p-1">{r.category}</td>
                          <td className="p-1 text-right">{r.purchase_value.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            ปิด
          </Button>
          <Button
            variant="outline"
            disabled={!file || loading}
            onClick={() => upload(true)}
            data-testid="elaas-preview-btn"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            ดูตัวอย่าง
          </Button>
          <Button
            disabled={!file || loading}
            onClick={() => upload(false)}
            data-testid="elaas-import-btn"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {previewed ? "ยืนยันนำเข้า" : "นำเข้า"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
