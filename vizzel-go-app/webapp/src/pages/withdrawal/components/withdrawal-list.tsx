'use client';

import { TEST_IDS } from '@/components/test-ids';
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
import { getApproveWithdrawals, WithdrawalData } from '@/lib/withdrawal';
import { useUser } from '@/hooks/use-user';
import { Badge } from '@/components/ui/badge';
import { Package, User, Calendar, Tag, ArrowRight } from 'lucide-react';

interface WithdrawalListProps {
  initialData?: any[];
}

export function WithdrawalList({ initialData = [] }: WithdrawalListProps) {
  const { user } = useUser();

  const { data: res, isLoading } = useSWR(
    user?.organizationRelation?.organizationID
      ? [`/withdrawal/history`, user.organizationRelation.organizationID]
      : null,
    ([, orgID]) => getApproveWithdrawals(orgID, -1, 1, 100),
    {
      fallbackData: { data: initialData },
      revalidateOnFocus: false,
    },
  );

  const data = (res?.data || []) as WithdrawalData[];
  const loading = isLoading && !res?.data;

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
          ไม่พบประวัติการทำรายการ
        </p>
        <p className="text-sm">ประวัติการเบิก-ยืมของคุณจะแสดงที่นี่</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <Table data-testid={TEST_IDS.WITHDRAWAL.TABLE}>
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
            <TableHead className="py-4 text-center font-semibold text-gray-700">
              สถานะ
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            // Use proper types from library
            // item.internalWithdrawal is typed as any in interface but likely object
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // Unified API returns assetName/assetNumber at root level
            // Fallback to old nested structure if needed (though API refactor should handle it)
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

            if (item.origin === 'internal') {
              if (item.type === 1) {
                typeLabel = 'ยืม (ภายใน)';
                typeColor = 'outline'; // Blueish tint usually
              } else {
                typeLabel = 'เบิก (ภายใน)';
                typeColor = 'default';
              }
            } else {
              typeLabel = 'ยืม (ภายนอก)';
              typeColor = 'outline';
            }

            const requester = item.requesterName || '-';

            // Status Logic
            let status = (
              <Badge
                variant="secondary"
                className="border-0 bg-gray-100 px-3 py-1 font-medium text-gray-600"
              >
                รออนุมัติ
              </Badge>
            );

            const approval = item.approveWithdrawals?.[0];

            if (item.isConfirmed) {
              // If confirmed, check if taken
              if (approval) {
                if (approval.isTake === 1) {
                  status = (
                    <Badge className="border-0 bg-green-100 px-3 py-1 font-medium text-green-700 shadow-none hover:bg-green-100">
                      รับของแล้ว
                    </Badge>
                  );
                } else if (approval.isTake === 2) {
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
                      อนุมัติแล้ว
                    </Badge>
                  );
                }
              } else {
                status = (
                  <Badge className="border-0 bg-blue-100 px-3 py-1 font-medium text-blue-700 shadow-none hover:bg-blue-100">
                    อนุมัติแล้ว
                  </Badge>
                );
              }
            }

            return (
              <TableRow
                key={`${item.origin}-${item.id}`}
                className="group border-b border-gray-50 transition-colors hover:bg-blue-50/30"
                data-testid={TEST_IDS.WITHDRAWAL.TABLE_ROW(item.id)}
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
                    {/* {typeLabel.includes("เบิก") ? <ArrowRight className="w-3 h-3" /> : <Calendar className="w-3 h-3" />} */}
                    {typeLabel}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    {requester}
                  </div>
                </TableCell>
                <TableCell className="py-4 text-gray-600">
                  {item.createdAt
                    ? format(new Date(item.createdAt), 'd MMM yy HH:mm', {
                        locale: th,
                      })
                    : '-'}
                </TableCell>
                <TableCell className="py-4 text-center">{status}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
