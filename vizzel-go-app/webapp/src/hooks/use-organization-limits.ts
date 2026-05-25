"use client";

import useSWR from "swr";
import { useSession } from "@/shims/next-auth";
import { apiRequest } from "@/lib/api";

export interface RecordLimitData {
  recordLimit: number;
  assetCount: number;
  unit: string;
}

export interface StorageLimitData {
  storageLimit: number;
  usedStorage: number;
  unit: string;
}

export interface UserLimitData {
  organizationID: number;
  userLimit: number;
  userCount: number;
}

export interface OfficerLimitData {
  organizationID: number;
  officerLimit: number;
  officerCount: number;
}

export function useOrganizationLimits(
  organizationID: number | null,
  initialData?: any,
) {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const key =
    organizationID && token ? [`/organization/limits`, organizationID] : null;

  const fetcher = async () => {
    if (!organizationID) return null;

    // ⭐ Optimized Single Fetch
    const res = await apiRequest(
      `/organization/limits/overview/${organizationID}`,
      { cache: "no-store" },
    );
    const data = res.data;

    return {
      recordLimit: {
        recordLimit: data.recordLimit.limit,
        assetCount: data.recordLimit.used,
        unit: "byte", // Default unit from backend raw response
      } as RecordLimitData,
      storageLimit: {
        storageLimit: data.storageLimit.limit, // MB
        usedStorage: data.storageLimit.used, // MB
        unit: "mb",
      } as StorageLimitData,
      userLimit: {
        organizationID: data.organizationID,
        userLimit: data.userLimit.limit,
        userCount: data.userLimit.used,
      } as UserLimitData,
      officerLimit: {
        organizationID: data.organizationID,
        officerLimit: data.officerLimit.limit,
        officerCount: data.officerLimit.used,
      } as OfficerLimitData,
    };
  };

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: true,
    keepPreviousData: true,
    fallbackData: initialData,
    revalidateOnMount: true,
    dedupingInterval: 5000,
  });

  return {
    recordLimit: data?.recordLimit ?? null,
    storageLimit: data?.storageLimit ?? null,
    userLimit: data?.userLimit ?? null,
    officerLimit: data?.officerLimit ?? null,
    loading: isLoading,
    refresh: () => mutate(),
    // Expose setters for optimistic updates (Mutate specific fields)
    setRecordLimit: (newData: any) =>
      mutate((prev: any) => ({ ...prev, recordLimit: newData }), false),
    setStorageLimit: (newData: any) =>
      mutate((prev: any) => ({ ...prev, storageLimit: newData }), false),
    setUserLimit: (newData: any) =>
      mutate((prev: any) => ({ ...prev, userLimit: newData }), false),
    setOfficerLimit: (newData: any) =>
      mutate((prev: any) => ({ ...prev, officerLimit: newData }), false),
  };
}
