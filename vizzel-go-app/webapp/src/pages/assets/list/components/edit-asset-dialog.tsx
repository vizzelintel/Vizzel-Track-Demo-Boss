"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { formatThaiDate } from "@/lib/utils";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { TEST_IDS } from '@/components/test-ids';
import { filterRefRows } from "@/lib/asset-normalize";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/hooks/use-user";

// -------------------------------------------------------------
// ⭐ ZOD Schema ให้เหมือนของ Add Asset
// -------------------------------------------------------------
const formSchema = z.object({
  assetName: z.string().min(2),
  assetDetails: z.string().min(2),
  assetClassID: z.string().min(1, "กรุณาเลือกกลุ่ม"),
  assetValue: z.string().min(1),
  assetNumber: z.string().min(1),
  isCheck: z.boolean().catch(false),
  receivedDate: z.date(),
  expiryDate: z.date(),
});

interface EditAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: any;
  onSaved: () => void;
}

export function EditAssetDialog({
  open,
  onOpenChange,
  asset,
  onSaved,
}: EditAssetDialogProps) {
  const { user, loading: userLoading } = useUser();

  const [classes, setClasses] = useState<any[]>([]);

  // -------------------------------------------------------------
  // ⭐ React Hook Form
  // -------------------------------------------------------------
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetName: "",
      assetDetails: "",
      assetClassID: "",
      assetValue: "",
      assetNumber: "",
      isCheck: false,
      receivedDate: new Date(),
      expiryDate: new Date(),
    },
  });

  // -------------------------------------------------------------
  // 🔥 โหลด Asset Classes แบบเดียวกับ Add
  // GET /asset/class/get/1/999?organizationID=X
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadClasses() {
      if (!user || userLoading) return;

      const orgId = user.organizationRelation?.organizationID;
      if (!orgId) return;

      const res = await apiRequest(
        `/asset/class/get/1/999?organizationID=${orgId}`,
      );

      setClasses(res.data || []);
    }

    loadClasses();
  }, [user, userLoading]);

  // -------------------------------------------------------------
  // ⭐ preload ค่าเดิมลงฟอร์ม (เหมือน Add form)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!asset) return;

    const received = asset.receivedDate
      ? parseISO(asset.receivedDate)
      : new Date();

    const expiry = asset.expiryDate ? parseISO(asset.expiryDate) : new Date();

    form.reset({
      assetName: asset.assetName ?? "",
      assetDetails: asset.assetDetails ?? asset.assetDetail ?? "",
      assetClassID: String(asset.assetClassID ?? ""),
      assetValue: String(asset.assetValue ?? ""),
      assetNumber: asset.assetNumber ?? "",
      isCheck: Boolean(asset.isCheck),
      receivedDate: received,
      expiryDate: expiry,
    });
  }, [asset]);

  // -------------------------------------------------------------
  // 📌 PATCH /asset/update/:id
  // -------------------------------------------------------------
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await apiRequest(`/asset/update/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          assetName: values.assetName,
          assetDetails: values.assetDetails,
          assetClassID: Number(values.assetClassID),
          assetValue: Number(values.assetValue),
          assetNumber: values.assetNumber,
          isCheck: values.isCheck,
          receivedDate: values.receivedDate.toISOString(),
          expiryDate: values.expiryDate.toISOString(),
        }),
      });

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("❌ แก้ไขข้อมูลไม่สำเร็จ");
    }
  }

  // -------------------------------------------------------------
  // ⭐ UI ให้เหมือนตอน Add Asset
  // -------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid={TEST_IDS.ASSET_FORM.MODAL}>
        <DialogHeader>
          <DialogTitle>แก้ไขสินทรัพย์</DialogTitle>
          <DialogDescription>แก้ไขข้อมูลแล้วกดบันทึก</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* assetNumber */}
            <FormField
              control={form.control}
              name="assetNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเลขสินทรัพย์</FormLabel>
                  <FormControl>
                    <Input placeholder="AS-2024-001" data-testid={TEST_IDS.ASSET_FORM.INPUT_CODE} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* assetName */}
            <FormField
              control={form.control}
              name="assetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อสินทรัพย์</FormLabel>
                  <FormControl>
                    <Input placeholder="Notebook Dell" data-testid={TEST_IDS.ASSET_FORM.INPUT_NAME} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* assetDetails */}
            <FormField
              control={form.control}
              name="assetDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รายละเอียด</FormLabel>
                  <FormControl>
                    <Input placeholder="รายละเอียดเพิ่มเติม..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* assetClassID */}
            <FormField
              control={form.control}
              name="assetClassID"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>กลุ่มสินทรัพย์</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_CLASS}>
                        <SelectValue placeholder="เลือกกลุ่ม" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterRefRows(classes).map((c) => (
                          <SelectItem key={String(c.id)} value={String(c.id)}>
                            {c.className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* assetValue */}
            <FormField
              control={form.control}
              name="assetValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>มูลค่า (บาท)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="15000" data-testid={TEST_IDS.ASSET_FORM.INPUT_VALUE} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* receivedDate & expiryDate */}
            <div className="grid grid-cols-2 gap-4">
              {/* receivedDate */}
              <FormField
                control={form.control}
                name="receivedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่ได้รับ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value
                            ? formatThaiDate(field.value)
                            : "เลือกวันที่"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* expiryDate */}
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันหมดอายุ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value
                            ? formatThaiDate(field.value)
                            : "เลือกวันที่"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* isCheck */}
            <FormField
              control={form.control}
              name="isCheck"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormControl>
                  <FormLabel className="m-0">ต้องตรวจนับ</FormLabel>
                </FormItem>
              )}
            />

            {/* Buttons */}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" data-testid={TEST_IDS.ASSET_FORM.BUTTON_CANCEL}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" data-testid={TEST_IDS.ASSET_FORM.BUTTON_SUBMIT}>Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
