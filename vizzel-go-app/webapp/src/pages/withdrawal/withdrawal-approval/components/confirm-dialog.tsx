'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TEST_IDS } from '@/components/test-ids';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { note?: string; returnDate?: string }) => void;
  action: 'approve' | 'reject' | 'take';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  action,
  loading,
}: ConfirmDialogProps) {
  const [note, setNote] = useState('');
  // returnDate logic remains same.

  const handleConfirm = () => {
    onConfirm({ note });
    setNote('');
  };

  const getTitle = () => {
    switch (action) {
      case 'approve':
        return 'ยืนยันการอนุมัติ';
      case 'reject':
        return 'ยืนยันการปฏิเสธ';
      case 'take':
        return 'ยืนยันการรับของ';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'approve':
        return 'คุณต้องการอนุมัติรายการนี้ใช่หรือไม่?';
      case 'reject':
        return 'คุณต้องการปฏิเสธรายการนี้ใช่หรือไม่?';
      case 'take':
        return 'คุณต้องการยืนยันว่าผู้ขอได้รับสินทรัพย์ไปจริงใช่หรือไม่?';
    }
  };

  const getButtonLabel = () => {
    if (loading) return 'กำลังบันทึก...';
    switch (action) {
      case 'approve':
        return 'อนุมัติ';
      case 'reject':
        return 'ปฏิเสธ';
      case 'take':
        return 'ยืนยันรับของ';
    }
  };

  const modalTestId = action === 'approve'
    ? TEST_IDS.WITHDRAWAL_APPROVAL.MODAL_APPROVE
    : action === 'reject'
    ? TEST_IDS.WITHDRAWAL_APPROVAL.MODAL_REJECT
    : TEST_IDS.WITHDRAWAL_APPROVAL.MODAL_TAKE;

  const confirmTestId = action === 'approve'
    ? TEST_IDS.WITHDRAWAL_APPROVAL.BUTTON_CONFIRM_APPROVE
    : action === 'reject'
    ? TEST_IDS.WITHDRAWAL_APPROVAL.BUTTON_CONFIRM_REJECT
    : TEST_IDS.WITHDRAWAL_APPROVAL.BUTTON_CONFIRM_TAKE;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid={modalTestId}>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="note" className="text-sm font-medium">
              หมายเหตุ (เพิ่มเติม)
            </label>
            <Textarea
              id="note"
              placeholder="ระบุหมายเหตุ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading} data-testid={TEST_IDS.WITHDRAWAL_APPROVAL.BUTTON_CANCEL_DIALOG}>
            ยกเลิก
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
            data-testid={confirmTestId}
          >
            {getButtonLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
