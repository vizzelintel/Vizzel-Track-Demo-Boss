"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TEST_IDS } from "@/components/test-ids";

interface ExportFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (classIDs: number[], format: "default" | "elaas") => void;
}

export function ExportFilterDialog({
  open,
  onOpenChange,
  onConfirm,
}: ExportFilterDialogProps) {
  const { user } = useUser();
  const [selectedIDs, setSelectedIDs] = useState<number[]>([]);
  const [format, setFormat] = useState<"default" | "elaas">("default");

  // Toggle selection
  const toggleSelection = (id: number) => {
    setSelectedIDs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Select All / Deselect All
  const toggleAll = (allIds: number[]) => {
    if (selectedIDs.length === allIds.length) {
      setSelectedIDs([]);
    } else {
      setSelectedIDs(allIds);
    }
  };

  // Fetch Asset Classes
  const { data: result, isLoading } = useSWR(
    user?.organizationID && open
      ? `/asset/class/get_all?organizationID=${user.organizationID}`
      : null,
    (url) => apiRequest(url).then((res) => res.data),
  );

  const classes = result || [];

  const handleConfirm = () => {
    if (selectedIDs.length === 0) {
      toast.error("กรุณาเลือกอย่างน้อย 1 รายการ");
      return;
    }
    onConfirm(selectedIDs, format);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>เลือกกลุ่มครุภัณฑ์ (Asset Class)</DialogTitle>
          <DialogDescription>
            เลือกกลุ่มที่ต้องการนำฝากออก (Export Filtered)
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>รูปแบบไฟล์ (Format)</Label>
              <RadioGroup
                value={format}
                onValueChange={(v: "default" | "elaas") => setFormat(v)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="r-default" />
                  <Label htmlFor="r-default">Standard (CSV)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="elaas" id="r-elaas" />
                  <Label htmlFor="r-elaas">E-Laas (Excel)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 border-b pb-2">
                <Checkbox
                  id="select-all"
                  checked={
                    classes.length > 0 && selectedIDs.length === classes.length
                  }
                  onCheckedChange={() =>
                    toggleAll(classes.map((c: any) => c.id))
                  }
                />
                <label
                  htmlFor="select-all"
                  className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  เลือกทั้งหมด ({selectedIDs.length}/{classes.length})
                </label>
              </div>

              <ScrollArea className="h-[250px] rounded-md border p-2">
                <div className="space-y-2">
                  {classes.map((c: any) => (
                    <div
                      key={c.id}
                      className="hover:bg-muted/50 flex items-center space-x-2 rounded p-1"
                    >
                      <Checkbox
                        id={`class-${c.id}`}
                        checked={selectedIDs.includes(c.id)}
                        onCheckedChange={() => toggleSelection(c.id)}
                      />
                      <label
                        htmlFor={`class-${c.id}`}
                        className="flex-1 cursor-pointer p-2 text-sm leading-none font-medium"
                      >
                        {c.className}
                        {c.assetType?.typeName && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            ({c.assetType.typeName})
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                  {classes.length === 0 && (
                    <div className="text-muted-foreground p-4 text-center">
                      ไม่พบข้อมูลกลุ่ม
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIDs.length === 0} data-testid={TEST_IDS.ASSET.BUTTON_EXPORT_FILTER_CONFIRM}>
            นำออก ({selectedIDs.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
