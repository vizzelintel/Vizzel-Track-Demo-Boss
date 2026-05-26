"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { returnWithdrawalWithScan } from "@/lib/withdrawal";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawalId: number;
  onDone: () => void;
};

export function WithdrawalReturnScanDialog({
  open,
  onOpenChange,
  withdrawalId,
  onDone,
}: Props) {
  const [scanText, setScanText] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const rfids = scanText
      .split(/[\s,;\n\r\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (rfids.length === 0) {
      toast.error("วาง RFID อย่างน้อย 1 รายการ");
      return;
    }
    setLoading(true);
    try {
      await returnWithdrawalWithScan(withdrawalId, rfids);
      toast.success("ตรวจรับคืนครุภัณฑ์แล้ว");
      setScanText("");
      onOpenChange(false);
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "คืนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ตรวจรับคืน (สแกน RFID)</DialogTitle>
          <DialogDescription>
            ชุดหลายชิ้นต้องสแกนครบทุกชิ้น — วาง RFID ทีละบรรทัด
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="RFID-410-00-2222-CPU&#10;RFID-410-00-2222-MON"
          value={scanText}
          onChange={(e) => setScanText(e.target.value)}
          rows={6}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "กำลังบันทึก..." : "ยืนยันคืน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
