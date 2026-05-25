import { Metadata } from "next";
import { Suspense } from "react";
import ClientAssetsPage from "./client-page";

export const metadata: Metadata = {
  title: "รายการสินทรัพย์",
  description: "แสดงรายการสินทรัพย์ทั้งหมดจากระบบ Smart Asset Tracking",
};

import { auth } from "@/lib/server-auth";
import { getAssetsInitialData } from "@/lib/data-service";

export default async function Page() {
  const session = await auth();
  const user = session?.user as any;
  const orgId = user?.organizationID;

  let initialData = { data: [], total: 0 };
  let referenceData = {
    categories: [],
    statuses: [],
    buildings: [],
    users: [],
    getBy: [],
    sourceFund: [],
    rooms: [],
    departments: [],
    institutes: [],
    sections: [],
  };

  if (orgId) {
    try {
      // ⭐ Aggregation API Call (BFF Pattern) - 1 Request instead of 8
      const data = await getAssetsInitialData(orgId, 1, 10);

      initialData = data.assets;
      referenceData = {
        categories: data.categories || [],
        statuses: data.statuses || [],
        buildings: data.buildings || [],
        users: data.users?.data || [], // Backend returns wrapped { data: users, total: ... }
        getBy: data.getBy || [],
        sourceFund: data.sourceFund || [],
        rooms: data.rooms || [],
        departments: data.departments || [],
        institutes: data.institutes || [],
        sections: data.sections || [],
      };
    } catch (error: any) {
      if (
        error?.message?.includes("NEXT_REDIRECT") ||
        error?.digest?.includes("NEXT_REDIRECT")
      ) {
        throw error;
      }
      console.error("Failed to fetch initial assets:", error);
    }
  }

  return (
    <Suspense fallback={<div className="p-4" />}>
      <ClientAssetsPage
        initialData={initialData}
        initialReferenceData={referenceData}
      />
    </Suspense>
  );
}
