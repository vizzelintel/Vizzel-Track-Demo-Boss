// frontend/app/(protected)/users/components/UserRoleUpdateSheet.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertTriangle, PlusCircle } from "lucide-react"; // ⭐ เพิ่ม AlertTriangle และ PlusCircle
import Link from "@/shims/next/link";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator"; // ⭐ เพิ่ม Separator
import type { OrgUser } from "@/lib/user";
import { updateOrganizationRole } from "@/lib/user";

import { useOrganizationSettings } from "@/hooks/use-organization-settings";
import { TEST_IDS } from "@/components/test-ids";

type Props = {
  user: OrgUser | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

export function UserRoleUpdateSheet({ user, open, onClose, onUpdated }: Props) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedInstituteId, setSelectedInstituteId] = useState<string>(""); // ⭐ เพิ่ม State
  const [selectedSectionId, setSelectedSectionId] = useState<string>(""); // ⭐ เพิ่ม State
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const organizationID = user?.organizationID;
  const {
    departments,
    positions,
    sections, // ⭐ รับค่า sections
    institutes, // ⭐ รับค่า institutes
    isSection, // ⭐ รับค่า isSection
    isInstitute, // ⭐ รับค่า isInstitute
    loading: settingsLoading,
    error: settingsError,
  } = useOrganizationSettings(organizationID);

  // ตั้งค่าเริ่มต้นเมื่อ user เปลี่ยน
  useEffect(() => {
    if (user) {
      setSelectedInstituteId(
        user.instituteID ? String(user.instituteID) : "none",
      ); // ⭐ Init Institute
      setSelectedDeptId(user.deptID ? String(user.deptID) : "none");
      setSelectedSectionId(user.sectionID ? String(user.sectionID) : "none"); // ⭐ Init Section
      setSelectedPositionId(
        user.workPositionID ? String(user.workPositionID) : "none",
      );
    }
  }, [user]);

  if (!user) return null;

  const isLoading = isUpdating || settingsLoading;

  // ⭐ Filter Department ตาม Institute ที่เลือก
  // ⭐ Filter Department ตาม Institute ที่เลือก
  const filteredDepartments = departments.filter((d) => {
    // Force include currently selected department to handle data inconsistency (e.g. Import errors)
    if (String(d.id) === selectedDeptId) return true;

    if (!isInstitute) return true; // ถ้าองค์กรไม่มีระบบสำนัก แสดงทั้งหมด
    if (selectedInstituteId === "none" || !selectedInstituteId) {
      // กรณีไม่ได้เลือกสำนัก หรือเลือก "ไม่ระบุ" -> แสดงเฉพาะแผนกที่ไม่มีสังกัด ? หรือแสดงทั้งหมด ?
      // เพื่อความยืดหยุ่น ถ้าเลือก "ไม่ระบุ" ให้แสดงแผนกที่ไม่มีสำนัก (Orphan)
      return d.instituteID === null || d.instituteID === undefined;
    }
    return String(d.instituteID) === selectedInstituteId;
  });

  // ⭐ Filter Section ตาม Department ที่เลือก
  const filteredSections =
    sections?.filter(
      (s) =>
        String(s.deptID) === selectedDeptId ||
        String(s.id) === selectedSectionId, // Force include selected section
    ) || [];

  async function handleSubmit() {
    if (!user) return;

    setIsUpdating(true);
    try {
      await updateOrganizationRole(user.relationID, {
        instituteID:
          selectedInstituteId !== "none" ? Number(selectedInstituteId) : null, // ⭐ ส่ง instituteID
        deptID: selectedDeptId !== "none" ? Number(selectedDeptId) : null,
        sectionID:
          selectedSectionId !== "none" ? Number(selectedSectionId) : null, // ⭐ ส่ง sectionID
        positionID:
          selectedPositionId !== "none" ? Number(selectedPositionId) : null,
      });

      onUpdated();
      onClose();
      toast.success(`อัปเดตตำแหน่ง/แผนกของ ${user.user.username} สำเร็จ`);
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการอัปเดต");
    }
    setIsUpdating(false);
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      {/* ⭐ ปรับปรุง UI: ใช้ flex-col และ p-6 สำหรับ padding ทั่วไป */}
      <SheetContent
        side="right"
        className="flex w-[100vw] flex-col p-6 sm:max-w-lg"
        data-testid={TEST_IDS.USER_ROLE_UPDATE.SHEET}
        overlayClassName="bg-transparent"
      >
        <SheetHeader>
          <SheetTitle>จัดการตำแหน่ง / แผนก</SheetTitle>
          <SheetDescription>
            แก้ไขตำแหน่งงานและแผนกของ:{" "}
            <span className="text-foreground font-medium">
              {user.user.username}
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* ส่วนฟอร์มหลัก (Scrollable Content) */}
        <div className="flex-1 space-y-6 overflow-y-auto pt-6">
          {" "}
          {/* ⭐ เพิ่ม padding ขวาให้เนื้อหาไม่ติดขอบ Sheet */}
          {/* ⭐ แสดง Error เมื่อดึงข้อมูลตัวเลือกไม่สำเร็จ */}
          {settingsError && (
            <div className="bg-destructive/10 border-destructive/30 text-destructive flex items-start space-x-3 rounded-lg border p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">ไม่สามารถโหลดรายการตัวเลือก</p>
                <p className="mt-1 text-xs">{settingsError}</p>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="text-muted-foreground flex h-48 items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
              กำลังโหลดตัวเลือก...
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="space-y-6 p-2"
            >
              {/* ⭐ Info Banner for Admin/Owner */}
              {(user.roleID === 1 || user.roleID === 2) && (
                <div className="flex items-start space-x-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>
                    {user.roleID === 1 ? "Owner" : "Admin"}{" "}
                    มีสิทธิ์เข้าถึงทุกส่วนงาน แต่ยังสามารถระบุแผนก/ตำแหน่งได้
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {/* สังกัดสำนัก - Show if Organization has Institute enabled */}
                {isInstitute && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      สังกัดสำนัก
                    </label>
                    <Select
                      value={selectedInstituteId}
                      onValueChange={(val) => {
                        setSelectedInstituteId(val);
                        setSelectedDeptId("none"); // Reset Dept
                        setSelectedSectionId("none"); // Reset Section
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full" data-testid={TEST_IDS.USER_ROLE_UPDATE.SELECT_INSTITUTE}>
                        <SelectValue placeholder="เลือกสำนัก" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] w-full">
                        <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                        {institutes?.length > 0 ? (
                          institutes.map((inst) => (
                            <SelectItem key={inst.id} value={String(inst.id)}>
                              {inst.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-slate-500">
                            <p className="mb-2">ไม่มีข้อมูลสำนัก</p>
                            <Link href="/organization-structure" data-testid={TEST_IDS.USER_ROLE_UPDATE.LINK_ORG_STRUCTURE}>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                              >
                                <PlusCircle className="mr-1 h-3 w-3" />
                                เพิ่มสำนักที่นี่
                              </Button>
                            </Link>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* แผนก */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    สังกัดแผนก
                  </label>
                  <Select
                    value={selectedDeptId}
                    onValueChange={(val) => {
                      setSelectedDeptId(val);
                      // Reset Section when Dept changes
                      setSelectedSectionId("none");
                    }}
                    disabled={isLoading}
                  >
                    {/* ⭐ [FIX] กำหนดความกว้าง w-full ให้กับ SelectTrigger */}
                    <SelectTrigger className="w-full" data-testid={TEST_IDS.USER_ROLE_UPDATE.SELECT_DEPARTMENT}>
                      <SelectValue placeholder="เลือกแผนก" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] w-full">
                      <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                      {filteredDepartments?.length > 0 ? (
                        filteredDepartments.map((dept) => (
                          <SelectItem key={dept.id} value={String(dept.id)}>
                            {dept.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-slate-500">
                          <p className="mb-2">ไม่มีข้อมูลแผนก</p>
                          <Link href="/organization-structure">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-blue-600"
                            >
                              <PlusCircle className="mr-1 h-3 w-3" />
                              เพิ่มแผนกที่นี่
                            </Button>
                          </Link>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* ฝ่าย (Section) - Show only if Organization has Section enabled */}
                {isSection && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      สังกัดฝ่าย
                    </label>
                    <Select
                      value={selectedSectionId}
                      onValueChange={setSelectedSectionId}
                      disabled={isLoading || selectedDeptId === "none"}
                    >
                      <SelectTrigger className="w-full" data-testid={TEST_IDS.USER_ROLE_UPDATE.SELECT_SECTION}>
                        <SelectValue placeholder="เลือกฝ่าย" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] w-full">
                        <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                        {selectedDeptId === "none" ? (
                          <div className="p-4 text-center text-sm text-slate-500">
                            กรุณาเลือกแผนกก่อน
                          </div>
                        ) : filteredSections?.length > 0 ? (
                          filteredSections.map((sec) => (
                            <SelectItem key={sec.id} value={String(sec.id)}>
                              {sec.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-slate-500">
                            <p className="mb-2">ไม่มีข้อมูลฝ่าย</p>
                            <Link href="/organization-structure">
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                              >
                                <PlusCircle className="mr-1 h-3 w-3" />
                                เพิ่มฝ่ายที่นี่
                              </Button>
                            </Link>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ตำแหน่ง */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    ตำแหน่งงาน
                  </label>
                  <Select
                    value={selectedPositionId}
                    onValueChange={setSelectedPositionId}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full" data-testid={TEST_IDS.USER_ROLE_UPDATE.SELECT_POSITION}>
                      <SelectValue placeholder="เลือกตำแหน่ง" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] w-full">
                      <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                      {positions?.length > 0 ? (
                        positions.map((pos) => (
                          <SelectItem key={pos.id} value={String(pos.id)}>
                            {pos.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-slate-500">
                          <p className="mb-2">ไม่มีข้อมูลตำแหน่ง</p>
                          <Link href="/organization-structure">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-blue-600"
                            >
                              <PlusCircle className="mr-1 h-3 w-3" />
                              เพิ่มตำแหน่งที่นี่
                            </Button>
                          </Link>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ⭐ เพิ่ม Separator ก่อนปุ่มเพื่อความสวยงาม */}
              <Separator className="mt-8 mb-0" />
            </form>
          )}
        </div>

        {/* SheetFooter สำหรับปุ่ม Action */}
        <SheetFooter className="mt-6 flex-shrink-0">
          <Button onClick={onClose} variant="outline" disabled={isLoading} data-testid={TEST_IDS.USER_ROLE_UPDATE.BUTTON_CANCEL}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || settingsError !== null}
            data-testid={TEST_IDS.USER_ROLE_UPDATE.BUTTON_SUBMIT}
          >
            {isUpdating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </div>
            ) : (
              "บันทึกการเปลี่ยนแปลง"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
