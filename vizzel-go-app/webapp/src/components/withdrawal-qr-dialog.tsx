"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verifyUrl: string;
  title?: string;
};

export function WithdrawalQrDialog({ open, onOpenChange, verifyUrl, title }: Props) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? "QR ใบยืมครุภัณฑ์"}</DialogTitle>
          <DialogDescription>สแกนเพื่อตรวจสอบสถานะการยืม</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <img src={qrSrc} alt="QR code" width={220} height={220} className="rounded border" />
          <p className="text-muted-foreground break-all text-center text-xs">{verifyUrl}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
