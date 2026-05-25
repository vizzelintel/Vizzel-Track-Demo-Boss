"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  User,
  Box,
  FileText,
  ArrowLeftRight,
  Calendar as CalendarIconLucide,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import { createInternalWithdrawal } from "@/lib/withdrawal";
import { toast } from "sonner";
import { TEST_IDS } from "@/components/test-ids";
import { useUser } from "@/hooks/use-user";
import { useOrganizationUsers } from "@/hooks/use-organization-users";

const formSchema = z
  .object({
    userID: z.number({ message: "กรุณาเลือกผู้เบิก/ยืม" }),
    assetID: z.number({ message: "กรุณาเลือกสินทรัพย์" }),
    type: z.enum(["withdraw", "borrow"] as const, {
      message: "กรุณาเลือกประเภทการเบิก",
    }),
    desireReturn: z.date().optional(),
    note: z.string().optional(),
    buildingID: z.string({ message: "กรุณาเลือกอาคาร" }).min(1, { message: "กรุณาเลือกอาคาร" }),
    roomID: z.string({ message: "กรุณาเลือกห้อง" }).min(1, { message: "กรุณาเลือกห้อง" }),
  })
  .refine(
    (data) => {
      if (data.type === "borrow" && !data.desireReturn) {
        return false;
      }
      return true;
    },
    {
      message: "กรุณาระบุวันที่ต้องการคืน",
      path: ["desireReturn"],
    },
  );

interface Asset {
  id: number;
  assetName: string;
  assetNumber: string;
}

interface InternalFormProps {
  assets: Asset[];
  onRefreshAssets: () => Promise<void>;
  initialUsers?: any;
}

