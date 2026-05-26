import { z } from "zod";

// --- Schema สำหรับ Form (Create/Update) ---
export const assetFormSchema = z.object({
  assetName: z.string().min(1, "กรุณากรอกชื่อสินทรัพย์"),
  assetDetails: z.string().optional(),

  // Field เดิม
  assetClassID: z.string().min(1, "กรุณาเลือกกลุ่ม"),
  assetValue: z.coerce.number().min(1, "กรุณากรอกมูลค่ามากกว่า 0"),
  assetNumber: z.string().min(1, "กรุณากรอกรหัสสินทรัพย์"),
  // R1: รหัส Elaas (optional national registry code) — paired with assetNumber.
  elaasCode: z.string().optional(),
  rfidNum: z.string().optional(),
  isCheck: z.boolean().default(false),
  // R1: คิดค่าเสื่อม flag. Default true to match Postgres default.
  isDepreciation: z.boolean().default(true),

  receivedDate: z.date({ message: "กรุณาเลือกวันที่ได้รับ" }),
  expiryDate: z.date().nullable().optional(),

  assetStatusID: z.string().optional(),

  // ⭐ เพิ่ม Field ใหม่ (Category, Type, Building, Room)
  categoryID: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  typeID: z.string().min(1, "กรุณาเลือกประเภท"),
  buildingID: z.string().optional(),
  roomID: z.string().optional(),

  // ⭐ เพิ่ม Field ใหม่ (Acquisition & Funding)
  getBy: z.string().min(1, "กรุณาเลือกวิธีการได้รับ"),
  getFrom: z.string().optional(),
  sourceFund: z.string().min(1, "กรุณาเลือกแหล่งงบประมาณ"),

  // จัดการไฟล์รูปภาพ
  images: z.custom<FileList>().optional(),

  // ⭐ เพิ่ม Field ผู้ถือครอง
  userID: z.string().min(1, "กรุณาเลือกผู้ถือครอง"),

  // Field มูลค่าเสื่อมราคา
  depreciationValue: z.coerce.number().optional(),

  // ⭐ เพิ่ม Field ใหม่ (Lifetime/Usage Age)
  availableAge: z.coerce.number().optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export interface AssetData {
  id: number;
  assetName: string;
  assetNumber: string;
  elaasCode?: string | null;
  rfidNum: string;
  assetValue: number;
  isCheck: boolean;
  isDepreciation?: boolean;
  assetStatusID: number | null;
  assetStatusName: string | null;
  image: string | null;
  images: string[];

  // Location
  roomID: number | null;
  roomName: string | null;
  buildingName: string | null;

  // Hierarchy
  assetClassID: number;
  className: string;
  typeID: number;
  typeName: string;
  categoryID: number;
  categoryName: string;

  // New Fields
  getBy?: string | null;
  getByID?: number | null;
  getFrom?: string | null;
  sourceFund?: string | null;
  sourceFundID?: number | null;

  // Location IDs (สำหรับ Edit)
  buildingID?: number | null;

  receivedDate: string;
  expiryDate: string | null;
  assetDetail: string | null;
  users?: {
    id: number;
    name: string;
    surname: string;
    institute?: { id: number; name: string } | null;
    dept?: { id: number; name: string } | null;
    section?: { id: number; name: string } | null;
  }[];
  currentValue?: number;
  availableAge?: number | null;
  statusIsLocked?: boolean;
  depreciation_value?: number | null;
}
