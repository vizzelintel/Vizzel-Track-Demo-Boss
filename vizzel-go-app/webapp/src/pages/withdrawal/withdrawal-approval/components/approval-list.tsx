'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  getApproveWithdrawals,
  confirmWithdrawal,
  confirmTake,
  WithdrawalData,
} from '@/lib/withdrawal';
import { useUser } from '@/hooks/use-user';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Check,
  X,
  PackageCheck,
  Package,
  Tag,
  User,
  Clock,
} from 'lucide-react';
import { ConfirmDialog } from './confirm-dialog';
import { toast } from 'sonner';
import { TEST_IDS } from '@/components/test-ids';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ApprovalListProps {
  isApprove: number; // 0 = pending, 1 = approved
  initialData?: any[];
}

export function ApprovalList({
  isApprove,
  initialData = [],
}: ApprovalListProps) {
  const { user } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    type: 1 | 2; // 1=Internal, 2=External
    action: 'approve' | 'reject' | 'take';
    approveID?: number; // Needed for 'take' action
  } | null>(null);

  const {
    data: res,
    isLoading,
    mutate,
  } = useSWR(
    user?.organizationRelation?.organizationID
      ? [
          `/withdrawal/approval`,
          user.organizationRelation.organizationID,
          isApprove,
        ]
      : null,
    ([, orgID, status]) => getApproveWithdrawals(orgID, status, 1, 100),
    {
      fallbackData: { data: initialData },
      revalidateOnFocus: false,
    },
  );

  const data = (res?.data || []) as WithdrawalData[];
  const loading = isLoading && !res?.data;

  const handleAction = (
    item: WithdrawalData,
    action: 'approve' | 'reject' | 'take',
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origin = item.origin;
    const type = origin === 'external' ? 2 : 1;

    // Unified API returns flattened approval fields
    const approveID =
      (item as any).approvalID || item.approveWithdrawals?.[0]?.id;

    if (action === 'take' && !approveID) {
      toast.error('ไม่พบข้อมูลการอนุมัติ');
      return;
    }

    setSelectedItem({
      id: item.id,
      type,
      action,
      approveID,
    });
    setDialogOpen(true);
  };

  const handleConfirm = async (payload: { note?: string }) => {
    if (!selectedItem) return;

    try {
      if (selectedItem.action === 'take') {
        if (!selectedItem.approveID) return;
        const res = (await confirmTake(selectedItem.approveID, {
          isTake: true,
          note: payload.note,
        })) as { data?: { qrPayload?: string; issueToken?: string } };
        const qr = res?.data?.qrPayload;
        if (qr) {
          const url = `${window.location.origin}${qr}`;
          toast.success('ออกของแล้ว — เปิด QR', {
            description: url,
            duration: 12000,
          });
        } else {
          toast.success('ยืนยันการรับของสำเร็จ');
        }
      } else {
        await confirmWithdrawal(selectedItem.id, selectedItem.type, {
          isConfirm: selectedItem.action === 'approve' ? 1 : 0,
          note: payload.note,
        });
        toast.success(
          selectedItem.action === 'approve'
            ? 'อนุมัติรายการสำเร็จ'
            : 'ปฏิเสธรายการสำเร็จ',
        );
      }

      setDialogOpen(false);
      mutate(); // Refresh list
    } catch (error) {
      console.error('Failed to process action', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground animate-pulse py-12 text-center">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
        <Package className="mb-4 h-12 w-12 opacity-20" />
        <p className="text-lg font-medium text-gray-900">
          ไม่พบรายการ{isApprove === 0 ? 'รออนุมัติ' : 'ที่อนุมัติแล้ว'}
        </p>
        <p className="text-sm">รายการคำขอจะแสดงที่นี่เมื่อมีผู้ทำรายการ</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <Table data-testid={TEST_IDS.WITHDRAWAL_APPROVAL.TABLE}>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="border-b border-gray-100 hover:bg-transparent">
              <TableHead className="py-4 font-semibold text-gray-700">
                รหัสสินทรัพย์
              </TableHead>
              <TableHead className="py-4 font-semibold text-gray-700">
                ชื่อสินทรัพย์
              </TableHead>
              <TableHead className="py-4 font-semibold text-gray-700">
                ประเภท
              </TableHead>
              <TableHead className="py-4 font-semibold text-gray-700">
                ผู้ขอเบิก/ยืม
              </TableHead>
              <TableHead className="py-4 font-semibold text-gray-700">
                วันที่ทำรายการ
              </TableHead>
              <TableHead className="py-4 font-semibold text-gray-700">
                สถานะ
              </TableHead>
              <TableHead className="py-4 text-right font-semibold text-gray-700">
                จัดการ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              // Unified API returns assetName/assetNumber at root level
              const assetName =
                (item as any).assetName ||
                item.internalWithdrawal?.asset?.assetName ||
                item.externalWithdrawal?.asset?.assetName ||
                '-';
              const assetNumber =
                (item as any).assetNumber ||
                item.internalWithdrawal?.asset?.assetNumber ||
                item.externalWithdrawal?.asset?.assetNumber ||
                '-';

              let typeLabel = 'ไม่ระบุ';
              let typeColor = 'secondary';
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (item.origin === 'internal') {
                if (item.type === 1) {
                  typeLabel = 'ยืม (ภายใน)';
                  typeColor = 'outline';
                } else {
                  typeLabel = 'เบิก (ภายใน)';
                  typeColor = 'default';
                }
              } else {
                typeLabel = 'ยืม (ภายนอก)';
                typeColor = 'outline';
              }

              let status = (
                <Badge
                  variant="secondary"
                  className="border-0 bg-gray-100 px-3 py-1 font-medium text-gray-600"
                >
                  รออนุมัติ
                </Badge>
              );

              // Status Logic
              const approvalID = (item as any).approvalID;
              const approvalIsTake = (item as any).approvalIsTake;

              // Fallback to old nested structure if flattened fields are missing (e.g. from strictly typed mock)
              const approval = item.approveWithdrawals?.[0];
              const isTake =
                approvalIsTake !== undefined
                  ? approvalIsTake
                  : approval?.isTake;

              if ((item as any).deletedAt) {
                status = (
                  <Badge
                    variant="destructive"
                    className="px-3 py-1 font-medium shadow-none bg-red-100 text-red-700 hover:bg-red-200 border-0"
                  >
                    ไม่อนุมัติ (Rejected)
                  </Badge>
                );
              } else if (item.isConfirmed) {
                if (isTake === 1) {
                  status = (
                    <Badge className="border-0 bg-green-100 px-3 py-1 font-medium text-green-700 shadow-none hover:bg-green-100">
                      รับของแล้ว
                    </Badge>
                  );
                } else if (isTake === 2) {
                  status = (
                    <Badge
                      variant="destructive"
                      className="px-3 py-1 font-medium shadow-none"
                    >
                      ไม่รับของ
                    </Badge>
                  );
                } else {
                  status = (
                    <Badge className="border-0 bg-blue-100 px-3 py-1 font-medium text-blue-700 shadow-none hover:bg-blue-100">
                      อนุมัติแล้ว (รอรับ)
                    </Badge>
                  );
                }
              }

              return (
                <TableRow
                  key={`${item.origin}-${item.id}`}
                  className="group border-b border-gray-50 transition-colors hover:bg-blue-50/30"
                  data-testid={TEST_IDS.WITHDRAWAL_APPROVAL.TABLE_ROW(item.id)}
                >
                  <TableCell className="py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-blue-500" />
                      {assetNumber}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="font-medium text-gray-700">{assetName}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant={typeColor as any}
                      className="gap-1 font-normal shadow-sm"
                    >
                      {typeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      {item.requesterName}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-gray-600">
                    {item.createdAt
                      ? format(new Date(item.createdAt), 'd MMM yy HH:mm', {
                          locale: th,
                        })
                      : '-'}
                  </TableCell>
                  <TableCell className="py-4">{status}</TableCell>
                  <TableCell className="py-4 text-right">
                    <TooltipProvider>
                      <div className="flex justify-end gap-2">
                        {isApprove === 0 && !item.isConfirmed && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  className="h-9 w-9 rounded-full border-0 bg-green-100 p-0 text-green-700 shadow-none transition-colors hover:bg-green-200 hover:text-green-800"
                                  onClick={() => handleAction(item, 'approve')}
                                  data-testid={TEST_IDS.WITHDRAWAL_APPROVAL.BUTTON_APPROVE(item.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>อนุมัติ</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  className="h-9 w-9 rounded-full border-0 bg-red-100 p-0 text-red-700 shadow-none transition-colors hover:bg-red-200 hover:text-red-800"
                                  onClick={() => handleAction(item, 'reject')}
                                  data-testid={TEST_IDS.WITHDRAWAL_APPROVAL.BUTTON_REJECT(item.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>ไม่อนุมัติ</TooltipContent>
                            </Tooltip>
                          </>
                        )}

                        {isApprove === 1 &&
                          item.isConfirmed &&
                          (approvalIsTake === 0 || approval?.isTake === 0) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  className="flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700"
                                  onClick={() => handleAction(item, 'take')}
                                >
                                  <PackageCheck className="h-4 w-4" />
                                  <span className="hidden sm:inline">
                                    ยืนยันรับของ
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                ยืนยันการรับ/คืนของ
                              </TooltipContent>
                            </Tooltip>
                          )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
        action={selectedItem?.action || 'approve'}
      />
    </>
  );
}
