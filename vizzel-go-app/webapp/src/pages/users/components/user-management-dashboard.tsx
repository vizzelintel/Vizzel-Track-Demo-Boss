"use client";

import { useState, useMemo, useRef } from "react";
import {
  User,
  Search,
  Users,
  Shield,
  UserPlus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Filter,
  FileDown,
  FileUp,
  FileText,
  Settings2,
  BadgeCheck,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

import {
  verifyUserRequest,
  toggleUserActive,
  deleteUserFromOrganization,
  updateOrganizationRole,
  assignUserRole,
  importUserToOrganization,
  downloadUserTemplate,
  exportUsersFromOrganization,
  fetchOrganizationUsers,
} from "@/lib/user";
import type { OrgUser, OrganizationUsersResponse } from "@/lib/user";
import { useUser } from "@/hooks/use-user";
import { useOrganizationUsers } from "@/hooks/use-organization-users";
import { getImageUrl, cn } from "@/lib/utils";
import { PREFIX_OPTIONS } from "@/lib/constants";
import { SidebarInset } from "@/components/ui/sidebar";
import { useOrganizationLimits } from "@/hooks/use-organization-limits";
import { useDebounce } from "@/hooks/use-debounce";

import { UserPagination } from "./user-pagination";
import { UserRowActions } from "./user-row-actions";
import { AddUserToOrgForm } from "./AddUserToOrgForm";
import { UserViewSheet } from "./UserViewSheet";
import { UserRoleUpdateSheet } from "./UserRoleUpdateSheet";
// Custom Dialogs
import { UserImportDialog } from "./user-import-dialog";
import {
  ConfirmUserImportDialog,
  ConfirmUserData,
} from "./confirm-user-import-dialog";
import { TEST_IDS } from "@/components/test-ids";

// --- Validations & Mappings ---
// Schema for User Import
const userRowSchema = z.object({
  username: z.string().optional(), // EmployeeID
  password: z.string().optional(), // Often automatic
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  prefix: z
    .string()
    .optional()
    .refine(
      (val) => !val || PREFIX_OPTIONS.includes(val),
      `คำนำหน้าต้องเป็น ${PREFIX_OPTIONS.join(", ")}`,
    ),
  name: z.string().optional(),
  surname: z.string().optional(),
  mobile: z.string().optional(),
  position: z.string().optional(),
});

// Comprehensive Mapping (Supports both Legacy & Standard Template)
const USER_HEADER_MAPPING: Record<string, string> = {
  // Legacy Format (Thai/Custom)
  employeeid: "username",
  prefixname: "prefix",
  firstname: "name",
  lastname: "surname",
  phone: "mobile",
  // department: "position", // REMOVED - Wrong mapping

  // Standard Template Format (English keys)
  username: "username",
  password: "password",
  email: "email",
  prefix: "prefix",
  name: "name",
  surname: "surname",
  mobile: "mobile",
  role: "role",
  institute: "institute",
  department: "department",
  dept: "department",
  section: "section",
  position: "position",

  // Fallback/Variations
  รหัสพนักงาน: "username",
  รหัสผ่าน: "password",
  อีเมล: "email",
  คำนำหน้า: "prefix",
  เบอร์โทร: "mobile",
  ตำแหน่ง: "position",
  ชื่อ: "name",
  นามสกุล: "surname",
  สำนัก: "institute",
  แผนก: "department",
  ฝ่าย: "section",
};

// --- Helper functions ---
const ROLE_LABELS: Record<number, string> = {
  1: "Admin",
  2: "Admin",
  3: "เจ้าหน้าที่",
  4: "สมาชิก",
};

const ROLE_COLORS: Record<number, string> = {
  1: "bg-purple-500/10 text-purple-700 border-purple-200",
  2: "bg-blue-500/10 text-blue-700 border-blue-200",
  3: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  4: "bg-slate-500/10 text-slate-700 border-slate-200",
};

function getRoleLabel(roleID: number | null | undefined) {
  if (!roleID) return "-";
  return ROLE_LABELS[roleID] ?? `Role ${roleID}`;
}

function getRoleBadgeColor(roleID: number | null | undefined) {
  if (!roleID) return "bg-gray-100 text-gray-800";
  return ROLE_COLORS[roleID] ?? "bg-gray-100 text-gray-800";
}

function getFullName(user: OrgUser["user"]) {
  if (user.name || user.surname) {
    return `${user.name ?? ""} ${user.surname ?? ""}`.trim();
  }
  return user.username || "ไม่ระบุชื่อ";
}

// Sort by 3-Tier System: Pinned > Role (Officer > Member) > Active Status > UpdatedAt
function sortUsers(users: OrgUser[]) {
  return [...users].sort((a, b) => {
    // 1. Pinned Roles (Owner/Admin) - RoleID 1 & 2
    const isAPinned = a.roleID === 1 || a.roleID === 2;
    const isBPinned = b.roleID === 1 || b.roleID === 2;

    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    if (isAPinned && isBPinned) return a.relationID - b.relationID;

    // 2. Role: Officer (3) > Member (4)
    // นี่คือส่วนที่คุม 'สีเขียว' (Checked Switch) ให้พยายามอยู่บนกว่า 'สีเทา' (Unchecked Switch)
    if (a.roleID !== b.roleID) {
      return a.roleID < b.roleID ? -1 : 1;
    }

    // 3. Status: Active (true) > Inactive (false)
    if (a.status !== b.status) {
      return a.status ? -1 : 1;
    }

    // 4. UpdatedAt Sorting Strategy (Newest First within their status group)
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;

    if (dateA !== dateB) return dateB - dateA;

    // 5. ID: Ascending (Fallback)
    return a.relationID - b.relationID;
  });
}

interface UserManagementDashboardProps {
  initialActiveUsers?: any;
  initialPendingUsers?: any;
  initialLimits?: any;
}

export default function UserManagementDashboard({
  initialActiveUsers,
  initialPendingUsers,
  initialLimits,
}: UserManagementDashboardProps) {
  const [isAddUserFormOpen, setIsAddUserFormOpen] = useState(false);

  // Generic Import State
  const [isImportGridOpen, setIsImportGridOpen] = useState(false);
  const [isConfirmImportOpen, setIsConfirmImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<
    { success: number; fail: number; total: number } | undefined
  >(undefined);
  const [isImporting, setIsImporting] = useState(false);
  const isImportCancelled = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmData, setConfirmData] = useState<ConfirmUserData>({
    totalRows: 0,
    added: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    quotaBefore: 0,
    quotaAfter: 0,
  }); // Local state for confirm dialog

  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Sheet States
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);

  const { user: currentUser, loading: userLoading } = useUser();
  const organizationID = currentUser?.organizationID ?? null;

  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState("active");

  const {
    data: activeData,
    loading: activeUsersLoading,
    setData: setActiveData,
    page: activePage,
    setPage: setActivePage,
    refresh: refreshActive,
  } = useOrganizationUsers(
    organizationID,
    1,
    pageSize,
    debouncedSearchQuery,
    2,
    initialActiveUsers,
  );

  const {
    data: pendingData,
    loading: pendingUsersLoading,
    setData: setPendingData,
    page: pendingPage,
    setPage: setPendingPage,
    refresh: refreshPending,
  } = useOrganizationUsers(
    organizationID,
    1,
    pageSize,
    debouncedSearchQuery,
    1,
    initialPendingUsers,
  );

  // FETCH ALL FOR TOTAL COUNT (Verify = undefined)
  const { data: allUsersData, refresh: refreshAll } = useOrganizationUsers(
    organizationID,
    1,
    1,
    "",
    undefined,
  );

  const {
    userLimit,
    officerLimit,
    refresh: refreshLimits,
    setOfficerLimit,
    setUserLimit,
  } = useOrganizationLimits(organizationID, initialLimits);

  const refresh = () => {
    refreshActive();
    refreshPending();
    refreshAll();
  };

  const refreshLimitsWithRetry = () => {
    refreshLimits();
    setTimeout(() => refreshLimits(), 500);
    setTimeout(() => refreshLimits(), 1500);
  };

  const handlePageSizeChange = (newSize: number) => {
    // Calculate new pages based on the first item currently viewed to maintain position
    const newActivePage =
      Math.floor(((activePage - 1) * pageSize) / newSize) + 1;
    const newPendingPage =
      Math.floor(((pendingPage - 1) * pageSize) / newSize) + 1;

    setPageSize(newSize);
    setActivePage(newActivePage);
    setPendingPage(newPendingPage);
  };

  const isLoading = userLoading || activeUsersLoading || pendingUsersLoading;

  // Filter & Sort Logic
  const activeUsers = useMemo(() => {
    let users = activeData?.data?.filter((u: OrgUser) => u.verify == 2) ?? [];
    if (statusFilter === "active")
      users = users.filter((u: OrgUser) => u.status === true);
    else if (statusFilter === "inactive")
      users = users.filter((u: OrgUser) => u.status === false);

    return sortUsers(users);
  }, [activeData, statusFilter]);

  const pendingUsers = useMemo(() => {
    const users =
      pendingData?.data?.filter((u: OrgUser) => u.verify == 1) ?? [];
    return sortUsers(users);
  }, [pendingData]);

  // Use ALL Data Total for Dashboard Count
  const totalMembers = allUsersData?.total ?? activeData?.total ?? 0;

  const pendingCount = pendingData?.total ?? 0;
  const activeMembersCount = userLimit?.userCount ?? 0;

  // --- Actions ---

  // Interaction Locking
  const [processingUsers, setProcessingUsers] = useState<Set<number>>(
    new Set(),
  );
  const activeRequests = useRef(0);

  async function handleToggle(item: OrgUser) {
    if (!organizationID) return;
    if (item.roleID === 1 || item.roleID === 2) {
      toast.error("ไม่สามารถเปลี่ยนบทบาทของ Owner / Admin ได้");
      return;
    }

    // Toggle between Officer (3) and Member (4)
    // ใน UI สวิตช์นี้จะคุมบทบาท แต่ใน logic 'status' (Active/Inactive)
    // เราจะใช้ updatedAt เพื่อช่วยในการเรียงลำดับใหม่ทันที

    const newRoleID = item.roleID === 3 ? 4 : 3;

    // Optimistic Update สำหรับบทบาทและเวลา เพื่อให้ขยับทันที
    setActiveData((prev: OrganizationUsersResponse | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((u: OrgUser) =>
          u.relationID === item.relationID
            ? { ...u, roleID: newRoleID, updatedAt: new Date().toISOString() }
            : u,
        ),
      };
    });

    try {
      await handleAssignRole(item, newRoleID as 3 | 4);
    } catch (err) {
      // Error handling is inside handleAssignRole
    }
  }

  async function handleDeleteUser(item: OrgUser) {
    if (!organizationID) return;
    if (item.roleID === 1 || item.roleID === 2) {
      toast.error("ไม่สามารถลบ Owner หรือ Admin ได้");
      return;
    }

    if (activeTab === "active") {
      setActiveData((prev: OrganizationUsersResponse | null) => {
        if (!prev) return prev;
        const newData = prev.data.filter(
          (u: OrgUser) => u.relationID !== item.relationID,
        );
        if (newData.length === 0 && activePage > 1)
          setActivePage(activePage - 1);
        return {
          ...prev,
          data: newData,
          total: prev.total - 1,
          totalPages: Math.ceil((prev.total - 1) / pageSize),
        };
      });
    } else {
      setPendingData((prev: OrganizationUsersResponse | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.filter(
            (u: OrgUser) => u.relationID !== item.relationID,
          ),
          total: prev.total - 1,
          totalPages: Math.ceil((prev.total - 1) / pageSize),
        };
      });
    }

    try {
      await deleteUserFromOrganization(item.relationID, item.user.id);
      toast.success(`ลบผู้ใช้สำเร็จ`);
      refresh();
      refreshLimitsWithRetry();
    } catch (err: unknown) {
      toast.error((err as Error).message || "เกิดข้อผิดพลาด");
      refresh();
    }
  }

  async function handleVerify(item: OrgUser, verify: boolean) {
    if (!organizationID) return;
    setPendingData((prev: OrganizationUsersResponse | null) => {
      if (!prev) return prev;
      const nextTotal = Math.max(0, prev.total - 1);
      return {
        ...prev,
        data: prev.data.filter(
          (u: OrgUser) => u.relationID !== item.relationID,
        ),
        total: nextTotal,
        totalPages: Math.max(1, Math.ceil(nextTotal / pageSize)),
      };
    });
    try {
      await verifyUserRequest(item.relationID, verify);
      toast.success(verify ? "อนุมัติคำขอสำเร็จ" : "ปฏิเสธคำขอสำเร็จ");
      refresh();
      refreshLimitsWithRetry();
      if (verify) setActiveTab("active");
    } catch (err: unknown) {
      toast.error((err as Error).message || "เกิดข้อผิดพลาด");
      refresh();
    }
  }

  function handleView(user: OrgUser) {
    setSelectedUser(user);
    setIsViewSheetOpen(true);
  }

  function handleEdit(user: OrgUser) {
    setEditingUser(user);
    setIsAddUserFormOpen(true);
  }

  function handleUpdateRole(relationID: number) {
    const user =
      activeUsers.find((u: OrgUser) => u.relationID === relationID) ||
      pendingUsers.find((u: OrgUser) => u.relationID === relationID);
    if (!user) return;
    setSelectedUser(user);
    setIsRoleSheetOpen(true);
  }

  async function handleAssignRole(item: OrgUser, newRoleID: 3 | 4) {
    if (!organizationID) return;
    if (item.roleID === 1 || item.roleID === 2) {
      toast.error("ไม่สามารถเปลี่ยนบทบาทของ Owner / Admin ได้");
      return;
    }
    if (processingUsers.has(item.relationID)) return;

    setProcessingUsers((prev) => new Set(prev).add(item.relationID));

    // Optimistic Update — badge & updatedAt for sorting
    setActiveData((prev: OrganizationUsersResponse | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((u: OrgUser) =>
          u.relationID === item.relationID
            ? { ...u, roleID: newRoleID, updatedAt: new Date().toISOString() }
            : u,
        ),
      };
    });

    try {
      const res = await assignUserRole(
        item.relationID,
        organizationID,
        newRoleID,
      );

      // Update Stats results immediately
      if (res.data?.officerLimitData) {
        setOfficerLimit(res.data.officerLimitData);
      }
      if (res.data?.userLimitData) {
        setUserLimit(res.data.userLimitData);
      }

      if (!res.data?.officerLimitData && !res.data?.userLimitData) {
        refreshLimitsWithRetry();
      }

      toast.success(
        newRoleID === 3
          ? `เปลี่ยน ${item.user.username} เป็น Officer สำเร็จ`
          : `เปลี่ยน ${item.user.username} เป็น Member สำเร็จ`,
      );
    } catch (err: unknown) {
      toast.error((err as Error).message || "เกิดข้อผิดพลาด");
      // Rollback
      setActiveData((prev: OrganizationUsersResponse | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((u: OrgUser) =>
            u.relationID === item.relationID
              ? { ...u, roleID: item.roleID }
              : u,
          ),
        };
      });
    } finally {
      setProcessingUsers((prev) => {
        const next = new Set(prev);
        next.delete(item.relationID);
        return next;
      });
    }
  }

  // --- Import Logic ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setIsImportGridOpen(true);
      e.target.value = "";
    }
  };

  const handleGridConfirm = (file: File) => {
    setImportFile(file);
    setIsImportGridOpen(false);
    analyzeImport(file);
  };

  // Step 1: Analyze File & Check Quotas (Client-Side Dry Run)
  const analyzeImport = async (file: File) => {
    if (!organizationID) return;
    setIsImporting(true);
    const toastId = toast.loading("กำลังตรวจสอบข้อมูล...");

    try {
      // 1. Fetch Existing Users for Smart Fill
      const PAGE_SIZE_LIMIT = 1000;
      const firstPageRes = await fetchOrganizationUsers(
        organizationID,
        1,
        PAGE_SIZE_LIMIT,
      );

      const currentTotalUsers =
        firstPageRes.total || (firstPageRes as any).meta?.total || 0;

      const existingEmailMap = new Map<string, string>();
      const existingUsernames = new Set<string>();

      const processUsers = (users: OrgUser[]) => {
        users.forEach((u) => {
          const uname = u.user.username?.toLowerCase().trim();
          const uemail = u.user.email?.toLowerCase().trim();

          if (uname) existingUsernames.add(uname);
          if (uemail && uname) {
            existingEmailMap.set(uemail, uname);
          }
        });
      };

      processUsers(firstPageRes.data);

      if (firstPageRes.totalPages > 1) {
        const pendingPages = [];
        for (let p = 2; p <= firstPageRes.totalPages; p++) {
          pendingPages.push(
            fetchOrganizationUsers(organizationID, p, PAGE_SIZE_LIMIT),
          );
        }
        const otherPages = await Promise.all(pendingPages);
        otherPages.forEach((res) => processUsers(res.data));
      }

      // 2. Parse File
      const text = await file.text();
      const rowsRaw = text.split(/\r?\n/).filter((r) => r.trim() !== "");
      if (rowsRaw.length < 2) {
        toast.error("ไฟล์ไม่มีข้อมูล");
        toast.dismiss(toastId);
        setIsImporting(false);
        return;
      }

      const headerRow = rowsRaw[0];
      const headerCols = headerRow
        .split(",")
        .map((c) => c.replace(/^"|"$/g, "").trim().toLowerCase());

      // Map headers
      let usernameIdx = -1,
        emailIdx = -1;

      const norm = (s: string) =>
        s.replace(/[^a-zA-Z0-9ก-๙]/g, "").toLowerCase();
      const mapLookup: Record<string, string> = {};
      Object.entries(USER_HEADER_MAPPING).forEach(
        ([k, v]) => (mapLookup[norm(k)] = v),
      );

      headerCols.forEach((h, i) => {
        const key = mapLookup[norm(h)];
        if (key === "username") usernameIdx = i;
        if (key === "email") emailIdx = i;
      });

      // 3. Logic: Smart Fill
      const dataRows = rowsRaw.slice(1);
      const limit = Number(userLimit?.userLimit) || 0;
      // 0 = ไม่จำกัด → ให้ quota = Infinity
      let remainingQuota =
        limit === 0 ? Infinity : Math.max(0, limit - currentTotalUsers);
      const initialQuota = remainingQuota;

      const finalRows: string[] = [];
      // Keep original header
      finalRows.push(headerRow);

      let addedCount = 0;
      let skippedCount = 0; // Quota full or invalid
      let duplicateCount = 0;
      const errors: any[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const cols = row.split(",").map((c) => c.replace(/^"|"$/g, "").trim());

        // Simple validation
        const username = (
          usernameIdx !== -1 ? cols[usernameIdx] : ""
        )?.toLowerCase();
        const email = (emailIdx !== -1 ? cols[emailIdx] : "")?.toLowerCase();

        if (!username || !email) {
          errors.push({ line: i + 2, error: "Missing Username or Email" });
          skippedCount++; // Count as skipped/error
          continue;
        }

        if (email && existingEmailMap.has(email)) {
          const storedUsername = existingEmailMap.get(email);
          if (storedUsername === username) {
            duplicateCount++;
            finalRows.push(row);
          } else {
            // New user (Ghost) -> Consumes Quota
            if (remainingQuota <= 0) {
              skippedCount++;
              errors.push({
                line: i + 2,
                error: "ระงับการนำเข้า: โควต้าเต็ม (ผู้ใช้ซ้ำแต่คนละชื่อ)",
              });
              continue;
            }
            addedCount++;
            remainingQuota--;
            finalRows.push(row);
          }
        } else if (username && existingUsernames.has(username)) {
          // Username match -> Update
          duplicateCount++;
          finalRows.push(row);
        } else {
          // Totally New -> Consumes Quota
          if (remainingQuota <= 0) {
            skippedCount++;
            errors.push({ line: i + 2, error: "ระงับการนำเข้า: โควต้าเต็ม" });
            continue; // SKIP
          }
          remainingQuota--;
          addedCount++;
          // Intra-file tracking
          if (email && username) existingEmailMap.set(email, username);
          if (username) existingUsernames.add(username);
          finalRows.push(row);
        }
      }

      // 4. Set Confirm Data
      setConfirmData({
        totalRows: dataRows.length,
        added: addedCount,
        updated: duplicateCount,
        skipped: skippedCount,
        errors: errors,
        quotaBefore: initialQuota,
        quotaAfter: remainingQuota,
      });

      // 5. Prepare Final File (Processed)
      const finalContent = finalRows.join("\n");
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const blob = new Blob([bom, finalContent], {
        type: "text/csv;charset=utf-8;",
      });
      const processedFile = new File([blob], file.name, { type: "text/csv" });
      setPendingImportFile(processedFile);

      toast.dismiss(toastId);
      setIsImporting(false); // Validating done
      setIsConfirmImportOpen(true); // Open Confirm Dialog
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
      toast.dismiss(toastId);
      setIsImporting(false);
    }
  };

  // Step 2: Finalize Import (Chunk & Send)
  const finalizeImport = async () => {
    if (!pendingImportFile || !organizationID) return;

    setIsImporting(true); // Show progress in dialog
    setImportProgress({ success: 0, fail: 0, total: 0 }); // Init
    isImportCancelled.current = false;

    try {
      const text = await pendingImportFile.text();
      const lines = text.split(/\r?\n/);
      const headerRow = lines[0];
      const dataRows = lines.slice(1);
      const totalRowsToImport = dataRows.length;

      if (totalRowsToImport === 0) {
        toast.info("ไม่มีข้อมูลให้นำเข้าแล้ว");
        setIsImporting(false);
        setIsConfirmImportOpen(false);
        return;
      }

      setImportProgress({ success: 0, fail: 0, total: totalRowsToImport });

      const CHUNK_SIZE = 20;
      const chunks = [];
      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
        chunks.push(dataRows.slice(i, i + CHUNK_SIZE));
      }

      let successCount = 0;
      let failCount = 0;

      const createChunkFile = (chunkLines: string[], index: number) => {
        const content = [headerRow, ...chunkLines].join("\n");
        const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
        const blob = new Blob([bom, content], {
          type: "text/csv;charset=utf-8;",
        });
        return new File([blob], `chunk_${index}.csv`, { type: "text/csv" });
      };

      // Sequential execution for safety
      for (let i = 0; i < chunks.length; i++) {
        if (isImportCancelled.current) break;

        const chunk = chunks[i];
        const chunkFile = createChunkFile(chunk, i);

        try {
          const res = await importUserToOrganization(organizationID, chunkFile);
          // Handle response (API returns { data: { success, fail, errors } })
          const payload = res?.data || res;
          const s = payload?.success ?? chunk.length;
          const f = payload?.fail ?? 0;
          successCount += s;
          failCount += f;
          
          if (payload?.errors && payload.errors.length > 0) {
            console.warn("Import chunk errors:", payload.errors);
          }
        } catch (e) {
          console.error("Chunk fail", e);
          failCount += chunk.length;
        }

        setImportProgress({
          success: successCount,
          fail: failCount,
          total: totalRowsToImport,
        });

        // Small delay
        await new Promise((r) => setTimeout(r, 50));
      }

      setIsImporting(false);
      if (isImportCancelled.current) {
        toast.info("ยกเลิกการนำเข้าแล้ว");
      } else {
        toast.success(
          `นำเข้าเสร็จสิ้น: สำเร็จ ${successCount}, ล้มเหลว ${failCount}`,
        );
        refresh();
        refreshLimitsWithRetry();
        setIsConfirmImportOpen(false);
        setPendingImportFile(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดขณะนำเข้า");
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    isImportCancelled.current = true;
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadUserTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "user_import_template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลด Template สำเร็จ");
    } catch (err: unknown) {
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลด Template");
    }
  };

  const handleExport = async () => {
    if (!organizationID) return;
    try {
      const blob = await exportUsersFromOrganization(
        organizationID,
        searchQuery,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users_export_${organizationID}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("ส่งออกข้อมูลสำเร็จ");
    } catch (err: unknown) {
      toast.error("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    }
  };

  return (
    <SidebarInset>
      {/* Sheets */}
      <Sheet
        open={isAddUserFormOpen}
        onOpenChange={(open) => {
          setIsAddUserFormOpen(open);
          if (!open) setEditingUser(null);
        }}
      >
        <SheetContent
          side="right"
          className="bg-background w-[100vw] border-l p-0 sm:max-w-lg"
          overlayClassName="bg-transparent"
        >
          <div className="border-b p-6">
            <SheetHeader>
              <SheetTitle>
                {editingUser ? "แก้ไขข้อมูลสมาชิก" : "เชิญสมาชิกใหม่"}
              </SheetTitle>
              <SheetDescription>
                {editingUser
                  ? "แก้ไขรายละเอียดและสิทธิ์การใช้งาน"
                  : "เพิ่มสมาชิกเข้าสู่ทีมของคุณเพื่อเริ่มทำงานร่วมกัน"}
              </SheetDescription>
            </SheetHeader>
          </div>
          <ScrollArea className="h-[calc(100vh-120px)] p-4">
            {organizationID && (
              <AddUserToOrgForm
                organizationID={organizationID}
                onSuccess={() => {
                  refresh();
                  refreshLimitsWithRetry();
                }}
                onClose={() => setIsAddUserFormOpen(false)}
                initialData={editingUser}
                limit={userLimit}
                currentUsage={totalMembers}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <UserViewSheet
        user={selectedUser}
        open={isViewSheetOpen}
        onClose={() => setIsViewSheetOpen(false)}
      />

      <UserRoleUpdateSheet
        user={selectedUser}
        open={isRoleSheetOpen}
        onClose={() => setIsRoleSheetOpen(false)}
        onUpdated={() => {
          setIsRoleSheetOpen(false);
          refresh();
          refreshLimits();
        }}
      />

      {/* --- New Custom Import Dialogs --- */}
      <UserImportDialog
        open={isImportGridOpen}
        onOpenChange={setIsImportGridOpen}
        file={importFile}
        onConfirm={handleGridConfirm}
        loading={isImporting}
      />

      <ConfirmUserImportDialog
        open={isConfirmImportOpen}
        onOpenChange={(open) => {
          // Prevent closing while importing
          if (isImporting && !isImportCancelled.current && importProgress)
            return;
          setIsConfirmImportOpen(open);
        }}
        data={confirmData}
        loading={isImporting}
        progress={importProgress}
        onCancel={cancelImport}
        onConfirm={finalizeImport}
      />

      <div className="space-y-8">
        <header className="z-10 flex-none px-4 py-6 pb-4 lg:px-8">
          {/* Header Section */}
          <div className="flex flex-row items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent lg:text-3xl">
                จัดการสมาชิก
              </h1>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm lg:text-base">
                สิทธิ์การเข้าถึงในองค์กรของคุณ
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {/* Hidden Input for Import */}
              <input
                type="file"
                accept=".csv, text/csv, application/vnd.ms-excel, application/csv, text/x-csv, application/x-csv, text/comma-separated-values, text/x-comma-separated-values"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                data-testid={TEST_IDS.USERS.INPUT_UPLOAD_FILE}
              />

              <div className="hidden h-10 items-center gap-1 rounded-lg border bg-white pr-1 pl-1 shadow-sm xl:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="h-8 text-slate-600 hover:bg-slate-100"
                  data-testid={TEST_IDS.USERS.BUTTON_DOWNLOAD_TEMPLATE}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  เทมเพลต
                </Button>
                <div className="h-4 w-px bg-slate-200" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleImportClick}
                  className="h-8 text-slate-600 hover:bg-slate-100"
                  data-testid={TEST_IDS.USERS.BUTTON_IMPORT}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  นำเข้า
                </Button>
                <div className="h-4 w-px bg-slate-200" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  className="h-8 text-slate-600 hover:bg-slate-100"
                  data-testid={TEST_IDS.USERS.BUTTON_EXPORT}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  นำออก
                </Button>
              </div>

              <Button
                onClick={() => {
                  setEditingUser(null);
                  setIsAddUserFormOpen(true);
                }}
                className="hidden h-10 shadow-lg transition-all hover:shadow-xl sm:inline-flex"
                data-testid={TEST_IDS.USERS.BUTTON_CREATE}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                เพิ่มสมาชิกใหม่
              </Button>

              {/* Mobile Actions Dropdown */}
              <div className="xl:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 border-slate-200 bg-white shadow-sm"
                    >
                      <Settings2 className="h-5 w-5 text-slate-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem onClick={handleDownloadTemplate} data-testid={TEST_IDS.USER_IMPORT.MENUITEM_DOWNLOAD_TEMPLATE}>
                      <FileDown className="mr-2 h-4 w-4" /> เทมเพลต
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleImportClick} data-testid={TEST_IDS.USER_IMPORT.MENUITEM_IMPORT_USERS}>
                      <FileUp className="mr-2 h-4 w-4" /> นำเข้า
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExport} data-testid={TEST_IDS.USER_IMPORT.MENUITEM_EXPORT_USERS}>
                      <FileText className="mr-2 h-4 w-4" /> นำออก
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Mobile Create Button (Full Width) */}
          <div className="mt-4 sm:hidden">
            <Button
              onClick={() => {
                setEditingUser(null);
                setIsAddUserFormOpen(true);
              }}
              className="h-10 w-full shadow-lg"
              data-testid={TEST_IDS.USERS.BUTTON_CREATE}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              เพิ่มสมาชิกใหม่
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {/* Total Users Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-100/50 bg-white p-5 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <Users className="-mt-4 -mr-4 h-24 w-24 text-blue-600" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  สมาชิกทั้งหมด
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-slate-900">
                    {totalMembers}
                  </p>
                  {userLimit && (
                    <span className="text-xs font-medium text-slate-400">
                      /{" "}
                      {userLimit.userLimit === 0
                        ? "ไม่จำกัด"
                        : userLimit.userLimit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Officer License Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-100/50 bg-white p-5 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <Shield className="-mt-4 -mr-4 h-24 w-24 text-emerald-600" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  สิทธิ์เจ้าหน้าที่
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-slate-900">
                    {officerLimit ? officerLimit.officerCount : 0}
                  </p>
                  {officerLimit && (
                    <span className="text-xs font-medium text-slate-400">
                      /{" "}
                      {officerLimit.officerLimit === 0
                        ? "ไม่จำกัด"
                        : officerLimit.officerLimit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Requests Card */}
          <div
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-100/50 bg-white p-5 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] active:scale-95"
            onClick={() => setActiveTab("pending")}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <Clock className="-mt-4 -mr-4 h-24 w-24 text-orange-600" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-inner transition-colors group-hover:bg-orange-600 group-hover:text-white">
                <Clock className="h-7 w-7" />
                {pendingCount > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 animate-ping rounded-full bg-red-500 ring-2 ring-white" />
                )}
                {pendingCount > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase transition-colors group-hover:text-orange-600">
                  รอดำเนินการ
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-slate-900">
                    {pendingCount}
                  </p>
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-orange-600">
                      ตรวจสอบ <ArrowUpRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Status Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-100/50 bg-white p-5 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <CheckCircle2 className="-mt-4 -mr-4 h-24 w-24 text-purple-600" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shadow-inner transition-colors group-hover:bg-purple-600 group-hover:text-white">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  สถานะเปิดใช้งาน
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-slate-900">
                    {activeMembersCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-transparent px-4 lg:px-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {/* Toolbar */}
            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <TabsList className="bg-muted/50 grid h-auto w-full grid-cols-2 rounded-lg p-1 xl:w-auto">
                <TabsTrigger
                  value="active"
                  className="rounded-md px-4 py-2 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  สมาชิกทั้งหมด ({totalMembers})
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="relative rounded-md px-4 py-2 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  คำขอเข้าร่วม ({pendingCount})
                  {pendingCount > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex w-full items-center gap-3 xl:w-auto">
                <div className="relative flex-1 sm:min-w-[300px]">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="ค้นหาชื่อ, อีเมล หรือตำแหน่ง..."
                    className="bg-white pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid={TEST_IDS.USERS.INPUT_SEARCH}
                  />
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={`bg-white ${statusFilter !== "all" ? "text-primary border-primary bg-primary/5" : ""}`}
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        {statusFilter === "all"
                          ? "ตัวกรอง"
                          : statusFilter === "active"
                            ? "Active"
                            : "Inactive"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>กรองตามสถานะ</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                        {statusFilter === "all" && (
                          <CheckCircle2 className="text-primary h-4 w-4" />
                        )}
                        <span
                          className={
                            statusFilter === "all" ? "font-medium" : "ml-6"
                          }
                        >
                          ทั้งหมด
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusFilter("active")}
                      >
                        {statusFilter === "active" && (
                          <CheckCircle2 className="text-primary h-4 w-4" />
                        )}
                        <span
                          className={
                            statusFilter === "active" ? "font-medium" : "ml-6"
                          }
                        >
                          Active
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusFilter("inactive")}
                      >
                        {statusFilter === "inactive" && (
                          <CheckCircle2 className="text-primary h-4 w-4" />
                        )}
                        <span
                          className={
                            statusFilter === "inactive" ? "font-medium" : "ml-6"
                          }
                        >
                          Inactive
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Content: Active Users */}
            <TabsContent value="active" className="mt-0">
              <div className="overflow-hidden rounded-xl border bg-white/50">
                {/* Desktop Header */}
                <div className="bg-muted/30 text-muted-foreground hidden grid-cols-12 gap-4 border-b p-4 text-xs font-semibold tracking-wider uppercase lg:grid">
                  <div className="col-span-1 text-center">Active</div>
                  <div className="col-span-4">User Details</div>
                  <div className="col-span-3">Role & Position</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* List */}
                {isLoading && activeUsers.length === 0 ? (
                  <div className="space-y-4 p-8 text-center">
                    <div className="bg-muted/20 h-10 w-full animate-pulse rounded-lg" />
                    <div className="bg-muted/20 h-10 w-full animate-pulse rounded-lg" />
                    <div className="bg-muted/20 h-10 w-full animate-pulse rounded-lg" />
                  </div>
                ) : activeUsers.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users className="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-20" />
                    <h3 className="text-lg font-medium">ไม่มีข้อมูลสมาชิก</h3>
                    <p className="text-muted-foreground text-sm">
                      ไม่พบรายชื่อในระบบ หรือลองปรับคำค้นหา
                    </p>
                  </div>
                ) : (
                  <div className="divide-border/50 divide-y">
                    {activeUsers.map((item: OrgUser) => (
                      <div
                        key={item.relationID}
                        data-testid={TEST_IDS.USERS.TABLE_ROW(item.user.id)}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        {/* 📱 Mobile View: Card Style */}
                        <div className="space-y-3 border-b p-4 last:border-0 lg:hidden">
                          {/* Top: Avatar + Info + Actions */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 gap-3">
                              <Avatar className="h-10 w-10 flex-shrink-0 border shadow-sm">
                                <AvatarImage
                                  src={getImageUrl(item.user.image)}
                                  alt={item.user.username}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-slate-50">
                                  <User className="h-5 w-5 text-slate-400" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold">
                                    {getFullName(item.user)}
                                  </p>
                                </div>
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <p className="text-muted-foreground truncate text-xs">
                                    {item.user.username}
                                  </p>
                                  {item.user.emailVerifiedAt && (
                                    <div
                                      className="shrink-0 text-green-500"
                                      title={`Verified: ${new Date(item.user.emailVerifiedAt).toLocaleDateString()}`}
                                    >
                                      <BadgeCheck className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getRoleBadgeColor(item.roleID)}`}
                                  >
                                    {getRoleLabel(item.roleID)}
                                  </span>
                                  {(item.position?.name ||
                                    item.roleID === 1 ||
                                    item.roleID === 2) && (
                                    <>
                                      <Separator
                                        orientation="vertical"
                                        className="h-3"
                                      />
                                      <span className="text-muted-foreground text-xs">
                                        {item.roleID === 1 || item.roleID === 2
                                          ? "Admin"
                                          : item.position?.name || "-"}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <UserRowActions
                              user={item}
                              onView={handleView}
                              onEdit={handleEdit}
                              onUpdateRole={handleUpdateRole}
                              onDeleteUser={handleDeleteUser}
                            />
                          </div>

                          {/* Bottom: Contact + Switch */}
                          <div className="flex items-center justify-between pl-[52px]">
                            <div className="text-muted-foreground text-xs truncate min-w-0 mr-3">
                              {item.user.email}
                            </div>
                            <div className="flex items-center shrink-0">
                              {item.roleID === 1 || item.roleID === 2 ? (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
                                  <Shield className="h-4 w-4 text-purple-600" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[10px] font-medium ${item.roleID === 3 ? "text-green-600" : "text-slate-400"}`}
                                  >
                                    {item.roleID === 3
                                      ? "เจ้าหน้าที่"
                                      : "สมาชิก"}
                                  </span>
                                  <Switch
                                    checked={item.roleID === 3}
                                    onCheckedChange={() => handleToggle(item)}
                                    disabled={processingUsers.has(
                                      item.relationID,
                                    )}
                                    className={cn(
                                      "scale-75 data-[state=checked]:bg-green-600",
                                      processingUsers.has(item.relationID) &&
                                        "cursor-wait opacity-50",
                                    )}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 💻 Desktop View: Grid Style */}
                        <div className="hidden grid-cols-12 items-center gap-4 p-4 lg:grid">
                          {/* Status Switch */}
                          <div className="col-span-1 flex justify-center">
                            {item.roleID === 1 || item.roleID === 2 ? (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
                                <Shield className="h-4 w-4 text-purple-600" />
                              </div>
                            ) : (
                              <Switch
                                checked={item.roleID === 3}
                                onCheckedChange={() => handleToggle(item)}
                                disabled={processingUsers.has(item.relationID)}
                                className={cn(
                                  "data-[state=checked]:bg-green-600",
                                  processingUsers.has(item.relationID) &&
                                    "cursor-wait opacity-50",
                                )}
                              />
                            )}
                          </div>

                          {/* User Details */}
                          <div className="col-span-4 flex min-w-0 items-center gap-3">
                            <Avatar className="h-9 w-9 flex-shrink-0 border shadow-sm">
                              <AvatarImage
                                src={getImageUrl(item.user.image)}
                                alt={item.user.username}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-slate-50">
                                <User className="h-4 w-4 text-slate-400" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-slate-900">
                                  {getFullName(item.user)}
                                </span>
                                {item.user.emailVerifiedAt && (
                                  <div title="Verified Account">
                                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-green-500" />
                                  </div>
                                )}
                              </div>
                              <span className="text-muted-foreground truncate text-xs">
                                {item.user.username}
                              </span>
                            </div>
                          </div>

                          {/* Role & Position */}
                          <div className="col-span-3 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${getRoleBadgeColor(item.roleID)}`}
                              >
                                {getRoleLabel(item.roleID)}
                              </span>
                            </div>
                            <span className="text-muted-foreground truncate pl-1 text-xs">
                              {item.roleID === 1 || item.roleID === 2
                                ? "Administrator"
                                : item.position?.name || "-"}
                            </span>
                          </div>

                          {/* Contact */}
                          <div className="col-span-3 grid grid-cols-1 gap-0.5">
                            <span className="flex items-center gap-2 text-xs text-slate-600">
                              <span className="text-muted-foreground w-16">
                                Email:
                              </span>
                              {item.user.email}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 flex justify-end">
                            <UserRowActions
                              user={item}
                              onView={handleView}
                              onEdit={handleEdit}
                              onUpdateRole={handleUpdateRole}
                              onAssignRole={handleAssignRole}
                              onDeleteUser={handleDeleteUser}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Content: Pending Users */}
            <TabsContent value="pending" className="mt-0">
              <div className="overflow-hidden rounded-xl border bg-white/50">
                <div className="bg-muted/30 text-muted-foreground hidden grid-cols-12 gap-4 border-b p-4 text-xs font-semibold tracking-wider uppercase lg:grid">
                  <div className="col-span-5">User Details</div>
                  <div className="col-span-4">Contact</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                {isLoading && pendingUsers.length === 0 ? (
                  <div className="space-y-4 p-8 text-center">
                    <div className="bg-muted/20 h-10 w-full animate-pulse rounded-lg" />
                  </div>
                ) : pendingUsers.length === 0 ? (
                  <div className="py-16 text-center">
                    <Clock className="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-20" />
                    <h3 className="text-lg font-medium">
                      ไม่มีคำขอที่รอดำเนินการ
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      เมื่อมีผู้ขอเข้าร่วมทีม รายการจะปรากฏที่นี่
                    </p>
                  </div>
                ) : (
                  <div className="divide-border/50 divide-y">
                    {pendingUsers.map((item: OrgUser) => (
                      <div
                        key={item.relationID}
                        data-testid={TEST_IDS.USERS.TABLE_ROW(item.user.id)}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        {/* Mobile Pending */}
                        <div className="space-y-3 p-4 lg:hidden">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 border shadow-sm">
                              <AvatarImage
                                src={getImageUrl(item.user.image)}
                                alt={item.user.username}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-orange-50 text-orange-600">
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {getFullName(item.user)}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">
                                {item.user.username}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 text-white hover:bg-green-700"
                              onClick={() => handleVerify(item, true)}
                            >
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleVerify(item, false)}
                            >
                              ปฏิเสธ
                            </Button>
                          </div>
                        </div>

                        {/* Desktop Pending */}
                        <div className="hidden grid-cols-12 items-center gap-4 p-4 lg:grid">
                          <div className="col-span-5 flex items-center gap-3">
                            <Avatar className="h-10 w-10 border shadow-sm">
                              <AvatarImage
                                src={getImageUrl(item.user.image)}
                                alt={item.user.username}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-orange-50 text-orange-600">
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-sm font-medium">
                                {getFullName(item.user)}
                              </span>
                              <span className="text-muted-foreground truncate text-xs">
                                {item.user.username}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-4 flex flex-col gap-0.5">
                            <span className="truncate text-xs text-slate-600">
                              {item.user.email}
                            </span>
                            <span className="text-muted-foreground truncate text-[10px]">
                              {new Date(
                                item.user.emailVerifiedAt || "",
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="col-span-3 flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-8 bg-green-600 text-xs text-white hover:bg-green-700"
                              onClick={() => handleVerify(item, true)}
                            >
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-red-200 text-xs text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleVerify(item, false)}
                            >
                              ปฏิเสธ
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8">
            <UserPagination
              page={activeTab === "active" ? activePage : pendingPage}
              totalPages={
                activeTab === "active"
                  ? activeData?.totalPages || 1
                  : pendingData?.totalPages || 1
              }
              total={
                activeTab === "active"
                  ? activeData?.total || 0
                  : pendingData?.total || 0
              }
              pageSize={pageSize}
              onPageChange={
                activeTab === "active" ? setActivePage : setPendingPage
              }
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
