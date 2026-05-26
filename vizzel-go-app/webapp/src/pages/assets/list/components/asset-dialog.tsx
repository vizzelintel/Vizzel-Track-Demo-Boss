"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { fetchOrganizationUsers } from "@/lib/user";
import { AssetFormValues, assetFormSchema } from "../types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarIcon,
  Upload,
  MapPin,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/utils";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetDocsTab } from "./asset-docs-tab";
import { AssetGalleryTab } from "./asset-gallery-tab";
import { useOrganizationMenus } from "@/hooks/use-organization-menus";
import Link from "next/link";
import { TEST_IDS } from "@/components/test-ids";
import {
  filterRefRows,
  lovOptionLabel,
  normalizeOrgUserRows,
  normalizeAssetRow,
} from "@/lib/asset-normalize";
import {
  assetImageUrl,
  resolveHolderOrgLabels,
} from "@/lib/org-hierarchy";
import {
  parseAssetDate,
  resolveHolderUserId,
  resolveLovSelectValue,
} from "@/lib/asset-form-resolve";

interface AssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  onSaved: () => void;
  initialReferenceData?: any;
  preloadedDependencies?: { types: any[]; classes: any[] } | null;
}

const uniqueById = (arr: unknown[]) => {
  const map = new Map();
  for (const item of filterRefRows(arr)) {
    // Deduplicate by status name if available, fallback to ID
    if (item?.status) {
      const key = String(item.status).trim();
      if (!map.has(key)) {
        map.set(key, item);
      }
    } else if (item?.id) {
      map.set(String(item.id), item);
    }
  }
  return Array.from(map.values());
};

