"use client";

import { TEST_IDS } from '@/components/test-ids';
import React, { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import { columns } from "./components/columns";
import { AssetDialog } from "./components/asset-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

import { apiRequest } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { useDebounce } from "@/hooks/use-debounce";
import { AssetData } from "./types";
import {
  extractAssetListPayload,
  filterRefRows,
  normalizeAssetRows,
} from "@/lib/asset-normalize";
import { getSession } from "next-auth/react";

import {
  downloadAssetTemplate,
  exportAssets,
  importAssets,
  convertElaasToCSV,
  ExportAssetsOptions,
} from "@/lib/assets";

import { ConfirmImportDialog } from "./components/confirm-import-dialog";
import { AssetImportDialog } from "./components/asset-import-dialog";

// Define fetcher for SWR
const fetcher = (url: string) => apiRequest(url).then((res) => res);

interface ClientAssetsPageProps {
  initialData?: {
    data: AssetData[];
    total: number;
  };
  initialReferenceData?: any; // We will define proper type later or in a shared type file if strictly needed
  bootstrapLoading?: boolean;
}

import { useSearchParams, useRouter } from "next/navigation";

export default function ClientAssetsPage({
  initialData,
  initialReferenceData,
  bootstrapLoading = false,
}: ClientAssetsPageProps) {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");

  // Map status name to ID
  const statusID = React.useMemo(() => {
    if (!statusParam) return undefined;
    if (statusParam === "ไม่ระบุ") return -1;

    if (!initialReferenceData?.statuses) return undefined;
    const found = initialReferenceData.statuses.find(
      (s: any) => s.status === statusParam,
    );
    return found?.id;
  }, [statusParam, initialReferenceData]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>([]);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  // editingAsset was duplicated, removing one instance (originally line 48 & 49)
  const [editingAsset, setEditingAsset] = useState<AssetData | null>(null);
  const [preloadedDependencies, setPreloadedDependencies] = useState<{
    types: any[];
    classes: any[];
  } | null>(null);

  // Import Dialog State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFormat, setImportFormat] = useState<"default" | "elaas">("default");

  // Confirm Import Dialog State
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [confirmImportData, setConfirmImportData] = useState<{
    newCategories: string[];
    newTypes: string[];
    newClasses: string[];
    newBuildings: string[];
    newRooms: string[];
    newStatuses: string[];
    matchedOwners: number;
    imported: number;
    created?: number;
    updated?: number;
    failed: number;
    errors: any[];
  }>({
    newCategories: [],
    newTypes: [],
    newClasses: [],
    newBuildings: [],
    newRooms: [],
    newStatuses: [],
    matchedOwners: 0,
    imported: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  });
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  // File Input Ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // --- SWR: Fetch Assets ---
  // Key depends on user/org and pagination
  const shouldFetch =
    !userLoading && user?.organizationID && user?.isOrgVerified;
  let key = null;
  if (shouldFetch) {
    key = `/asset/get/${user.organizationID}/${page}/${pageSize}`;
    const params = new URLSearchParams();
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (statusID) params.append("assetStatusID", statusID.toString());
    if (categoryFilter.length > 0)
      params.append("categoryID", categoryFilter.join(","));
    if (typeFilter.length > 0) params.append("assetTypeID", typeFilter.join(","));
    if (classFilter.length > 0)
      params.append("assetClassID", classFilter.join(","));

    if (params.toString()) {
      key += `?${params.toString()}`;
    }
  }

  const hasBootstrapRows =
    (initialData?.total ?? 0) > 0 || (initialData?.data?.length ?? 0) > 0;

  const useInitialFallback =
    hasBootstrapRows &&
    !debouncedSearch &&
    !statusParam &&
    page === 1 &&
    categoryFilter.length === 0 &&
    typeFilter.length === 0 &&
    classFilter.length === 0;

  const {
    data: result,
    error,
    isLoading,
    isValidating,
    mutate: refresh,
  } = useSWR(key, fetcher, {
    fallbackData: useInitialFallback ? initialData : undefined,
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnMount: !useInitialFallback,
    dedupingInterval: 5000,
  });

  const listPayload = React.useMemo(
    () =>
      extractAssetListPayload(
        result ??
          (useInitialFallback || (hasBootstrapRows && (userLoading || isLoading))
            ? initialData
            : undefined),
      ),
    [result, useInitialFallback, hasBootstrapRows, userLoading, isLoading, initialData],
  );
  const data = React.useMemo(
    () => normalizeAssetRows(listPayload.data),
    [listPayload],
  );
  const total = listPayload.total;
  // If we have data (even from fallback), we are not "loading" in a blocking way
  // BUT we want to show skeleton during page/search change (isValidating) to feel responsive
  const loading =
    bootstrapLoading || userLoading || isLoading || isValidating;

  // Use refresh() where loadAssets() was used

  // --- Actions ---
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on new search
  };

  const handleCreate = () => {
    setEditingAsset(null);
    setPreloadedDependencies(null); // Reset
    setDialogOpen(true);
  };

  const handleEdit = async (asset: AssetData) => {
    try {
      // 1. Get Asset Details
      const res = await apiRequest(`/asset/get_one/${asset.id}`);
      const fullAsset = res.data;

      // 2. Pre-fetch Dependencies (Types & Classes) based on current asset values
      // Removed duplicate orgID declaration
      const orgID = user?.organizationID;
      let pTypes: any[] = [];
      let pClasses: any[] = [];

      if (orgID) {
        const promises = [];
        // 1. Fetch Types if category exists
        if (fullAsset.categoryID) {
          promises.push(
            apiRequest(
              `/asset/type/get_all?organizationID=${orgID}&categoryID=${fullAsset.categoryID}`,
            ).then((r: any) => (Array.isArray(r) ? r : r.data || [])),
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        // 2. Fetch Classes if type exists
        if (fullAsset.typeID) {
          promises.push(
            apiRequest(
              `/asset/class/get_all?organizationID=${orgID}&typeID=${fullAsset.typeID}`,
            ).then((r: any) => (Array.isArray(r) ? r : r.data || [])),
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        const [t, c] = await Promise.all(promises);
        pTypes = filterRefRows(Array.isArray(t) ? t : t?.data);
        pClasses = filterRefRows(Array.isArray(c) ? c : c?.data);
      }

      setEditingAsset(fullAsset);
      setPreloadedDependencies({ types: pTypes, classes: pClasses });
      setDialogOpen(true);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลสินทรัพย์ได้");
      console.error(error);
    }
  };

  const handleDelete = async (assetID: number) => {
    try {
      // API Delete ต้องการ body: { userID: number }
      await apiRequest(`/asset/delete/${assetID}`, {
        method: "PATCH",
        body: JSON.stringify({ userID: user?.id }),
      });
      refresh(); // โหลดข้อมูลใหม่
      toast.success("ลบสินทรัพย์สำเร็จ");
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("ลบข้อมูลไม่สำเร็จ");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!user?.id) return;
    try {
      const res = await apiRequest(`/asset/bulk-delete`, {
        method: "PATCH",
        body: JSON.stringify({
          assetIDs: ids,
          userID: user.id,
        }),
      });

      const { data: results, errors } = res;
      const successCount = results?.length || 0;
      const errorCount = errors?.length || 0;

      if (successCount > 0 && errorCount > 0) {
        toast.warning(
          `ลบสำเร็จ ${successCount} รายการ และล้มเหลว ${errorCount} รายการ`,
        );
      } else if (successCount > 0) {
        toast.success(`ลบสำเร็จ ${successCount} รายการ`);
      } else {
        toast.error("ไม่สามารถลบรายการที่เลือกได้");
      }

      refresh();
    } catch (err) {
      console.error("Bulk delete failed", err);
      toast.error("ลบข้อมูลไม่สำเร็จ");
    }
  };

  const handleDuplicate = async (asset: AssetData) => {
    try {
      const session = await getSession();
      const token = session?.accessToken;

      if (!token || !user?.organizationID) return;

      // 1. ดึงข้อมูลเต็ม
      const fullRes = await apiRequest(`/asset/get_one/${asset.id}`);
      const a = fullRes.data;

      // Check if original has RFID (ignore "null", "-", or empty)
      const hasRfid = a.rfidNum && a.rfidNum !== "null" && a.rfidNum !== "-";
      if (hasRfid) {
        toast.warning("รายการที่มี RFID ไม่สามารถคัดลอกได้");
        return;
      }

      // 2. เตรียมข้อมูลสำหรับสร้างใหม่ (ตัด ID ออก, เติม Copy)
      const newAssetPayload = {
        assetName: `${a.assetName} (Copy)`,
        assetDetails: a.assetDetail || "",
        assetClassID: Number(a.assetClassID),
        assetValue: Number(a.assetValue || 0),
        assetNumber: `${a.assetNumber}-COPY`,
        rfidNum: null, // Always null for copy
        isCheck: false,
        organizationID: Number(user.organizationID),
        receivedDate: a.receivedDate,
        expiryDate: a.expiryDate || new Date().toISOString(),
        userID: Number(user.id),
        // Fix: Add missing required fields from API update
        getByID: a.getByID ? Number(a.getByID) : undefined,
        getFrom: a.getFrom || "",
        sourceFundID: a.sourceFundID ? Number(a.sourceFundID) : undefined,
      };

      // 3. ยิง Create API
      await apiRequest(`/asset/create`, {
        method: "POST",
        body: JSON.stringify(newAssetPayload),
      });

      refresh();
      toast.success("คัดลอกสินทรัพย์สำเร็จ");
    } catch (err: any) {
      console.error("Duplicate failed:", err);
      // Generic error since we block RFID duplication upfront now
      toast.error("คัดลอกข้อมูลไม่สำเร็จ (อาจเกิดจากรหัสซ้ำ)");
    }
  };

  // --- Import / Export Handlers ---
  const handleTemplate = async () => {
    try {
      await downloadAssetTemplate();
      toast.success("ดาวน์โหลด Template สำเร็จ");
    } catch (err) {
      console.error("Download template failed", err);
      toast.error("ดาวน์โหลด Template ไม่สำเร็จ");
    }
  };

  const handleExport = async (options: ExportAssetsOptions) => {
    if (!user?.organizationID) return;
    try {
      await exportAssets(user.organizationID, options);
      toast.success("Export ข้อมูลสำเร็จ");
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Export ข้อมูลไม่สำเร็จ");
    }
  };

  const handleImportClick = (format: "default" | "elaas" = "default") => {
    setImportFormat(format);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportDialogOpen(true);

    // Reset file input so same file can be selected again if cancelled
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmImport = async (file: File) => {
    if (!user?.organizationID) return;

    setImporting(true);
    try {
      // 1. Dry Run Check (Always)
      const dryRunRes = await importAssets(
        user.organizationID,
        file,
        false,
        true,
        importFormat,
      );

      // 2. Open Confirmation Dialog with Results
      // Count matched owners from successes (where resolvedOwners array is not empty)
      const successItems = dryRunRes.successes || [];
      const matchedOwnersCount = successItems.reduce(
        (acc: number, item: any) =>
          acc + (item.resolvedOwners && item.resolvedOwners.length > 0 ? 1 : 0),
        0,
      );

      setConfirmImportData({
        newCategories: dryRunRes.newCategories || [],
        newTypes: dryRunRes.newTypes || [],
        newClasses: dryRunRes.newClasses || [],
        newBuildings: dryRunRes.newBuildings || [],
        newRooms: dryRunRes.newRooms || [],
        newStatuses: dryRunRes.newStatuses || [],
        matchedOwners: matchedOwnersCount,
        imported: dryRunRes.imported || 0,
        created: dryRunRes.created || 0,
        updated: dryRunRes.updated || 0,
        failed: dryRunRes.failed || 0,
        errors: dryRunRes.errors || [],
      });
      // Update pending file to the one returned from Dialog (which might be edited)
      setPendingImportFile(file);
      setConfirmImportOpen(true);
      setImportDialogOpen(false); // Close the grid editor
      setImporting(false);
    } catch (err) {
      console.error("Import failed", err);
      toast.error("Import ข้อมูลไม่สำเร็จ: " + (err as Error).message);
      setImporting(false);
    }
  };

  // Import Progress State
  const [importProgress, setImportProgress] = useState<
    { success: number; fail: number; total: number } | undefined
  >(undefined);

  // Cancel Ref
  const isImportCancelled = React.useRef(false);

  const executeImport = async (file: File) => {
    if (!user?.organizationID) return;

    setImporting(true);
    isImportCancelled.current = false;
    setImportProgress({ success: 0, fail: 0, total: 0 });

    // --- Shared Helpers ---

    /** Safely split CSV lines respecting newlines inside quotes (RFC 4180) */
    const parseCsvToRows = (text: string): string[] => {
      const rows: string[] = [];
      let currentRow = "";
      let insideQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1] || "";
        if (char === '"') {
          insideQuotes = !insideQuotes;
          currentRow += char;
        } else if ((char === '\r' && nextChar === '\n') || char === '\n') {
          if (!insideQuotes) {
            if (currentRow.trim() !== "") rows.push(currentRow);
            currentRow = "";
            if (char === '\r') i++;
          } else {
            currentRow += char;
          }
        } else {
          currentRow += char;
        }
      }
      if (currentRow.trim() !== "") rows.push(currentRow);
      return rows;
    };

    /** Create a CSV file chunk with BOM for backend consumption */
    const createChunkFile = (header: string, chunkLines: string[], index: number) => {
      const content = [header, ...chunkLines].join("\n");
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const blob = new Blob([bom, content], { type: "text/csv;charset=utf-8;" });
      return new File([blob], `chunk_${index}.csv`, { type: "text/csv" });
    };

    /** Run chunked import loop against the backend */
    const runChunkedImport = async (
      header: string,
      dataRows: string[],
      format: "default" | "elaas",
    ) => {
      const CHUNK_SIZE = 50;
      const totalRows = dataRows.length;
      const chunks: string[][] = [];
      for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        chunks.push(dataRows.slice(i, i + CHUNK_SIZE));
      }

      let successCount = 0;
      let failCount = 0;
      let processedCount = 0;
      const allErrors: any[] = [];

      setImportProgress({ success: 0, fail: 0, total: totalRows } as any);

      if (user.organizationID == null) {
        throw new Error("ไม่พบ organizationID ของผู้ใช้");
      }
      const orgId = user.organizationID;

      for (let i = 0; i < chunks.length; i++) {
        if (isImportCancelled.current) break;

        const chunk = chunks[i];
        const chunkFile = createChunkFile(header, chunk, i);

        try {
          const res = await importAssets(
            orgId,
            chunkFile,
            false,
            false,
            format === "elaas" ? "default" : format, // e-LAAS is already converted to CSV
          );
          successCount += res.imported;
          failCount += res.failed;
          if (res.errors?.length > 0) {
            const offset = i * CHUNK_SIZE;
            allErrors.push(...res.errors.map((e: any) => ({
              ...e,
              line: typeof e.line === "number" ? e.line + offset : e.line,
            })));
          }
        } catch (e) {
          failCount += chunk.length;
        }

        processedCount += chunk.length;
        setImportProgress({
          success: successCount,
          fail: failCount,
          total: totalRows,
          processed: processedCount,
        } as any);

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      return { successCount, failCount, allErrors };
    };

    /** Display import results via toast */
    const showImportResult = (successCount: number, failCount: number, allErrors: any[]) => {
      if (isImportCancelled.current) {
        toast.info(`ยกเลิกการนำเข้าแล้ว (สำเร็จ ${successCount}, ล้มเหลว ${failCount})`);
        return;
      }

      if (failCount > 0) {
        const errorList = allErrors.slice(0, 5).map((e: any, i: number) => (
          <div key={i} className="text-foreground text-xs font-medium">
            บรรทัดที่ {e.line}: {e.error}
          </div>
        ));
        const more =
          allErrors.length > 5 ? (
            <div className="text-muted-foreground text-xs">
              ...และอีก {allErrors.length - 5} รายการ
            </div>
          ) : null;

        const ErrorDisplay = () => (
          <div className="bg-secondary/50 mt-2 flex flex-col gap-1 rounded-md p-2">
            {errorList}
            {more}
          </div>
        );

        if (successCount === 0) {
          toast.error(`Import ล้มเหลวทั้งหมด ${failCount} รายการ`, {
            description: <ErrorDisplay />,
            duration: 10000,
          });
        } else {
          toast.warning(
            `Import สำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`,
            {
              description: <ErrorDisplay />,
              duration: 10000,
            },
          );
        }
      } else {
        toast.success(`Import ข้อมูลสำเร็จ ${successCount} รายการ`);
      }
    };

    try {
      let header = "";
      let dataRows: string[] = [];

      // --- Step 1: Parse file into header + dataRows ---
      if (importFormat === "elaas") {
        // e-LAAS: Convert Excel → CSV via backend, then parse
        const csvText = await convertElaasToCSV(file);
        const lines = parseCsvToRows(csvText);
        if (lines.length > 0) {
          header = lines[0];
          dataRows = lines.slice(1);
        }
      } else {
        const isExcel =
          file.name.toLowerCase().endsWith(".xlsx") ||
          file.name.toLowerCase().endsWith(".xls");

        if (isExcel) {
          const ExcelJS = (await import("exceljs")).default;
          const workbook = new ExcelJS.Workbook();
          const buffer = await file.arrayBuffer();
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.worksheets[0];
          if (!worksheet) throw new Error("Excel file has no worksheets");

          const rows: string[] = [];
          const escape = (val: any): string => {
            if (val === null || val === undefined) return "";
            if (val instanceof Date) return val.toISOString().split("T")[0];
            if (typeof val === "object" && "text" in val) return escape(val.text);
            const s = String(val);
            if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
          };

          worksheet.eachRow((row) => {
            const values: string[] = [];
            row.eachCell({ includeEmpty: true }, (cell) => {
              values.push(escape(cell.value));
            });
            rows.push(values.join(","));
          });

          if (rows.length > 0) {
            header = rows[0];
            dataRows = rows.slice(1);
          }
        } else {
          const text = await file.text();
          const lines = parseCsvToRows(text);
          if (lines.length > 0) {
            header = lines[0];
            dataRows = lines.slice(1);
          }
        }
      }

      if (dataRows.length === 0) {
        toast.error("ไม่พบข้อมูลสำหรับการ Import");
        return;
      }

      // --- Step 2: Chunked import ---
      const { successCount, failCount, allErrors } = await runChunkedImport(
        header,
        dataRows,
        importFormat,
      );

      // --- Step 3: Show results ---
      showImportResult(successCount, failCount, allErrors);

      setImportDialogOpen(false);
      setImportFile(null);
      setConfirmImportOpen(false);
      setPendingImportFile(null);
      refresh(); // SWR: refresh asset list data
      router.refresh(); // Next.js: re-fetch server-side reference data (categories, types, classes)
    } catch (err) {
      toast.error("Import ข้อมูลไม่สำเร็จ: " + (err as Error).message);
    } finally {
      setImporting(false);
      setImportProgress(undefined);
      isImportCancelled.current = false;
    }
  };

  const cancelImport = () => {
    isImportCancelled.current = true;
    setConfirmImportOpen(false);
    setImportDialogOpen(true); // Re-open grid if cancelled/closed
  };

  const handleClearStatus = () => {
    router.replace("/assets/list");
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        data-testid={TEST_IDS.ASSET_IMPORT.INPUT_FILE}
        accept=".csv, text/csv, application/csv, text/comma-separated-values, text/x-csv, application/x-csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        className="hidden"
      />

      {/* Table Area */}
      <DataTable
        columns={columns}
        data={data}
        // Server-side Pagination Props
        pageCount={Math.ceil(total / pageSize)}
        page={page}
        pageSize={pageSize}
        rowCount={total}
        // onPageChange={setPageSize} // REMOVED duplicate
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        // Actions Handlers
        onCreate={handleCreate} // ✅ ส่งฟังก์ชัน Create ลงไป
        onImport={handleImportClick}
        onExport={handleExport}
        onTemplate={handleTemplate}
        reload={() => refresh()}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        isLoading={loading}
        onSearch={handleSearch}
        activeStatusFilter={statusParam}
        onClearStatusFilter={handleClearStatus}
        onBulkDelete={handleBulkDelete}
        initialReferenceData={initialReferenceData}
        // Hierarchical Filters
        categoryFilter={categoryFilter}
        onCategoryChange={(val) => {
          setCategoryFilter(val);
          setTypeFilter([]);
          setClassFilter([]);
          setPage(1);
        }}
        typeFilter={typeFilter}
        onTypeChange={(val) => {
          setTypeFilter(val);
          setClassFilter([]);
          setPage(1);
        }}
        classFilter={classFilter}
        onClassChange={(val) => {
          setClassFilter(val);
          setPage(1);
        }}
      />

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <AssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialData={editingAsset}
          onSaved={() => refresh()}
          initialReferenceData={initialReferenceData}
          preloadedDependencies={preloadedDependencies}
        />
      )}

      {/* Import Review Dialog */}
      <AssetImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        file={importFile}
        onConfirm={confirmImport}
        loading={importing}
      />

      {/* Confirm Import Dialog */}
      <ConfirmImportDialog
        open={confirmImportOpen}
        onOpenChange={setConfirmImportOpen}
        data={confirmImportData}
        loading={importing}
        progress={importProgress}
        onCancel={cancelImport} // Pass cancellation handler
        onConfirm={() => {
          if (pendingImportFile) {
            executeImport(pendingImportFile);
          }
        }}
      />
    </div>
  );
}
