"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Box,
  User,
  CreditCard,
  Building2,
  Calendar as CalendarIconLucide,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import { createExternalWithdrawal } from "@/lib/withdrawal";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-user";
import { TEST_IDS } from "@/components/test-ids";

const formSchema = z.object({
  assetID: z.number({ message: "กรุณาเลือกสินทรัพย์" }),
  desireReturn: z.date({ message: "กรุณาระบุวันที่ต้องการคืน" }),
  name: z.string().min(1, "กรุณาระบุชื่อผู้ยืม"),
  citizenID: z
    .string()
    .min(13, "เลขบัตรประชาชนต้องมี 13 หลัก")
    .max(13, "เลขบัตรประชาชนต้องมี 13 หลัก"),
  organization: z.string().min(1, "กรุณาระบุหน่วยงาน"),
  note: z.string().optional(),
});

interface Asset {
  id: number;
  assetName: string;
  assetNumber: string;
}

interface ExternalFormProps {
  assets: Asset[];
  onRefreshAssets: () => Promise<void>;
}

export function ExternalForm({ assets, onRefreshAssets }: ExternalFormProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [searchAssetQuery, setSearchAssetQuery] = useState("");

  const filteredAssets = assets
    .filter((asset) => {
      if (!searchAssetQuery) return true;
      const q = searchAssetQuery.toLowerCase();
      return (
        asset.assetNumber.toLowerCase().includes(q) ||
        asset.assetName.toLowerCase().includes(q)
      );
    })
    .slice(0, 50);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      citizenID: "",
      organization: "",
      note: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await createExternalWithdrawal({
        assetID: values.assetID,
        desireReturn: values.desireReturn.toISOString(),
        name: values.name,
        citizenID: values.citizenID,
        organization: values.organization,
        note: values.note,
      });
      toast.success("บันทึกคำขอยืม (บุคคลภายนอก) สำเร็จ");
      form.reset();
      // Refresh asset list
      await onRefreshAssets();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Asset Selection */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6">
          <FormField
            control={form.control}
            name="assetID"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-primary/80 flex items-center gap-2">
                  <Box size={16} /> เลือกสินทรัพย์ที่ต้องการยืม{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "h-11 w-full justify-between border-blue-200 bg-white transition-colors hover:bg-blue-50",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value
                          ? assets.find((asset) => asset.id === field.value)
                              ?.assetName ||
                            assets.find((asset) => asset.id === field.value)
                              ?.assetNumber
                          : "เลือกสินทรัพย์"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] border-0 p-0 shadow-lg ring-1 ring-blue-100">
                    <Command shouldFilter={false} className="rounded-lg">
                      <CommandInput
                        placeholder="ค้นหาสินทรัพย์..."
                        className="h-11 border-none focus:ring-0"
                        value={searchAssetQuery}
                        onValueChange={setSearchAssetQuery}
                      />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>ไม่พบสินทรัพย์</CommandEmpty>
                        <CommandGroup>
                          {filteredAssets.map((asset) => (
                            <CommandItem
                              value={`${asset.assetNumber} ${asset.assetName}`}
                              key={asset.id}
                              onSelect={() => {
                                form.setValue("assetID", asset.id);
                              }}
                              className="cursor-pointer py-2.5 aria-selected:bg-blue-100 aria-selected:text-blue-700"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  asset.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {asset.assetNumber}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {asset.assetName}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary/80 flex items-center gap-2">
                  <User size={16} /> ชื่อ-นามสกุล ผู้ยืม{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="ระบุชื่อ-นามสกุล"
                    className="h-11 border-gray-200 bg-gray-50/50 transition-colors focus:bg-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="citizenID"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary/80 flex items-center gap-2">
                  <CreditCard size={16} /> เลขบัตรประชาชน (13 หลัก){" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="ระบุเลขบัตรประชาชน"
                    maxLength={13}
                    className="h-11 border-gray-200 bg-gray-50/50 transition-colors focus:bg-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary/80 flex items-center gap-2">
                  <Building2 size={16} /> หน่วยงานต้นสังกัด{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="ระบุชื่อหน่วยงาน"
                    className="h-11 border-gray-200 bg-gray-50/50 transition-colors focus:bg-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="desireReturn"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-primary/80 flex items-center gap-2">
                  <CalendarIconLucide size={16} /> วันที่ต้องการคืน{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "h-11 w-full border-gray-200 bg-gray-50/50 pl-3 text-left font-normal transition-colors hover:bg-white",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: th })
                        ) : (
                          <span>เลือกวันที่</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto border-0 p-0 shadow-lg ring-1 ring-gray-200"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                      classNames={{
                        head_cell:
                          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                        day_selected:
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-primary/80 flex items-center gap-2">
                <FileText size={16} /> หมายเหตุเพิ่มเติม
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)..."
                  className="min-h-[100px] resize-none border-gray-200 bg-gray-50/50 transition-colors focus:bg-white"
                  data-testid={TEST_IDS.WITHDRAWAL_FORM.INPUT_REASON}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full min-w-[200px] text-base md:w-auto"
            data-testid={TEST_IDS.WITHDRAWAL_FORM.BUTTON_SUBMIT}
          >
            {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
