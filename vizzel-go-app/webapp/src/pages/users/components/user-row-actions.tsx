// frontend/app/(protected)/users/components/UserRowActions.tsx
'use client';

import { MoreHorizontal, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import type { OrgUser } from '@/lib/user';
import { TEST_IDS } from '@/components/test-ids';

interface UserRowActionsProps {
  user: OrgUser;

  onView?: (user: OrgUser) => void;
  onEdit?: (user: OrgUser) => void;
  onUpdateRole?: (relationID: number) => void;
  onAssignRole?: (item: OrgUser, newRoleID: 3 | 4) => void;

  // ⭐ Action ที่ใช้ API delete
  onDeleteUser?: (item: OrgUser) => Promise<void>;

  // ⭐ [FIX] เพิ่ม onRemoveFromOrg ที่ถูกส่งมาจาก Parent
  onRemoveFromOrg?: (relationID: number) => Promise<void>;
}

export function UserRowActions({
  user,
  onView,
  onEdit,
  onUpdateRole,
  onAssignRole,
  onDeleteUser,
}: UserRowActionsProps) {
  // กำหนดว่าผู้ใช้เป็น Owner (1) หรือ Admin (2) หรือไม่ (เพื่อป้องกันการจัดการตัวเอง)
  const isProtectedUser = user.roleID === 1 || user.roleID === 2;
  const isOfficer = user.roleID === 3;
  const isMember = user.roleID === 4;

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="data-[state=open]:bg-muted size-8"
            data-testid={TEST_IDS.USERS.BUTTON_ROW_ACTIONS(user.user.id)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={() => onView?.(user)}
            data-testid={TEST_IDS.USERS.BUTTON_ROW_VIEW(user.user.id)}>
            ดูข้อมูลผู้ใช้
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => onEdit?.(user)}
            data-testid={TEST_IDS.USERS.BUTTON_ROW_EDIT(user.user.id)}>
            แก้ไขข้อมูล
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => onUpdateRole?.(user.relationID)}
            data-testid={TEST_IDS.USERS.BUTTON_ROW_UPDATE_ROLE(user.user.id)}>
            จัดการตำแหน่ง
          </DropdownMenuItem>

          {/* เปลี่ยน Member ↔ Officer */}
          {!isProtectedUser && isMember && (
            <DropdownMenuItem
              onClick={() => onAssignRole?.(user, 3)}
              className="text-emerald-600 focus:text-emerald-600"
            >
              <Shield className="mr-2 h-4 w-4" />
              เปลี่ยนเป็น Officer
            </DropdownMenuItem>
          )}
          {!isProtectedUser && isOfficer && (
            <DropdownMenuItem
              onClick={() => onAssignRole?.(user, 4)}
              className="text-slate-600 focus:text-slate-600"
            >
              <User className="mr-2 h-4 w-4" />
              เปลี่ยนเป็น Member
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* ⭐ เมนูสำหรับการลบผู้ใช้ (ใช้ API delete) */}
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              disabled={isProtectedUser}
              data-testid={TEST_IDS.USERS.BUTTON_ROW_DELETE(user.user.id)}
            >
              ลบผู้ใช้ (Delete) {isProtectedUser && '(Owner/Admin)'}
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirm Delete */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ยืนยันการลบผู้ใช้: {user.user.username}
          </AlertDialogTitle>
          <AlertDialogDescription>
            ผู้ใช้นี้จะถูกลบออกจากองค์กรและไม่สามารถเข้าถึงข้อมูลขององค์กรได้อีก
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid={TEST_IDS.USER_FORM.BUTTON_CANCEL}>ยกเลิก</AlertDialogCancel>

          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            data-testid={TEST_IDS.USER_FORM.BUTTON_DELETE_CONFIRM}
            onClick={() => onDeleteUser?.(user)}
          >
            ยืนยันการลบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

