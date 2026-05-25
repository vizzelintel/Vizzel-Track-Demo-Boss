import { apiRequest } from "./api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type AssetDoc = {
  id: number;
  assetID: number;
  doc: string; // URL or Path
  docName: string;
  docType: string;
  createdAt: string;
  updatedAt: string;
};

export type AssetClassDoc = {
  id: number;
  assetClassID: number;
  doc: string; // URL or Path
  docName: string;
  docType: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateAssetDocDto = {
  assetID: number;
  organizationID: number;
  doc: File;
  docName: string;
  docType?: string;
};

export type UpdateAssetDocDto = {
  docAssetID: number;
  assetID?: number;
  doc?: string;
  docName?: string;
  docType?: string;
};

export type CreateAssetClassDocDto = {
  assetClassID: number;
  organizationID: number;
  doc: File;
  docName: string;
  docType?: string;
};

export type UpdateAssetClassDocDto = {
  docClassID: number;
  assetClassID?: number;
  doc?: string;
  docName?: string;
  docType?: string;
};

// ----------------------------------------------------------------------
// API Functions (Depreciation)
// ----------------------------------------------------------------------

export interface CreateDepreciationPayload {
  assetID: number;
  value: number;
}

export function createDepreciationLog(payload: CreateDepreciationPayload) {
  return apiRequest(`/asset/depreciation/create`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------------------------
// API Functions (Asset Docs)
// ----------------------------------------------------------------------

export async function getAssetDocs(assetID: number) {
  return apiRequest(`/asset/doc/get/${assetID}`);
}

export async function getDashboardStats(organizationID: number) {
  return apiRequest(`/asset/dashboard?organizationID=${organizationID}`);
}

// ----------------------------------------------------------------------
// API Functions (Check Job)
// ----------------------------------------------------------------------

export async function getAssetCheckHistory(assetID: number) {
  return apiRequest(`/checkJob/history/${assetID}`);
}

export async function createAssetDoc(data: CreateAssetDocDto) {
  const formData = new FormData();
  formData.append("assetID", data.assetID.toString());
  formData.append("organizationID", data.organizationID.toString());
  formData.append("doc", data.doc);
  formData.append("docName", data.docName);
  if (data.docType) {
    formData.append("docType", data.docType);
  }

  return apiRequest(`/asset/doc/create`, {
    method: "POST",
    body: formData,
  });
}

export async function updateAssetDoc(data: UpdateAssetDocDto) {
  const formData = new FormData();
  formData.append("docAssetID", data.docAssetID.toString());
  if (data.assetID) formData.append("assetID", data.assetID.toString());
  if (data.docName) formData.append("docName", data.docName);

  return apiRequest(`/asset/doc/update`, {
    method: "PATCH",
    body: formData,
  });
}

export async function deleteAssetDoc(docAssetID: number) {
  return apiRequest(`/asset/doc/delete`, {
    method: "PATCH",
    body: JSON.stringify({ docAssetID }),
  });
}

// ----------------------------------------------------------------------
// API Functions (Asset Class Docs)
// ----------------------------------------------------------------------

export async function getAssetClassDocs(assetClassID: number) {
  return apiRequest(`/asset/doc/class/doc/get/${assetClassID}`);
}

export async function createAssetClassDoc(data: CreateAssetClassDocDto) {
  const formData = new FormData();
  formData.append("assetClassID", data.assetClassID.toString());
  formData.append("organizationID", data.organizationID.toString());
  formData.append("doc", data.doc);
  formData.append("docName", data.docName);
  if (data.docType) {
    formData.append("docType", data.docType);
  }

  return apiRequest(`/asset/doc/class/doc/create`, {
    method: "POST",
    body: formData,
  });
}

export async function updateAssetClassDoc(data: UpdateAssetClassDocDto) {
  const formData = new FormData();
  formData.append("docClassID", data.docClassID.toString());
  if (data.assetClassID)
    formData.append("assetClassID", data.assetClassID.toString());
  if (data.docName) formData.append("docName", data.docName);

  return apiRequest(`/asset/doc/class/doc/update`, {
    method: "PATCH",
    body: formData,
  });
}

export async function deleteAssetClassDoc(docClassID: number) {
  return apiRequest(`/asset/doc/class/doc/delete`, {
    method: "PATCH",
    body: JSON.stringify({ docClassID }),
  });
}

// ----------------------------------------------------------------------
// Import / Export
// ----------------------------------------------------------------------

import { getSessionSingleton as getSession, BASE_URL } from "./api";

export async function downloadAssetTemplate() {
  const blob = await apiRequest(`/asset/template`, {
    method: "GET",
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "asset-template.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export type ExportAssetsOptions = {
  mode: "all" | "filter" | "custom";
  assetClassID?: number[];
  assetID?: number[];
  file?: "default" | "elaas"; // Added file parameter
};

export async function exportAssets(
  organizationID: number,
  options: ExportAssetsOptions,
) {
  const payload: any = {
    mode: options.mode,
  };

  if (options.mode === "filter" && options.assetClassID) {
    payload.assetClassID = options.assetClassID;
  }

  if (options.mode === "custom" && options.assetID) {
    payload.assetID = options.assetID;
  }

  // Build Query String
  let query = `/asset/export?organizationID=${organizationID}`;
  if (options.file) {
    query += `&file=${options.file}`;
  }

  const blob = await apiRequest(query, {
    method: "POST",
    body: JSON.stringify(payload),
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  // Determine extension based on format
  const extension = options.file === "elaas" ? "xlsx" : "csv";
  a.download = `asset-export-${organizationID}-${options.mode}.${extension}`;

  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function importAssets(
  organizationID: number,
  file: File,
  force: boolean = false,
  dryRun: boolean = false,
  format: "default" | "elaas" = "default",
) {
  const formData = new FormData();
  formData.append("organizationID", organizationID.toString());
  formData.append("file", file);
  formData.append("force", force ? "1" : "0");
  formData.append("dryRun", dryRun ? "true" : "false");
  if (format !== "default") {
    formData.append("format", format);
  }

  return apiRequest(`/asset/import`, {
    method: "POST",
    body: formData,
    timeout: 120000, // 2 minutes
  });
}

export async function convertElaasToCSV(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiRequest(`/asset/import/convert-elaas`, {
    method: "POST",
    body: formData,
    timeout: 120000,
  });
  return res.csv;
}