export function InternalForm({
  assets,
  onRefreshAssets,
  initialUsers,
}: InternalFormProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [searchAssetQuery, setSearchAssetQuery] = useState("");
  const [buildings, setBuildings] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

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

  const organizationID = user?.organizationRelation?.organizationID ?? null;

  useEffect(() => {
    const loadFacilities = async () => {
      if (!organizationID) return;
      try {
        const [bRes, rRes] = await Promise.all([
          apiRequest(`/facility/building/get/${organizationID}`),
          apiRequest(`/facility/room/get?pageSize=10000`)
        ]);
        setBuildings(Array.isArray(bRes) ? bRes : bRes?.data || []);
        setAllRooms(rRes?.data || rRes || []);
      } catch (e) {
        console.error("Failed to load facilities", e);
      }
    };
    loadFacilities();
  }, [organizationID]);

  // Fetch users for selection
  const { data: usersData } = useOrganizationUsers(
    organizationID,
    1,
    1000,
    searchUserQuery,
    undefined,
    initialUsers,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "withdraw",
      note: "",
    },
  });

  const type = form.watch("type");

  const handleBuildingChange = (bldID: string) => {
    form.setValue("buildingID", bldID, { shouldValidate: true });
    form.setValue("roomID", "");
    if (bldID) {
      const filtered = allRooms.filter((r: any) => String(r.buildingID) === String(bldID));
      setRooms(filtered);
    } else {
      setRooms([]);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      if (!values.userID) throw new Error("กรุณาเลือกผู้ทำรายการ");

      await createInternalWithdrawal({
        assetID: values.assetID,
        userID: values.userID,
        type: values.type === "borrow" ? 1 : 0,
        buildingID: values.buildingID ? Number(values.buildingID) : undefined,
        roomID: values.roomID ? Number(values.roomID) : undefined,
        desireReturn: values.desireReturn
          ? values.desireReturn.toISOString()
          : undefined,
        note: values.note,
      });
      toast.success("บันทึกคำขอสำเร็จ");
      form.reset({
        type: "withdraw",
        note: "",
        assetID: undefined,
        desireReturn: undefined,
        userID: undefined,
        buildingID: "",
        roomID: "",
      });
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* User Selection */}
          <FormField
            control={form.control}
            name="userID"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-primary/80 flex items-center gap-2">
                  <User size={16} /> ผู้เบิก/ยืม{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openUserSelect}
                        className={cn(
                          "h-11 w-full justify-between border-gray-200 bg-gray-50/50 transition-colors hover:bg-white",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value && usersData?.data
                          ? (() => {
                              const foundUser = usersData.data.find(
                                (u: any) => u.user.id === field.value,
                              );
                              if (foundUser)
                                return foundUser.user.name
                                  ? `${foundUser.user.name} ${foundUser.user.surname ?? ""}`
                                  : foundUser.user.username ||
                                      foundUser.user.email;
                              return "เลือกผู้เบิก/ยืม";
                            })()
                          : "เลือกผู้เบิก/ยืม"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[400px] border-0 p-0 shadow-lg ring-1 ring-gray-200"
                    align="start"
                  >
                    <Command shouldFilter={false} className="rounded-lg">
                      <CommandInput
                        placeholder="ค้นหาชื่อ..."
                        onValueChange={setSearchUserQuery}
                        value={searchUserQuery}
                        className="h-11 border-none focus:ring-0"
                      />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>ไม่พบรายชื่อ</CommandEmpty>
                        <CommandGroup>
                          {usersData?.data?.map((orgUser: any) => (
                            <CommandItem
                              value={`${orgUser.user.name || ""} ${
                                orgUser.user.surname || ""
                              } ${orgUser.user.username || ""} ${
                                orgUser.user.email || ""
                              }`.trim()}
                              key={orgUser.user.id}
                              onSelect={() => {
                                form.setValue("userID", orgUser.user.id);
                                setOpenUserSelect(false);
                              }}
                              className="cursor-pointer py-2.5 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  orgUser.user.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {orgUser.user.name
                                    ? `${orgUser.user.name} ${orgUser.user.surname || ""}`
                                    : orgUser.user.username ||
                                      orgUser.user.email}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {orgUser.position?.name || "-"}
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

          {/* Asset Selection */}
          <FormField
            control={form.control}
            name="assetID"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-primary/80 flex items-center gap-2">
                  <Box size={16} /> สินทรัพย์{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "h-11 w-full justify-between border-gray-200 bg-gray-50/50 transition-colors hover:bg-white",
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
                  <PopoverContent
                    className="w-[400px] border-0 p-0 shadow-lg ring-1 ring-gray-200"
                    align="start"
                  >
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
                              className="cursor-pointer py-2.5 aria-selected:bg-blue-50 aria-selected:text-blue-700"
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
            name="buildingID"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-2 text-primary/80">
                  <Building2 size={16} /> อาคาร{" "}
                  <span className="text-red-500">*</span>
                  {buildings.length > 0 ? `(${buildings.length})` : ""}
                </FormLabel>
                <Select onValueChange={(val) => handleBuildingChange(val)} value={field.value} disabled={buildings.length === 0}>
                  <FormControl>
                    <SelectTrigger className={cn("h-11 w-full border-gray-200 bg-gray-50/50 transition-colors hover:bg-white", !field.value && "text-muted-foreground")}>
                      <SelectValue placeholder="เลือกอาคาร" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {buildings.map((b: any) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.buildingName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roomID"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-2 text-primary/80">
                  ห้อง <span className="text-red-500">*</span>
                  {rooms.length > 0 ? ` (${rooms.length})` : ""}
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch("buildingID") || rooms.length === 0}>
                  <FormControl>
                    <SelectTrigger className={cn("h-11 w-full border-gray-200 bg-gray-50/50 transition-colors hover:bg-white", !field.value && "text-muted-foreground")}>
                      <SelectValue
                        placeholder={
                          !form.watch("buildingID")
                            ? "กรุณาเลือกอาคารก่อน"
                            : rooms.length === 0
                              ? "ไม่พบข้อมูลห้องในอาคารนี้"
                              : "เลือกห้อง"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {rooms.map((r: any) => {
                      const rNumber = r.roomNumber || r.room_number;
                      const rName = r.roomName || r.room_name;
                      return (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {rNumber && rNumber !== "null" ? `${rNumber} - ${rName || "(ไม่ระบุชื่อ)"}` : rName || "ห้อง (ไม่ระบุชื่อ)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-primary/80 flex items-center gap-2">
                <ArrowLeftRight size={16} /> ประเภทรายการ{" "}
                <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <FormItem>
                    <FormControl>
                      <RadioGroupItem
                        value="withdraw"
                        className="peer sr-only"
                      />
                    </FormControl>
                    <FormLabel className="border-muted peer-data-[state=checked]:border-primary flex h-full cursor-pointer flex-col items-center justify-between rounded-xl border-2 bg-white p-4 transition-all peer-data-[state=checked]:bg-blue-50/50 hover:bg-gray-50">
                      <span className="text-md peer-data-[state=checked]:text-primary mb-2 block font-semibold text-gray-900">
                        เบิก (ไม่ต้องคืน)
                      </span>
                      <span className="text-muted-foreground text-center text-sm">
                        สำหรับวัสดุสิ้นเปลือง หรืออุปกรณ์ที่ใช้แล้วหมดไป
                      </span>
                    </FormLabel>
                  </FormItem>
                  <FormItem>
                    <FormControl>
                      <RadioGroupItem value="borrow" className="peer sr-only" />
                    </FormControl>
                    <FormLabel className="border-muted peer-data-[state=checked]:border-primary flex h-full cursor-pointer flex-col items-center justify-between rounded-xl border-2 bg-white p-4 transition-all peer-data-[state=checked]:bg-blue-50/50 hover:bg-gray-50">
                      <span className="text-md peer-data-[state=checked]:text-primary mb-2 block font-semibold text-gray-900">
                        ยืม (ต้องคืน)
                      </span>
                      <span className="text-muted-foreground text-center text-sm">
                        สำหรับครุภัณฑ์ถาวร ต้องมีการส่งคืน
                      </span>
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === "borrow" && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <FormField
              control={form.control}
              name="desireReturn"
              render={({ field }) => (
                <FormItem className="flex max-w-md flex-col">
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
        )}

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
