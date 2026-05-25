// frontend/app/(protected)/users/components/AddUserToOrgForm.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  createUserInOrganization,
  updateUser,
  updateOrganizationRole,
  OrgUser,
} from "@/lib/user";
import { cn } from "@/lib/utils";
import { TEST_IDS } from "@/components/test-ids";

interface AddUserToOrgFormProps {
  organizationID: number;
  onSuccess: () => void;
  onClose: () => void;
  initialData?: OrgUser | null;
  limit?: any;
  currentUsage?: number;
}

// ⭐ ข้อมูลบทบาท (ควรดึงมาจาก API จริงๆ)
const AVAILABLE_ROLES = [
  { id: 3, name: "Staff" },
  { id: 4, name: "Checker" },
  { id: 5, name: "Viewer" },
];

export function AddUserToOrgForm({
  organizationID,
  onSuccess,
  onClose,
  initialData,
  limit,
  currentUsage,
}: AddUserToOrgFormProps) {
  const isEditMode = !!initialData;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [roleID, setRoleID] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (initialData) {
      setUsername(initialData.user.username || "");
      setEmail(initialData.user.email || "");
      setName(initialData.user.name || "");
      setSurname(initialData.user.surname || "");
      setSurname(initialData.user.surname || "");
      setRoleID(String(initialData.roleID));
    }
    setChangePassword(false);
    setPassword("");
    setConfirmPassword("");
  }, [initialData]);

  const [changePassword, setChangePassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check Limit
    if (!isEditMode && limit && limit.userLimit > 0) {
      // Prefer currentUsage (from real-time list) over limit.userCount (from potentially stale limit API)
      const usage = currentUsage !== undefined ? currentUsage : limit.userCount;

      if (usage >= limit.userLimit) {
        toast.error(
          `ไม่สามารถเพิ่มสมาชิกได้: ถึงขีดจำกัดแล้ว (${usage}/${limit.userLimit})`,
        );
        return;
      }
    }

    // Validation: Require Name/Surname only in Edit Mode
    if (!isEditMode) {
      if (!email || !username || !password || !confirmPassword) {
        toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("รหัสผ่านไม่ตรงกัน");
        return;
      }
    } else {
      if (!username) {
        toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }
      // Edit Mode Password Validation
      if (changePassword) {
        if (!password || !confirmPassword) {
          toast.error("กรุณากรอกรหัสผ่านใหม่");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      if (isEditMode && initialData) {
        // Update User Profile
        await updateUser(initialData.user.id, {
          name,
          surname,
          username,
          ...(changePassword ? { password } : {}), // Add password if changing
        });

        // Update Role if changed
        if (roleID && Number(roleID) !== initialData.roleID) {
          // Role update logic (omitted as per previous context)
        }

        toast.success("แก้ไขข้อมูลสำเร็จ");
      } else {
        // Create User
        const res = await createUserInOrganization(organizationID, {
          username,
          email,
          password,
          name,
          surname,
          status: false, // Inactive by default for admin-added users
        });

        toast.success(`เพิ่มสมาชิก ${username} สำเร็จ`);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(`ดำเนินการไม่สำเร็จ: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            ชื่อผู้ใช้ <span className="text-red-500">*</span>
          </label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="johndoe"
            required
            disabled={isLoading}
            data-testid={TEST_IDS.USER_FORM.INPUT_USERNAME}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            อีเมล <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            disabled={isLoading || isEditMode} // Email usually cannot be changed easily
            data-testid={TEST_IDS.USER_FORM.INPUT_EMAIL}
          />
        </div>
      </div>

      {!isEditMode && (
        <div className="grid grid-cols-2 gap-4">
          {/* Password fields for New User - Always Visible */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              รหัสผ่าน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                data-testid={TEST_IDS.USER_FORM.INPUT_PASSWORD}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-full px-3 py-2 bg-transparent hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                data-testid={TEST_IDS.USER_FORM.INPUT_CONFIRM_PASSWORD}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-full px-3 py-2 bg-transparent hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditMode && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="changePassword"
              className="h-4 w-4 rounded border-gray-300"
              checked={changePassword}
              onChange={(e) => setChangePassword(e.target.checked)}
            />
            <label
              htmlFor="changePassword"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              เปลี่ยนรหัสผ่านใหม่
            </label>
          </div>

          {changePassword && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  รหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={changePassword}
                    disabled={isLoading}
                    className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-0 right-0 h-full px-3 py-2 bg-transparent hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={changePassword}
                    disabled={isLoading}
                    className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-0 right-0 h-full px-3 py-2 bg-transparent hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">ชื่อ</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="สมชาย"
            required={false}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">นามสกุล</label>
          <Input
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="ใจดี"
            required={false}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Role Selection - Disabled for now as API doesn't seem to support update, and create defaults to 3 */}
      {/* 
      <div>
        <label className="text-sm font-medium">บทบาท</label>
        <Select onValueChange={setRoleID} value={roleID || undefined} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกบทบาท" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_ROLES.map((role) => (
              <SelectItem key={role.id} value={String(role.id)}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      */}

      <div className="flex items-center justify-end gap-3 border-t pt-6 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="px-6"
          data-testid={TEST_IDS.USER_FORM.BUTTON_CANCEL}
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          data-testid={TEST_IDS.USER_FORM.BUTTON_SUBMIT}
          className={cn(
            "min-w-[140px] shadow-sm",
            isLoading && "cursor-not-allowed opacity-80",
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังบันทึก...
            </>
          ) : isEditMode ? (
            "บันทึกการแก้ไข"
          ) : (
            "ยืนยันการเพิ่มสมาชิก"
          )}
        </Button>
      </div>
    </form>
  );
}
