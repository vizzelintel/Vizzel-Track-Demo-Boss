// frontend/app/(protected)/users/components/UserViewSheet.tsx
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator'; // ⭐ เพิ่ม Separator
import { Badge } from '@/components/ui/badge'; // ⭐ เพิ่ม Badge
import { User, Mail, Building, Briefcase } from 'lucide-react'; // ⭐ เพิ่ม Icons
import type { OrgUser } from '@/lib/user';

type Props = {
  user: OrgUser | null;
  open: boolean;
  onClose: () => void;
};

// Helper: แปลง RoleID เป็น Label
const ROLE_LABELS: Record<number, string> = {
  1: 'Owner',
  2: 'Admin',
  3: 'Staff',
  // ... เพิ่ม Role อื่นๆ
};

function getRoleLabel(roleID: number | null | undefined) {
  if (!roleID) return 'ไม่ระบุ';
  return ROLE_LABELS[roleID] ?? `Role ${roleID}`;
}

// ⭐ Component Helper สำหรับแสดงคู่ข้อมูล
const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) => (
  <div className="flex items-start space-x-3">
    <Icon className="text-muted-foreground mt-1 h-4 w-4 flex-shrink-0" />
    <div className="flex min-w-0 flex-col">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-foreground truncate text-sm font-semibold">
        {value || '-'}
      </span>
    </div>
  </div>
);

export function UserViewSheet({ user, open, onClose }: Props) {
  if (!user) return null;

  const userProfile = user.user;
  const positionName = user.position?.name;
  const departmentName = user.department?.name;
  const organizationName = user.organization?.name;
  const fullName =
    `${userProfile.name ?? ''} ${userProfile.surname ?? ''}`.trim() ||
    userProfile.username;
  const roleLabel = getRoleLabel(user.roleID);

  // แปลงสถานะ Verify เป็น Badge สี
  const verifyStatus = user.verify;
  const statusBadge = user.status ? (
    <Badge variant="default" className="bg-green-600 hover:bg-green-600">
      Active
    </Badge>
  ) : (
    <Badge variant="destructive">Inactive</Badge>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-[100vw] p-0 sm:max-w-md md:max-w-lg"
        overlayClassName="bg-transparent"
      >
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>ข้อมูลผู้ใช้: {userProfile.username}</SheetTitle>
              <SheetDescription>
                รายละเอียดโปรไฟล์และการเป็นสมาชิกในองค์กร
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* ส่วนที่ 1: ข้อมูลส่วนตัว */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                  <User className="text-primary h-5 w-5" />
                  ข้อมูลโปรไฟล์
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoItem icon={User} label="ชื่อ-สกุล" value={fullName} />
                  <InfoItem
                    icon={Mail}
                    label="อีเมล (Username)"
                    value={userProfile.email}
                  />
                  {/* TODO: เพิ่ม Mobile, Line, Facebook ถ้ามีใน OrgUser */}
                </div>
              </section>

              <Separator />

              {/* ส่วนที่ 2: ข้อมูลองค์กรและการเป็นสมาชิก */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                  <Building className="text-primary h-5 w-5" />
                  สถานะในองค์กร
                </h3>

                {/* องค์กรหลัก */}
                <div className="mb-4">
                  <span className="text-muted-foreground text-xs font-medium">
                    องค์กร
                  </span>
                  <p className="text-foreground text-lg font-bold">
                    {organizationName}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoItem
                    icon={Briefcase}
                    label="บทบาทหลัก"
                    value={roleLabel}
                  />
                  <InfoItem
                    icon={Briefcase}
                    label="ตำแหน่งงาน"
                    value={positionName}
                  />
                  <InfoItem
                    icon={Building}
                    label="แผนก"
                    value={departmentName}
                  />
                </div>

                <Separator className="my-4" />

                {/* สถานะ */}
                <div>
                  <p className="mb-1 text-sm font-medium">
                    สถานะการเป็นสมาชิก:
                  </p>
                  <div className="flex items-center gap-3">
                    {statusBadge}
                    <span className="text-muted-foreground text-xs">
                      (Verify: {verifyStatus})
                    </span>
                  </div>
                </div>

                {/* วันที่เข้าร่วม */}
                <div className="mt-4">
                  <p className="mb-1 text-sm font-medium">วันที่เข้าร่วม:</p>
                  <span className="text-muted-foreground text-sm">
                    {/* สมมติว่า OrgUser มี createdAt ด้วย */}
                    {'ไม่ระบุ (ข้อมูลจาก tab_user_organization_role)'}
                  </span>
                </div>
              </section>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