export function AssetDialog({
  open,
  onOpenChange,
  initialData,
  onSaved,
  initialReferenceData,
  preloadedDependencies,
}: AssetDialogProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [previewImages, setPreviewImages] = useState<
    { id?: number; url: string; file?: File }[]
  >([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // --- Master Data States ---
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]); // Store ALL rooms
  const [rooms, setRooms] = useState<any[]>([]); // Filtered rooms
  const [usersList, setUsersList] = useState<any[]>([]);
  const [getByOptions, setGetByOptions] = useState<any[]>([]);
  const [sourceFundOptions, setSourceFundOptions] = useState<any[]>([]);

  // Organization Hierarchy
  const [departments, setDepartments] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Removed isRoomsLoading since it's instant now
  const [activeTab, setActiveTab] = useState("general");

  const orgID = user?.organizationRelation?.organizationID ?? null;
  const { hasMenu } = useOrganizationMenus(orgID);
  const hasDocAccess = hasMenu(2); // Menu ID 2 = Documents
  const hasWithdrawalAccess = hasMenu(3); // Menu ID 3 = Withdrawal/Borrowing

  useEffect(() => {
    if (open) {
      setActiveTab("general");
    }
  }, [open]);

  // --- Form Setup ---
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema) as Resolver<AssetFormValues>,
    defaultValues: {
      assetName: "",
      assetDetails: "",
      assetValue: 0,
      assetNumber: "",
      rfidNum: "",
      getBy: "",
      getFrom: "",
      sourceFund: "",
      isCheck: false,
      receivedDate: new Date(),
      expiryDate: undefined,
      assetStatusID: "",
      // Hierarchy Fields
      categoryID: "",
      typeID: "",
      assetClassID: "",
      // Location Fields
      buildingID: "",
      roomID: "",
 
      // Asset Holder
      userID: "",
      images: undefined,
      depreciationValue: 0,
      availableAge: 0,
    },
  }) as UseFormReturn<AssetFormValues>;

  const { isDirty } = form.formState;
  const watchedUserID = form.watch("userID");
  const holderOrg = resolveHolderOrgLabels(
    watchedUserID,
    usersList,
    institutes,
    departments,
    sections,
  );


  // --- Live Calculation Logic (Depreciation & Residual Value) ---
  const watchedValue = form.watch("assetValue");
  const watchedAge = form.watch("availableAge");
  const watchedReceivedDate = form.watch("receivedDate");

  const calculateLiveDepreciation = () => {
    const totalValue = Number(watchedValue || 0);
    const availableAge = Number(watchedAge || 0);

    if (totalValue <= 1 || availableAge <= 0 || !watchedReceivedDate) {
      return 0;
    }

    const received = new Date(watchedReceivedDate);
    const now = new Date();

    // Calculate months elapsed (matching backend logic)
    const monthsElapsed =
      (now.getFullYear() - received.getFullYear()) * 12 +
      (now.getMonth() - received.getMonth());
    const effectiveMonths = Math.max(0, monthsElapsed);

    const usefulLifeMonths = availableAge * 12;
    const monthlyRate = (totalValue - 1) / usefulLifeMonths;
    const depreciation = Math.min(
      totalValue - 1,
      monthlyRate * effectiveMonths,
    );

    return depreciation;
  };

  const liveDepreciation = calculateLiveDepreciation();
  const totalValue = Number(watchedValue || 0);
  const liveResidualValue =
    totalValue <= 1 ? totalValue : Math.max(1, totalValue - liveDepreciation);

  // Sync live calculations to form state so they are sent on submit
  useEffect(() => {
    if (liveDepreciation !== undefined) {
      form.setValue("depreciationValue", liveDepreciation);
    }
  }, [liveDepreciation, form]);

  // Helper: Fetcher
  const fetcher = async (url: string) => {
    try {
      const res = await apiRequest(url);
      return Array.isArray(res) ? res : res.data || [];
    } catch (err) {
      console.error(`Failed to fetch ${url}`, err);
      return [];
    }
  };

  // 1. Load Initial Master Data
  useEffect(() => {
    if (
      !open ||
      !user?.organizationRelation?.organizationID ||
      !user?.isOrgVerified
    )
      return;

    const loadData = async () => {
      let _allRooms = [];

      // ⭐ Use Pre-fetched Data if available
      if (initialReferenceData) {
        setCategories(filterRefRows(initialReferenceData.categories));
        setStatuses(uniqueById(initialReferenceData.statuses || []));
        setBuildings(filterRefRows(initialReferenceData.buildings));
        setUsersList(
          normalizeOrgUserRows(
            Array.isArray(initialReferenceData.users)
              ? initialReferenceData.users
              : initialReferenceData.users?.data,
          ),
        );
        setGetByOptions(
          filterRefRows(initialReferenceData.getBy).map((row) => ({
            ...row,
            label: lovOptionLabel(row),
          })),
        );
        setSourceFundOptions(
          filterRefRows(initialReferenceData.sourceFund).map((row) => ({
            ...row,
            label: lovOptionLabel(row),
          })),
        );

        if (
          initialReferenceData.rooms &&
          initialReferenceData.rooms.length > 0
        ) {
          setAllRooms(initialReferenceData.rooms);
          _allRooms = initialReferenceData.rooms;
        }
      }

      const orgID = user?.organizationRelation?.organizationID;
      if (!orgID) return;

      // If we didn't have initial data OR we are missing rooms, fetch what is needed
      // Note: We might be re-fetching some things if initialReferenceData is partial,
      // but typically it's all-or-nothing.
      // We focus on missing rooms here or if initialReferenceData is totally missing.

      if (!initialReferenceData) {
        const [
          cats,
          stats,
          blds,
          usersData,
          getByRes,
          sourceFundRes,
          deptsRes,
          instsRes,
          secsRes,
        ] = await Promise.all([
          fetcher(`/asset/category/get/1/999?organizationID=${orgID}`),
          fetcher(`/asset/status/get_all?organizationID=${orgID}`),
          fetcher(`/facility/building/get/${orgID}`),
          fetchOrganizationUsers(orgID, 1, 999),
          fetcher(`/asset/get_by/get?organizationID=${orgID}`),
          fetcher(`/asset/source_fund/get?organizationID=${orgID}`),
          fetcher(`/organization/department/get?organizationID=${orgID}`),
          fetcher(`/organization/institute/get?organizationID=${orgID}`),
          fetcher(`/organization/section/get?organizationID=${orgID}`),
        ]);

        setCategories(filterRefRows(cats));
        setStatuses(uniqueById(stats));
        setBuildings(filterRefRows(blds));
        setUsersList(normalizeOrgUserRows(usersData.data || usersData));
        setGetByOptions(getByRes);
        setSourceFundOptions(sourceFundRes);
        setDepartments(deptsRes.departments || deptsRes || []);
        setInstitutes(instsRes);
        setSections(secsRes);
      } else {
        // Use pre-fetched hierarchy if available (New BFF), otherwise fetch
        if (
          initialReferenceData.departments &&
          initialReferenceData.institutes &&
          initialReferenceData.sections
        ) {
          setDepartments(initialReferenceData.departments);
          setInstitutes(initialReferenceData.institutes);
          setSections(initialReferenceData.sections);
        } else {
          // Fallback for older API response or missing data
          const [deptsRes, instsRes, secsRes] = await Promise.all([
            fetcher(`/organization/department/get?organizationID=${orgID}`),
            fetcher(`/organization/institute/get?organizationID=${orgID}`),
            fetcher(`/organization/section/get?organizationID=${orgID}`),
          ]);
          setDepartments(deptsRes.departments || deptsRes || []);
          setInstitutes(instsRes);
          setSections(secsRes);
        }
      }

      // Check if we need to fetch rooms (if not loaded from initialReferenceData)
      if (_allRooms.length === 0) {
        const allRoomsRes = await fetcher(`/facility/room/get?pageSize=10000`);
        setAllRooms(allRoomsRes.data || []);
      }
    };

    loadData();
  }, [open, user, initialReferenceData]);

  // 2. Cascading: Category -> Type
  const handleCategoryChange = async (catID: string) => {
    form.setValue("categoryID", catID, { shouldValidate: true });
    form.setValue("typeID", ""); // Reset child without triggering error
    form.setValue("assetClassID", ""); // Reset grandchild without triggering error
    setTypes([]);
    setClasses([]);

    if (catID && user?.organizationRelation?.organizationID) {
      const orgID = user.organizationRelation.organizationID;
      const res = await fetcher(
        `/asset/type/get_all?organizationID=${orgID}&categoryID=${catID}`,
      );
      setTypes(filterRefRows(res));
    }
  };

  // 3. Cascading: Type -> Class
  const handleTypeChange = async (typeID: string) => {
    form.setValue("typeID", typeID, { shouldValidate: true });
    form.setValue("assetClassID", ""); // Reset child without triggering error
    setClasses([]);

    if (typeID && user?.organizationRelation?.organizationID) {
      const orgID = user.organizationRelation.organizationID;
      const res = await fetcher(
        `/asset/class/get_all?organizationID=${orgID}&typeID=${typeID}`,
      );
      setClasses(filterRefRows(res));
    }
  };

  const handleClassChange = (classID: string) => {
    form.setValue("assetClassID", classID, { shouldValidate: true });
  };

  // 4. Cascading: Building -> Room
  const handleBuildingChange = async (bldID: string) => {
    form.setValue("buildingID", bldID, { shouldValidate: true });
    form.setValue("roomID", "");
    setRooms([]);

    if (bldID) {
      // Filter from allRooms instantly
      const filtered = allRooms.filter(
        (r: any) => String(r.buildingID) === String(bldID),
      );
      setRooms(filtered);
    }
  };

  // 5. Initialize Data for Edit Mode
  useEffect(() => {
    setPreviewImages([]);
    setDeletedImageIds([]);
    if (initialData && open) {
      const orgID = user?.organizationRelation?.organizationID;

      const loadEditData = async () => {
        let asset = initialData as import("../types").AssetData;
        try {
          const one = await apiRequest<{ data?: unknown }>(
            `/asset/get_one/${initialData.id}`,
          );
          const row = normalizeAssetRow(one?.data ?? one);
          if (row) asset = row;
        } catch {
          /* use list row */
        }

        const holders = normalizeOrgUserRows(usersList);
        const getByOpts = filterRefRows(getByOptions);
        const fundOpts = filterRefRows(sourceFundOptions);

        form.reset({
          assetName: asset.assetName,
          assetDetails: asset.assetDetail || "",
          assetValue: Number(asset.assetValue),
          assetNumber: asset.assetNumber,
          rfidNum: asset.rfidNum || "",
          getBy: resolveLovSelectValue(
            asset.getByID,
            asset.getBy,
            getByOpts,
          ),
          getFrom: asset.getFrom || "",
          sourceFund: resolveLovSelectValue(
            asset.sourceFundID,
            asset.sourceFund,
            fundOpts,
          ),
          isCheck: Boolean(asset.isCheck),
          receivedDate: parseAssetDate(asset.receivedDate) ?? new Date(),
          expiryDate: parseAssetDate(asset.expiryDate ?? undefined),
          assetStatusID: asset.assetStatusID
            ? String(asset.assetStatusID)
            : "",

          categoryID: String(asset.categoryID || ""),
          typeID: String(asset.typeID || ""),
          assetClassID: String(asset.assetClassID || ""),

          buildingID: asset.buildingID ? String(asset.buildingID) : "",
          roomID: asset.roomID ? String(asset.roomID) : "",

          userID: resolveHolderUserId(asset, holders),
          images: undefined,
          depreciationValue:
            asset.depreciation_value != null
              ? Number(asset.depreciation_value)
              : asset.currentValue != null
                ? Number(asset.currentValue)
                : 0,
          availableAge:
            asset.availableAge != null && asset.availableAge > 0
              ? Number(asset.availableAge)
              : 0,
        });

        // Load Dependent Dropdowns
        if (preloadedDependencies) {
          setTypes(filterRefRows(preloadedDependencies.types));
          setClasses(filterRefRows(preloadedDependencies.classes));
          // Preloaded Rooms
          // Preloaded Rooms check removed as per type definition and new logic
          // We rely purely on allRooms filtering below
        } else {
          // Fallback to existing fetch logic if no preloaded data
          if (asset.categoryID && orgID) {
            const typesData = await fetcher(
              `/asset/type/get_all?organizationID=${orgID}&categoryID=${asset.categoryID}`,
            );
            setTypes(filterRefRows(typesData));
          }
          if (asset.typeID && orgID) {
            const classesData = await fetcher(
              `/asset/class/get_all?organizationID=${orgID}&typeID=${asset.typeID}`,
            );
            setClasses(filterRefRows(classesData));
          }
        }

        // Load Rooms if building exists (Instant filtering)
        if (asset.buildingID) {
          const filtered = allRooms.filter(
            (r: any) => String(r.buildingID) === String(asset.buildingID),
          );
          setRooms(filtered);
        }

        // Images Preview
        if (asset.images && asset.images.length > 0) {
          const existingImages = asset.images.map((img: any) => {
            // Handle both string and object formats temporarily
            const path = typeof img === "string" ? img : img.image || img.url;
            const id = typeof img === "object" ? img.id : undefined;

            let cleanPath = path.replace(/\\/g, "/");
            cleanPath = cleanPath
              .replace(/^backend\//, "")
              .replace(/^frontend\//, "");
            if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
            return {
              id: id,
              url: assetImageUrl(path),
            };
          });
          setPreviewImages(existingImages);
        }
      };
      loadEditData();
    } else {
      // Create Mode
      form.reset({
        assetName: "",
        assetDetails: "",
        assetValue: 0,
        assetNumber: "",
        rfidNum: "",
        getBy: "",
        getFrom: "",
        sourceFund: "",
        isCheck: false,
        receivedDate: new Date(),
        expiryDate: undefined,
        assetStatusID: "",
        categoryID: "",
        typeID: "",
        assetClassID: "",
        buildingID: "",
        roomID: "",
        userID: "",
        images: undefined,
        depreciationValue: 0,
        availableAge: 0,
      });
      setTypes([]);
      setClasses([]);
      setRooms([]);
    }
  }, [
    initialData,
    open,
    user,
    form,
    preloadedDependencies,
    allRooms,
    usersList,
    getByOptions,
    sourceFundOptions,
  ]);

  // --- Submit Handler ---
  const onSubmit = async (values: AssetFormValues) => {
    if (loading) return;
    if (!user?.organizationRelation?.organizationID) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("assetName", values.assetName);
      formData.append("assetDetails", values.assetDetails || "");
      if (values.assetClassID)
        formData.append("assetClassID", values.assetClassID);
      if (values.assetValue !== undefined && values.assetValue !== null)
        formData.append("assetValue", String(values.assetValue));
      formData.append("assetNumber", values.assetNumber);
      if (values.rfidNum) formData.append("rfidNum", values.rfidNum);
      if (values.getBy) formData.append("getByID", values.getBy);
      if (values.getFrom) formData.append("getFrom", values.getFrom);
      if (values.sourceFund) formData.append("sourceFundID", values.sourceFund);
      if (values.availableAge !== undefined && values.availableAge !== null)
        formData.append("availableAge", String(values.availableAge));

      // Boolean Logic
      formData.append("isCheck", values.isCheck ? "true" : "");

      formData.append(
        "organizationID",
        String(user.organizationRelation.organizationID),
      );
      formData.append("receivedDate", values.receivedDate.toISOString());
      if (values.expiryDate)
        formData.append("expiryDate", values.expiryDate.toISOString());

      if (values.assetStatusID)
        formData.append("assetStatusID", values.assetStatusID);
      if (values.userID) formData.append("userID", values.userID);

      // Handle New Images
      const newFiles = previewImages.filter((p) => p.file).map((p) => p.file);
      if (newFiles.length > 0) {
        newFiles.forEach((file) => {
          if (file) formData.append("images", file);
        });
      }

      // Handle Deleted Images
      if (deletedImageIds.length > 0) {
        deletedImageIds.forEach((id) => {
          formData.append("deletedImageIds", String(id));
        });
      }

      const url = initialData
        ? `/asset/update/${initialData.id}`
        : `/asset/create`;
      const method = initialData ? "PATCH" : "POST";

      const resJson = await apiRequest<{
        data?: { id?: number; asset?: { id?: number } };
        id?: number;
      }>(url, {
        method,
        body: formData,
      });

      const savedAssetID =
        resJson.data?.id ||
        resJson.data?.asset?.id ||
        resJson.id ||
        (initialData ? initialData.id : null);

      // Handle Room Connection
      const newRoomID = values.roomID ? Number(values.roomID) : null;
      const oldRoomID = initialData?.roomID ? Number(initialData.roomID) : null;

      if (savedAssetID && newRoomID && newRoomID !== oldRoomID) {
        await apiRequest("/asset/room/connect", {
          method: "POST",
          body: JSON.stringify({ assetID: savedAssetID, roomID: newRoomID }),
        });
      }

      // Create Depreciation Log
      if (savedAssetID) {
        try {
          const { createDepreciationLog } = await import("@/lib/assets");
          await createDepreciationLog({
            assetID: savedAssetID,
            // Save Accumulated Depreciation directly to log
            value:
              values.depreciationValue !== undefined &&
              values.depreciationValue !== null
                ? Number(values.depreciationValue)
                : 0,
          });
        } catch (depErr) {
          console.error("Failed to create depreciation log", depErr);
          // Don't block the success flow, just log the error
        }
      }

      onSaved();
      onOpenChange(false);
      toast.success(
        initialData
          ? "แก้ไขข้อมูลสินทรัพย์สำเร็จ"
          : "เพิ่มข้อมูลสินทรัพย์สำเร็จ",
      );
    } catch (error: any) {
      console.error("Save asset failed", error);
      toast.error(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPreviews = Array.from(files).map((file) => ({
        url: URL.createObjectURL(file),
        file: file,
      }));
      setPreviewImages((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setPreviewImages((prev) => {
      const target = prev[index];
      if (target.id) {
        setDeletedImageIds((ids) => [...ids, target.id!]);
      }
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-muted flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-[1000px]" data-testid={TEST_IDS.ASSET_FORM.MODAL}>
        <DialogHeader className="bg-background shrink-0 rounded-t-lg border-b p-6 pb-4">
          <DialogTitle>
            {initialData ? "แก้ไขรายการสินทรัพย์" : "เพิ่มรายการสินทรัพย์ใหม่"}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="bg-background border-b px-6 py-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general" data-testid={TEST_IDS.ASSET_FORM.TAB_GENERAL}>ข้อมูลทั่วไป</TabsTrigger>
              <TabsTrigger value="gallery" disabled={!initialData} data-testid={TEST_IDS.ASSET_FORM.TAB_GALLERY}>
                คลังรูปภาพ
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                disabled={!initialData || !hasDocAccess}
                data-testid={TEST_IDS.ASSET_FORM.TAB_DEPRECIATION}
              >
                {initialData ? (
                  <span className="flex items-center gap-2">
                    {`เอกสาร (${initialData._count?.docs || "0"})`}
                    {!hasDocAccess && (
                      <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                        Pro
                      </span>
                    )}
                  </span>
                ) : (
                  "เอกสาร (บันทึกข้อมูลก่อน)"
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="general"
            className="m-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-8 overflow-y-auto p-6">
                  {/* ... (existing form content) ... */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* === LEFT COLUMN === */}
                    <div className="flex flex-col gap-6 md:col-span-2">
                      {/* General Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle>ข้อมูลทั่วไป</CardTitle>
                          <CardDescription>
                            รายละเอียดหลักของสินทรัพย์
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="assetName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  ชื่อสินทรัพย์{" "}
                                  <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="เช่น MacBook Pro M3"
                                    {...field}
                                    autoComplete="off"
                                    data-testid={TEST_IDS.ASSET_FORM.INPUT_NAME}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="userID"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  เลือกผู้ถือครอง{" "}
                                  <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_OWNER}>
                                      <SelectValue placeholder="เลือกผู้ถือครอง" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {normalizeOrgUserRows(usersList).map((u) => (
                                      <SelectItem
                                        key={String(u.user.id)}
                                        value={String(u.user.id)}
                                      >
                                        {u.user.name} {u.user.surname} (
                                        {u.user.username})
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
                            name="assetDetails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>รายละเอียดเพิ่มเติม</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="ระบุรายละเอียด..."
                                    className="min-h-[120px]"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid={TEST_IDS.ASSET_FORM.TEXTAREA_NOTE}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Location (New Card) */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" /> สถานที่จัดเก็บ
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {buildings.length === 0 && !loading && (
                            <div className="bg-yellow-500/10 border-yellow-500/20 flex flex-col gap-2 rounded-lg border p-3 text-sm">
                              <div className="flex items-center gap-2 font-semibold text-yellow-600 dark:text-yellow-500">
                                <AlertTriangle className="h-4 w-4" />
                                ไม่พบข้อมูลอาคาร
                              </div>
                              <p className="text-muted-foreground">
                                กรุณาเพิ่มอาคารก่อนทำรายการที่{" "}
                                <Link
                                  href="/organization"
                                  className="text-primary font-medium underline underline-offset-4"
                                  data-testid={TEST_IDS.ASSET_FORM.LINK_MANAGE_LOCATION}
                                >
                                  จัดการโครงสร้างองค์กร
                                </Link>
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="buildingID"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    อาคาร{" "}
                                    {buildings.length > 0
                                      ? `(${buildings.length})`
                                      : ""}
                                  </FormLabel>
                                  <Select
                                    onValueChange={(val) =>
                                      handleBuildingChange(val)
                                    }
                                    value={field.value}
                                    disabled={buildings?.length === 0}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_BUILDING}>
                                        <SelectValue placeholder="เลือกอาคาร" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {filterRefRows(buildings).map((b) => (
                                        <SelectItem
                                          key={String(b.id)}
                                          value={String(b.id)}
                                        >
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
                                <FormItem>
                                  <FormLabel>
                                    ห้อง{" "}
                                    {rooms.length > 0
                                      ? `(${rooms.length})`
                                      : ""}
                                  </FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={
                                      !form.watch("buildingID") ||
                                      rooms.length === 0
                                    }
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_ROOM}>
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
                                      {filterRefRows(rooms).map((r) => {
                                        const rNumber =
                                          r.roomNumber || r.room_number;
                                        const rName = r.roomName || r.room_name;
                                        return (
                                          <SelectItem
                                            key={r.id}
                                            value={String(r.id)}
                                          >
                                            {rNumber && rNumber !== "null"
                                              ? `${rNumber} - ${rName || "(ไม่ระบุชื่อ)"}`
                                              : rName || "ห้อง (ไม่ระบุชื่อ)"}
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

                          {/* Hierarchy derived from holder (read-only) */}
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <FormItem>
                              <FormLabel>สำนัก</FormLabel>
                              <FormControl>
                                <Input disabled value={holderOrg.institute} />
                              </FormControl>
                            </FormItem>
                            <FormItem>
                              <FormLabel>ฝ่าย</FormLabel>
                              <FormControl>
                                <Input disabled value={holderOrg.division} />
                              </FormControl>
                            </FormItem>
                            <FormItem>
                              <FormLabel>งาน</FormLabel>
                              <FormControl>
                                <Input disabled value={holderOrg.work} />
                              </FormControl>
                            </FormItem>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Specs & Dates */}
                      <Card>
                        <CardHeader>
                          <CardTitle>ข้อมูลจำเพาะ</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="assetNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  รหัสสินทรัพย์{" "}
                                  <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="AST-XXXX" {...field} data-testid={TEST_IDS.ASSET_FORM.INPUT_CODE} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="rfidNum"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>RFID</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Scan RFID..."
                                    {...field}
                                    disabled
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="assetValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  มูลค่า (บาท){" "}
                                  <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="ระบุมูลค่า"
                                    {...field}
                                    value={(field.value as number) ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value)
                                    }
                                    data-testid={TEST_IDS.ASSET_FORM.INPUT_VALUE}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {/* Moved from Duration Card */}
                          <FormField
                            control={form.control}
                            name="availableAge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>อายุการใช้งาน (ปี)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="ระบุปี"
                                    {...field}
                                    value={(field.value as number) ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="depreciationValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  ค่าเสื่อมราคาสะสม (คำนวณจากระบบ)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    disabled
                                    className=""
                                    value={liveDepreciation.toLocaleString("th-TH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormItem>
                            <FormLabel>มูลค่าคงเหลือโดยประมาณ</FormLabel>
                            <Input
                              disabled
                              className=""
                              value={liveResidualValue.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            />
                          </FormItem>
                        </CardContent>
                      </Card>

                      {/* Card 3: Dates (Fixed Layout) */}
                      <Card>
                        <CardHeader>
                          <CardTitle>ระยะเวลา</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="receivedDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>
                                  วันที่ได้รับ{" "}
                                  <span className="text-red-500">*</span>
                                </FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                      >
                                        {field.value ? (
                                          formatThaiDate(field.value)
                                        ) : (
                                          <span>เลือกวันที่</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date > new Date() ||
                                        date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                      captionLayout="dropdown"
                                      startMonth={new Date(1900, 0)}
                                      endMonth={new Date()}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="expiryDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>
                                  วันหมดอายุ / สิ้นสุดประกัน
                                </FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                      >
                                        {field.value ? (
                                          formatThaiDate(field.value)
                                        ) : (
                                          <span>เลือกวันที่</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <Calendar
                                      mode="single"
                                      selected={field.value ?? undefined}
                                      onSelect={field.onChange}
                                      initialFocus
                                      captionLayout="dropdown"
                                      startMonth={new Date(1900, 0)}
                                      endMonth={new Date(2100, 11)}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* === RIGHT COLUMN === */}
                    <div className="flex flex-col gap-6">
                      {/* Categorization */}
                      <Card>
                        <CardHeader>
                          <CardTitle>การจัดหมวดหมู่</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {categories.length === 0 && !loading && (
                            <div className="bg-yellow-500/10 border-yellow-500/20 flex flex-col gap-2 rounded-lg border p-3 text-sm">
                              <div className="flex items-center gap-2 font-semibold text-yellow-600 dark:text-yellow-500">
                                <AlertTriangle className="h-4 w-4" />
                                ไม่พบข้อมูลหมวดหมู่
                              </div>
                              <p className="text-muted-foreground">
                                กรุณาเพิ่มหมวดหมู่ก่อนใช้งานที่{" "}
                                <Link
                                  href="/assets/structure"
                                  className="text-primary font-medium underline underline-offset-4"
                                  data-testid={TEST_IDS.ASSET_FORM.LINK_MANAGE_STRUCTURE}
                                >
                                  โครงสร้างสินทรัพย์
                                </Link>
                              </p>
                            </div>
                          )}
                          <FormField
                            control={form.control}
                            name="categoryID"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  หมวดหมู่{" "}
                                  <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select
                                  onValueChange={(val) =>
                                    handleCategoryChange(val)
                                  }
                                  value={field.value}
                                  disabled={categories.length === 0}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_CATEGORY}>
                                      <SelectValue placeholder="เลือกหมวดหมู่" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {filterRefRows(categories).map((c) => (
                                      <SelectItem
                                        key={String(c.id)}
                                        value={String(c.id)}
                                      >
                                        {String(
                                          c.categoryName ?? c.title ?? "",
                                        )}
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
                            name="typeID"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  ประเภท <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select
                                  onValueChange={(val) => handleTypeChange(val)}
                                  value={field.value}
                                  disabled={
                                    !form.watch("categoryID") ||
                                    types.length === 0
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_TYPE}>
                                      <SelectValue placeholder="เลือกประเภท" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {filterRefRows(types).map((t) => (
                                      <SelectItem
                                        key={String(t.id)}
                                        value={String(t.id)}
                                      >
                                        {t.typeName}
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
                            name="assetClassID"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  กลุ่ม <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select
                                  onValueChange={handleClassChange}
                                  value={field.value}
                                  disabled={
                                    !form.watch("typeID") ||
                                    classes.length === 0
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_CLASS}>
                                      <SelectValue placeholder="เลือกกลุ่ม" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {filterRefRows(classes).map((c) => (
                                      <SelectItem
                                        key={String(c.id)}
                                        value={String(c.id)}
                                      >
                                        {c.className}
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
                            name="assetStatusID"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>สถานะ</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={Boolean(
                                    initialData?.statusIsLocked,
                                  )}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_STATUS}>
                                      <SelectValue placeholder="เลือกสถานะ" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {filterRefRows(statuses).map((s) => (
                                        <SelectItem
                                          key={String(s.id)}
                                          value={String(s.id)}
                                          disabled={
                                            Boolean(s.isLocked) &&
                                            String(s.id) !==
                                              String(initialData?.assetStatusID)
                                          }
                                        >
                                          {s.status}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Acquisition & Budget */}
                      <Card>
                        <CardHeader>
                          <CardTitle>ข้อมูลการได้มา</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="getBy"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  วิธีการได้รับ{" "}
                                  <span className="text-destructive">*</span>
                                  {!field.value && (
                                    <AlertTriangle className="h-4 w-4 animate-pulse text-yellow-500" />
                                  )}
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="เลือกวิธีการได้รับ" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {filterRefRows(getByOptions).map((o) => (
                                      <SelectItem
                                        key={String(o.id)}
                                        value={String(o.id)}
                                      >
                                        {lovOptionLabel(o)}
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
                            name="getFrom"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  ได้มาจาก (ร้านค้า / บริษัท / บุคคล)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="ระบุที่มาของสินทรัพย์"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sourceFund"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  แหล่งงบประมาณ{" "}
                                  <span className="text-destructive">*</span>
                                  {!field.value && (
                                    <AlertTriangle className="h-4 w-4 animate-pulse text-yellow-500" />
                                  )}
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full" data-testid={TEST_IDS.ASSET_FORM.SELECT_SOURCE_FUND}>
                                      <SelectValue placeholder="เลือกแหล่งงบประมาณ" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {filterRefRows(sourceFundOptions).map((o) => (
                                      <SelectItem
                                        key={String(o.id)}
                                        value={String(o.id)}
                                      >
                                        {lovOptionLabel(o)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="bg-muted/50 mt-2 flex items-center gap-3 rounded-md border p-3">
                            <FormField
                              control={form.control}
                              name="isCheck"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      ต้องตรวจนับ
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Images */}
                      <Card className="overflow-hidden">
                        <CardHeader>
                          <CardTitle>รูปภาพ</CardTitle>
                          <CardDescription>อัปโหลดสูงสุด 4 รูป</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <FormField
                            control={form.control}
                            name="images"
                            render={({
                              field: { value, onChange, ...fieldProps },
                            }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="grid gap-4">
                                    {previewImages.length > 0 && (
                                      <div className="mb-2 grid grid-cols-2 gap-2">
                                        {previewImages.map((img, idx) => (
                                          <div
                                            key={idx}
                                            className="group relative aspect-square overflow-hidden rounded-md border bg-gray-50"
                                            data-testid={TEST_IDS.ASSET_FORM.IMAGE_THUMBNAIL(idx)}
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={img.url}
                                              alt="Preview"
                                              className="h-full w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
                                              onClick={() => openLightbox(idx)}
                                              data-testid={TEST_IDS.ASSET_FORM.BUTTON_IMAGE_PREVIEW(idx)}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeImage(idx)}
                                              className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                                              data-testid={TEST_IDS.ASSET_FORM.BUTTON_IMAGE_REMOVE(idx)}
                                            >
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <path d="M18 6 6 18" />
                                                <path d="m6 6 12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="hover:bg-muted/50 border-muted-foreground/25 bg-muted/5 relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors">
                                      <div className="flex flex-col items-center justify-center px-4 pt-5 pb-6 text-center">
                                        <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                                        <p className="text-muted-foreground text-sm">
                                          <span className="font-semibold">
                                            คลิกเพื่ออัปโหลด
                                          </span>
                                        </p>
                                      </div>
                                      <Input
                                        {...fieldProps}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                        onChange={handleFileChange}
                                        data-testid={TEST_IDS.ASSET_FORM.INPUT_IMAGE_UPLOAD}
                                      />
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                <DialogFooter className="bg-background shrink-0 rounded-b-lg border-t p-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="mr-2"
                    data-testid={TEST_IDS.ASSET_FORM.BUTTON_CANCEL}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      (initialData &&
                        !isDirty &&
                        deletedImageIds.length === 0 &&
                        !previewImages.some((p) => p.file))
                    }
                    className="min-w-[120px]"
                    data-testid={TEST_IDS.ASSET_FORM.BUTTON_SUBMIT}
                  >
                    {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </Button>
                </DialogFooter>

              </form>
            </Form>
          </TabsContent>

          {initialData && (
            <TabsContent
              value="documents"
              className="m-0 flex min-h-0 flex-1 flex-col p-6 data-[state=inactive]:hidden"
            >
              {hasDocAccess ? (
                <AssetDocsTab
                  assetID={initialData.id}
                  organizationID={
                    user?.organizationRelation?.organizationID || 0
                  }
                />
              ) : (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                  <p>คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (Pro Feature)</p>
                </div>
              )}
            </TabsContent>
          )}

          {initialData && (
            <TabsContent
              value="gallery"
              className="m-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
            >
              {activeTab === "gallery" && (
                <AssetGalleryTab
                  assetID={initialData.id}
                  usersList={usersList}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl overflow-hidden border-none bg-black/90 p-0" data-testid={TEST_IDS.ASSET_FORM.LIGHTBOX}>
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative flex h-[80vh] w-full items-center justify-center">
            {previewImages.length > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImages[lightboxIndex]?.url}
                alt="Full Preview"
                className="max-h-full max-w-full object-contain"
                data-testid={TEST_IDS.ASSET_FORM.LIGHTBOX_IMAGE}
              />
            )}
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300"
              onClick={() => setLightboxOpen(false)}
              data-testid={TEST_IDS.ASSET_FORM.LIGHTBOX_BUTTON_CLOSE}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            {previewImages.length > 1 && (
              <>
                <button
                  className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:text-gray-300"
                  onClick={() =>
                    setLightboxIndex(
                      (prev) =>
                        (prev - 1 + previewImages.length) %
                        previewImages.length,
                    )
                  }
                  data-testid={TEST_IDS.ASSET_FORM.LIGHTBOX_BUTTON_PREV}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:text-gray-300"
                  onClick={() =>
                    setLightboxIndex(
                      (prev) => (prev + 1) % previewImages.length,
                    )
                  }
                  data-testid={TEST_IDS.ASSET_FORM.LIGHTBOX_BUTTON_NEXT}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
