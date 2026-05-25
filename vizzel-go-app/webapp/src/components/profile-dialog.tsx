import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTab?: string;
};

export function ProfileDialog({ open, onOpenChange, defaultTab }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>โปรไฟล์</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">แท็บ: {defaultTab} — port จาก production ต่อ</p>
      </DialogContent>
    </Dialog>
  );
}
