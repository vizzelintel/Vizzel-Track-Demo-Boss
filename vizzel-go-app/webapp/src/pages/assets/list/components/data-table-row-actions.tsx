'use client';

import { Row } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { TEST_IDS } from '@/components/test-ids';
import { usePermissions } from '@/hooks/use-permissions';

import { z } from 'zod';
import { useState } from 'react';

// ------------------------------------------------------------
// Schema
// ------------------------------------------------------------
const assetSchema = z
  .object({
    id: z.number(),
    assetName: z.string(),

    assetDetail: z.string().nullable().optional(),
    assetCategoryID: z.number().nullable().optional(),
    assetValue: z.number().nullable().optional(),
    assetNumber: z.string().nullable().optional(),
    isCheck: z.boolean().nullable().optional(),

    categoryName: z.string().nullable().optional(),
    typeName: z.string().nullable().optional(),

    receivedDate: z.string().nullable().optional(),
    expiryDate: z.string().nullable().optional(),

    users: z
      .array(
        z.object({
          id: z.number(),
          name: z.string().nullable().optional(),
          surname: z.string().nullable().optional(),
        }),
      )
      .nullable()
      .optional(),
  })
  .passthrough();

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------
export interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  onEdit?: (asset: any) => void;
  onDuplicate?: (asset: any) => void;
  onDelete?: (assetID: number) => void;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export function DataTableRowActions<TData>({
  row,
  onEdit,
  onDuplicate,
  onDelete,
}: DataTableRowActionsProps<TData>) {
  const { can } = usePermissions();
  const canEdit = can('assets', 'edit');
  const canDelete = can('assets', 'delete');
  const original = row.original;
  if (original == null || typeof original !== "object") {
    return null;
  }
  const parsed = assetSchema.safeParse(original);
  if (!parsed.success) {
    return null;
  }
  const asset = parsed.data;

  const userDisplay =
    asset.users && Array.isArray(asset.users)
      ? asset.users
          .map((u) => [u.name, u.surname].filter(Boolean).join(' '))
          .join(', ') || '-'
      : '-';

  const handleDeleteConfirm = () => {
    onDelete?.(asset.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="data-[state=open]:bg-muted size-8"
            data-testid={TEST_IDS.ASSET.BUTTON_ROW_ACTIONS(asset.id)}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[200px]">
          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit?.(asset)} data-testid={TEST_IDS.ASSET.BUTTON_ROW_EDIT(asset.id)}>
              แก้ไข
            </DropdownMenuItem>
          )}

          {canEdit && (
            <DropdownMenuItem onClick={() => onDuplicate?.(asset)} data-testid={TEST_IDS.ASSET.BUTTON_ROW_DUPLICATE(asset.id)}>
              ทำสำเนา
            </DropdownMenuItem>
          )}

          {canEdit && <DropdownMenuSeparator />}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>ข้อมูลเพิ่มเติม</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled>
                หมวดหมู่: {asset.categoryName || '-'}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                ประเภท: {asset.typeName || '-'}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                วันที่ได้รับ:{' '}
                {asset.receivedDate
                  ? new Date(asset.receivedDate).toLocaleDateString('th-TH')
                  : '-'}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                มูลค่า:{' '}
                {asset.assetValue ? asset.assetValue.toLocaleString() : '-'} บาท
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                สถานะ: {asset.isCheck ? 'ตรวจนับแล้ว' : 'ยังไม่ตรวจนับ'}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                ผู้ถือครอง: {userDisplay}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {canDelete && <DropdownMenuSeparator />}

          {canDelete && (
            <ConfirmDeleteDialog
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600 focus:text-red-600"
                  data-testid={TEST_IDS.ASSET.BUTTON_ROW_DELETE(asset.id)}
                >
                  ลบ
                </DropdownMenuItem>
              }
              title={`ยืนยันการลบ "${asset.assetName}" ?`}
              description="หากคุณลบรายการนี้ ข้อมูลจะไม่สามารถกู้คืนได้"
              onConfirm={handleDeleteConfirm}
              confirmText="ลบเลย"
              confirmButtonTestId={TEST_IDS.ASSET.BUTTON_ROW_DELETE_CONFIRM(asset.id)}
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}