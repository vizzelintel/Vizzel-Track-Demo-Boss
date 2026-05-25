import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  fetchOrganizationUsers,
  OrganizationUsersResponse,
  OrgUser,
} from "@/lib/user";

export function useOrganizationUsers(
  organizationID?: number | null,
  initialPage = 1,
  pageSize = 10,
  searchQuery = "",
  verify?: number,
  initialData?: any, // Add initialData prop
  roleIDs?: number[],
) {
  const [page, setPage] = useState(initialPage);

  // Reset page to 1 when searchQuery changes
  // Note: We need a ref or effect to track this.
  // Using simplified logic: if we change search query, we want to go back to page 1.
  // We can use an effect here.
  const [prevSearch, setPrevSearch] = useState(searchQuery);
  if (searchQuery !== prevSearch) {
    setPage(1);
    setPrevSearch(searchQuery);
  }

  // Define SWR Key
  const key = organizationID
    ? [
        `/organization/users`,
        organizationID,
        page,
        pageSize,
        verify,
        searchQuery,
        roleIDs,
      ] // Include searchQuery in key
    : null;

  // Define components consistent fetcher
  const fetcher = async () => {
    if (!organizationID) return null;
    return await fetchOrganizationUsers(
      organizationID,
      page,
      pageSize,
      verify,
      searchQuery,
      roleIDs,
    );
  };

  const {
    data: swrData,
    error,
    isLoading,
    mutate,
  } = useSWR(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    fallbackData:
      page === initialPage && searchQuery === "" && initialData
        ? initialData
        : undefined,
    revalidateOnMount: !(
      page === initialPage &&
      searchQuery === "" &&
      initialData
    ), // Disable fetch on mount if initialData is used
  });

  // Manual fallback: If SWR hasn't returned data yet (or key is null), use initialData
  const data =
    swrData ||
    (page === initialPage && searchQuery === "" && initialData
      ? initialData
      : undefined);

  const refresh = () => {
    mutate();
  };

  return {
    data: data, // Return direct data (server-side filtered)
    loading: isLoading,
    error: error ? error.message || "เกิดข้อผิดพลาด" : null,
    page,
    setPage,
    pageSize,
    refresh,
    setData: (fnOrData: any) => {
      const fallback =
        page === initialPage && searchQuery === "" && initialData
          ? initialData
          : undefined;
      return mutate((currentCacheData: any) => {
        const baseData = currentCacheData || fallback;
        // If still no data to work with, return undefined (or handle gracefully)
        if (!baseData) return undefined;

        if (typeof fnOrData === "function") {
          return fnOrData(baseData);
        }
        return fnOrData;
      }, false);
    },
  };
}
