"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import {
  createDisposalLot,
  downloadDisposalTemplate,
  importDisposalLot,
} from "@/lib/disposal";
import {
  StepApproverFields,
  validateStepAssignees,
  type StepAssignees,
} from "@/components/approval/step-approver-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Paperclip } from "lucide-react";

export function SalesCreatePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const orgID = user?.organizationRelation?.organizationID;

  const [lot, setLot] = useState("");
  const [disposalDate, setDisposalDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [buyer, setBuyer] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [assetNumbersText, setAssetNumbersText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [stepAssignees, setStepAssignees] = useState<StepAssignees>({});
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"import" | "paste">("import");

  const validateCommon = () => {
    if (!reason.trim()) {
      toast.error("ระบุเหตุผลการจำหน่าย");
      return false;
    }
    if (!buyer.trim()) {
      toast.error("ระบุผู้ซื้อ/ผู้รับ");
      return false;
    }
    if (!disposalDate) {
      toast.error("เลือกวันที่จำหน่าย");
      return false;
    }
    const err = validateStepAssignees(stepAssignees, false);
    if (err) {
      toast.error(err);
      return false;
    }
    const uid = user?.id;
    if (uid && Object.values(stepAssignees).some((id) => id === uid)) {
      toast.error("ผู้ตั้งเรื่องต้องไม่ใช่ผู้อนุมัติในขั้นใดขั้นหนึ่ง");
      return false;
    }
    return true;
  };

  const submitImport = async () => {
    if (!importFile) {
      toast.error("เลือกไฟล์ CSV นำเข้า");
      return;
    }
    if (!validateCommon()) return;
    setSaving(true);
    try {
      const r = await importDisposalLot(importFile, {
        lot: lot.trim() || undefined,
        reason: reason.trim(),
        disposalDate,
        buyer: buyer.trim(),
        amount,
        submit: true,
        stepAssignees,
      });
      toast.success(`นำเข้า ${r.data.imported} รายการ และส่งอนุมัติแล้ว`);
      navigate("/sales");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const submitPaste = async () => {
    const numbers = assetNumbersText
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (numbers.length === 0) {
      toast.error("วางเลขครุภัณฑ์อย่างน้อย 1 รายการ");
      return;
    }
    if (!validateCommon()) return;
    setSaving(true);
    try {
      const form = new FormData();
      if (lot.trim()) form.append("lot", lot.trim());
      form.append("reason", reason.trim());
      form.append("disposalDate", disposalDate);
      form.append("buyer", buyer.trim());
      form.append("amount", amount);
      form.append("assetNumbers", JSON.stringify(numbers));
      for (const f of pdfFiles) {
        form.append("docs", f);
      }
      await createDisposalLot(form, true, stepAssignees);
      toast.success(`สร้าง LOT ${numbers.length} รายการ และส่งอนุมัติแล้ว`);
      navigate("/sales");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ตั้งเรื่องออกจำหน่าย</h1>
        <p className="text-muted-foreground text-sm">
          กำหนด LOT จำหน่าย วันที่ จำนวนเงิน แนบ PDF และเลือกผู้อนุมัติแต่ละขั้น
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>LOT จำหน่าย (ว่าง = สร้างอัตโนมัติ)</Label>
          <Input
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            placeholder="เช่น OUT-2025-001"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>วันที่จำหน่าย</Label>
            <Input
              type="date"
              value={disposalDate}
              onChange={(e) => setDisposalDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>จำนวนเงิน (บาท)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>ผู้ซื้อ / ผู้รับ</Label>
          <Input value={buyer} onChange={(e) => setBuyer(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>เหตุผลการจำหน่าย</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>แนบไฟล์ PDF</Label>
          <Input
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => setPdfFiles(Array.from(e.target.files ?? []))}
          />
          {pdfFiles.length > 0 && (
            <ul className="text-muted-foreground space-y-1 text-xs">
              {pdfFiles.map((f) => (
                <li key={f.name} className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {f.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "import" | "paste")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">นำเข้า CSV (แนะนำ)</TabsTrigger>
          <TabsTrigger value="paste">วางเลขครุภัณฑ์</TabsTrigger>
        </TabsList>
        <TabsContent value="import" className="space-y-3 rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">
            อัปโหลด CSV คอลัมน์ assetNumber — รองรับหลายร้อยถึงพันรายการต่อ LOT
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadDisposalTemplate}>
              <FileText className="mr-2 h-4 w-4" />
              ดาวน์โหลดเทมเพลต
            </Button>
          </div>
          <Input
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
          <Button disabled={saving} onClick={submitImport}>
            {saving ? "กำลังนำเข้า..." : "นำเข้าและส่งอนุมัติ"}
          </Button>
        </TabsContent>
        <TabsContent value="paste" className="space-y-3 rounded-lg border p-4">
          <Textarea
            value={assetNumbersText}
            onChange={(e) => setAssetNumbersText(e.target.value)}
            rows={8}
            placeholder="วางเลขครุภัณฑ์ทีละบรรทัด หรือคั่นด้วยจุลภาค"
          />
          <Button disabled={saving} onClick={submitPaste}>
            {saving ? "กำลังบันทึก..." : "บันทึกและส่งอนุมัติ"}
          </Button>
        </TabsContent>
      </Tabs>

      <StepApproverFields
        organizationID={orgID}
        value={stepAssignees}
        onChange={setStepAssignees}
        includeBranchB={false}
      />

      <Button variant="ghost" onClick={() => navigate("/sales")}>
        ยกเลิก
      </Button>
    </div>
  );
}
