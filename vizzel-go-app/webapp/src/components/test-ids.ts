
export const TEST_IDS = {


  LOGIN: {
    /** Form หลักของหน้า Login */
    FORM: "login-form",
    /** Input อีเมล */
    INPUT_EMAIL: "input-email",
    /** Input รหัสผ่าน */
    INPUT_PASSWORD: "input-password",
    /** Checkbox "จำชื่อผู้ใช้และรหัสผ่าน" */
    CHECKBOX_REMEMBER: "checkbox-remember-me",
    /** ปุ่มแสดง/ซ่อนรหัสผ่าน */
    BUTTON_TOGGLE_PASSWORD: "login-button-toggle-password",
    /** ปุ่ม "เข้าสู่ระบบ" (submit) */
    BUTTON_SUBMIT: "login-button-submit",
    /** ปุ่ม "Sign in with Google" */
    BUTTON_GOOGLE: "login-button-google",
    /** ลิงก์ "ลืมรหัสผ่าน?" */
    LINK_FORGOT_PASSWORD: "login-link-forgot-password",
    /** ลิงก์ "สร้างบัญชีใหม่" */
    LINK_REGISTER: "login-link-register",
    /** Alert แสดง error */
    ALERT_ERROR: "login-alert-error",
  },

  REGISTER: {
    /** Form หลักของหน้า Register */
    FORM: "register-form",
    /** Input ชื่อผู้ใช้ */
    INPUT_USERNAME: "input-username",
    /** Input อีเมล */
    INPUT_EMAIL: "input-email",
    /** Input รหัสผ่าน */
    INPUT_PASSWORD: "input-password",
    /** Input ยืนยันรหัสผ่าน */
    INPUT_CONFIRM_PASSWORD: "input-confirm-password",
    /** ปุ่มแสดง/ซ่อนรหัสผ่าน */
    BUTTON_TOGGLE_PASSWORD: "register-button-toggle-password",
    /** ปุ่มแสดง/ซ่อนยืนยันรหัสผ่าน */
    BUTTON_TOGGLE_CONFIRM_PASSWORD: "register-button-toggle-confirm-password",
    /** ปุ่ม "สมัครสมาชิก" (submit) */
    BUTTON_SUBMIT: "register-button-submit",
    /** ลิงก์ "เข้าสู่ระบบ" */
    LINK_LOGIN: "register-link-login",
    /** Alert แสดง error */
    ALERT_ERROR: "register-alert-error",
  },

  FORGOT_PASSWORD: {
    /** Form หลัก */
    FORM: "forgot-password-form",
    /** Input อีเมล */
    INPUT_EMAIL: "input-email",
    /** ปุ่ม "ส่งลิงก์รีเซ็ต" (submit) */
    BUTTON_SUBMIT: "forgot-password-button-submit",
    /** ลิงก์ "กลับสู่หน้าเข้าสู่ระบบ" */
    LINK_BACK_LOGIN: "forgot-password-link-back-login",
    /** Alert แสดง success */
    ALERT_SUCCESS: "forgot-password-alert-success",
    /** Alert แสดง error */
    ALERT_ERROR: "forgot-password-alert-error",
  },

  RESET_PASSWORD: {
    /** Form หลัก */
    FORM: "reset-password-form",
    /** Input รหัสผ่านใหม่ */
    INPUT_NEW_PASSWORD: "input-new-password",
    /** Input ยืนยันรหัสผ่านใหม่ */
    INPUT_CONFIRM_PASSWORD: "input-confirm-password",
    /** ปุ่ม "รีเซ็ตรหัสผ่าน" (submit) */
    BUTTON_SUBMIT: "reset-password-button-submit",
    /** Alert แสดง error */
    ALERT_ERROR: "reset-password-alert-error",
  },

  VERIFY_EMAIL: {
    /** ปุ่ม "ส่งอีเมลอีกครั้ง" */
    BUTTON_RESEND: "verify-email-button-resend",
    /** ลิงก์ "กลับสู่หน้า Login" */
    LINK_BACK_LOGIN: "verify-email-link-back-login",
  },

  // DASHBOARD — หน้า Dashboard ต่างๆ

  DASHBOARD: {
    /** แท็บ "ภาพรวมองค์กร" */
    TAB_OVERVIEW: "dashboard-tab-overview",
    /** แท็บ "ส่วนตัว" */
    TAB_PERSONAL: "dashboard-tab-personal",
    /** แท็บ "ซ่อมบำรุง" */
    TAB_REPAIR: "dashboard-tab-repair",
    /** แท็บ "ตรวจนับ" */
    TAB_AUDIT: "dashboard-tab-audit",
    /** Section KPI Cards */
    SECTION_KPI: "dashboard-section-kpi",
    /** Dropdown เลือก DateRange */
    DROPDOWN_DATE_RANGE: "dropdown-date-range",
    /** Card มูลค่าสินทรัพย์รวม */
    CARD_TOTAL_VALUE: "dashboard-card-total-value",
    /** Card ค่าเสื่อมราคาสะสม */
    CARD_ACCUMULATED_DEPRECIATION: "dashboard-card-accumulated-depreciation",
    /** Card มูลค่าสินทรัพย์สุทธิ */
    CARD_NET_BOOK_VALUE: "dashboard-card-net-book-value",
    /** Card จำนวนสินทรัพย์ทั้งหมด */
    CARD_TOTAL_ASSETS: "dashboard-card-total-assets",
    /** Card สินทรัพย์ใหม่ */
    CARD_NEW_ASSETS: "dashboard-card-new-assets",
    /** Card ค่าเสื่อมราคาปีนี้ */
    CARD_CURRENT_YEAR_DEPRECIATION: "dashboard-card-current-year-depreciation",
  },

  DASHBOARD_PERSONAL: {
    /** ตาราง Assets ส่วนตัว */
    TABLE_ASSETS: "table-personal-asset",
    /** Dynamic row: ใช้ TEST_IDS.DASHBOARD_PERSONAL.TABLE_ROW(id) */
    TABLE_ROW: (id: number | string) => `table-personal-asset-row-${id}`,
    INPUT_SEARCH: "personal-asset-input-search",
    DROPDOWN_PAGE_SIZE: "personal-asset-dropdown-page-size",
    BUTTON_FIRST_PAGE: "personal-asset-button-first-page",
    BUTTON_PREV_PAGE: "personal-asset-button-prev-page",
    BUTTON_NEXT_PAGE: "personal-asset-button-next-page",
    BUTTON_LAST_PAGE: "personal-asset-button-last-page",
  },

  DASHBOARD_REPAIR: {
    /** ตาราง Repair งานค้าง */
    TABLE_PENDING: "table-repair-pending",
    /** Dynamic row */
    TABLE_ROW: (id: number | string) => `table-repair-pending-row-${id}`,
  },

  // ASSETS — จัดการสินทรัพย์

  ASSET: {
    /** ตาราง Assets หลัก */
    TABLE: "table-asset",
    /** Dynamic row: ใช้ TEST_IDS.ASSET.TABLE_ROW(id) */
    TABLE_ROW: (id: number | string) => `table-asset-row-${id}`,
    TABLE_HEADER_ROW: "table-asset-header-row",
    TABLE_LOADING_ROW: "table-asset-loading-row",
    /** Input ค้นหาสินทรัพย์ */
    INPUT_SEARCH: "asset-input-search",
    /** Dropdown filter หมวดหมู่ */
    DROPDOWN_FILTER_CATEGORY: "dropdown-filter-category",
    /** Dropdown filter ประเภท */
    DROPDOWN_FILTER_TYPE: "dropdown-filter-type",
    /** Dropdown filter กลุ่ม */
    DROPDOWN_FILTER_CLASS: "dropdown-filter-class",
    /** ปุ่ม "เพิ่มสินทรัพย์" */
    BUTTON_CREATE: "asset-button-create",
    BUTTON_CREATE_EMPTY_STATE: "asset-button-create-empty-state",
    /** ปุ่ม "นำเข้า" (import dropdown trigger) */
    BUTTON_IMPORT: "asset-button-import",
    /** ปุ่ม import รูปแบบ Standard */
    BUTTON_IMPORT_STANDARD: "asset-button-import-standard",
    /** ปุ่ม import รูปแบบ e-LAAS */
    BUTTON_IMPORT_ELAAS: "asset-button-import-elaas",
    /** ปุ่ม "นำออก" (export dropdown trigger) */
    BUTTON_EXPORT: "asset-button-export",
    /** ปุ่ม export ทั้งหมด Standard */
    BUTTON_EXPORT_ALL_STANDARD: "asset-button-export-all-standard",
    /** ปุ่ม export ทั้งหมด E-Laas */
    BUTTON_EXPORT_ALL_ELAAS: "asset-button-export-all-elaas",
    /** ปุ่ม export ตามกลุ่ม */
    BUTTON_EXPORT_FILTER: "asset-button-export-filter",
    BUTTON_EXPORT_FILTER_CONFIRM: "asset-button-export-filter-confirm",
    /** ปุ่ม "เทมเพลต" */
    BUTTON_TEMPLATE: "asset-button-template",
    /** ปุ่ม "ล้างตัวกรอง" */
    BUTTON_CLEAR_FILTER: "asset-button-clear-filter",
    /** ปุ่ม "ลบที่เลือก" (bulk delete) */
    BUTTON_BULK_DELETE: "asset-button-bulk-delete",
    /** Row action ปุ่ม "แก้ไข" */
    BUTTON_ROW_EDIT: (id: number | string) => `asset-button-row-edit-${id}`,
    /** Row action ปุ่ม "ลบ" */
    BUTTON_ROW_DELETE: (id: number | string) => `asset-button-row-delete-${id}`,
    BUTTON_ROW_DELETE_CONFIRM: (id: number | string) => `asset-button-row-delete-confirm-${id}`,
    BUTTON_ROW_DUPLICATE: (id: number | string) => `asset-button-row-duplicate-${id}`,
    BUTTON_ROW_ACTIONS: (id: number | string) => `asset-button-row-actions-${id}`,
    
    // Menu items
    MENUITEM_TEMPLATE: "asset-menuitem-template",
    MENUITEM_IMPORT_STANDARD: "asset-menuitem-import-standard",
    MENUITEM_IMPORT_ELAAS: "asset-menuitem-import-elaas",
    MENUITEM_EXPORT_ALL_STANDARD: "asset-menuitem-export-all-standard",
    MENUITEM_EXPORT_ALL_ELAAS: "asset-menuitem-export-all-elaas",
    MENUITEM_EXPORT_FILTER: "asset-menuitem-export-filter",

    // Bulk Delete Modal
    MODAL_BULK_DELETE: "modal-asset-bulk-delete",
    BUTTON_BULK_DELETE_CONFIRM: "asset-button-bulk-delete-confirm",
    BUTTON_BULK_DELETE_CANCEL: "asset-button-bulk-delete-cancel",
    BUTTON_VIEW_OPTIONS: "asset-button-view-options",
    BUTTON_FACETED_FILTER: (key: string) => `asset-button-faceted-filter-${key}`,
  },

  ASSET_FORM: {
    /** Dialog สร้าง/แก้ไข Asset */
    MODAL: "modal-asset-form",
    /** Tabs */
    TAB_GENERAL: "asset-tab-general",
    TAB_GALLERY: "asset-tab-gallery",
    TAB_DEPRECIATION: "asset-tab-depreciation",
    /** Links */
    LINK_MANAGE_LOCATION: "asset-link-manage-location",
    LINK_MANAGE_STRUCTURE: "asset-link-manage-structure",
    /** Input ชื่อสินทรัพย์ */
    INPUT_NAME: "input-asset-name",
    /** Input รหัสสินทรัพย์ */
    INPUT_CODE: "input-asset-code",
    /** Additional inputs */
    INPUT_BRAND: "input-asset-brand",
    INPUT_MODEL: "input-asset-model",
    INPUT_SERIAL_NUMBER: "input-asset-serial-number",
    INPUT_INVOICE_NUMBER: "input-asset-invoice-number",
    INPUT_PO_NUMBER: "input-asset-po-number",
    INPUT_PURCHASE_DATE: "input-asset-purchase-date",
    INPUT_WARRANTY_START_DATE: "input-asset-warranty-start-date",
    INPUT_WARRANTY_END_DATE: "input-asset-warranty-end-date",
    INPUT_USEFUL_LIFE: "input-asset-useful-life",
    INPUT_SALVAGE_VALUE: "input-asset-salvage-value",
    /** Selects */
    SELECT_CATEGORY: "asset-select-category",
    /** Select ประเภท */
    SELECT_TYPE: "asset-select-type",
    /** Select กลุ่ม */
    SELECT_CLASS: "asset-select-class",
    /** Select สถานะ */
    SELECT_STATUS: "asset-select-status",
    /** Select ผู้รับผิดชอบ */
    SELECT_OWNER: "asset-select-owner",
    /** Select อาคาร/สถานที่ */
    SELECT_BUILDING: "asset-select-building",
    /** Select ห้อง */
    SELECT_ROOM: "asset-select-room",
    /** Additional selects */
    SELECT_SOURCE_FUND: "asset-select-source-fund",
    SELECT_DEPRECIATION_METHOD: "asset-select-depreciation-method",
    SELECT_RESPONSIBLE_DEPT: "asset-select-responsible-dept",
    /** Input มูลค่า */
    INPUT_VALUE: "input-asset-value",
    /** Textarea หมายเหตุ */
    TEXTAREA_NOTE: "asset-textarea-note",
    /** Gallery/image */
    INPUT_IMAGE_UPLOAD: "asset-input-image-upload",
    BUTTON_IMAGE_UPLOAD: "asset-button-image-upload",
    BUTTON_IMAGE_CAPTURE: "asset-button-image-capture",
    IMAGE_THUMBNAIL: (index: number) => `asset-image-thumbnail-${index}`,
    BUTTON_IMAGE_PREVIEW: (index: number) => `asset-button-image-preview-${index}`,
    BUTTON_IMAGE_REMOVE: (index: number) => `asset-button-image-remove-${index}`,
    /** Lightbox */
    LIGHTBOX: "asset-lightbox",
    LIGHTBOX_IMAGE: "asset-lightbox-image",
    LIGHTBOX_BUTTON_CLOSE: "asset-lightbox-button-close",
    LIGHTBOX_BUTTON_PREV: "asset-lightbox-button-prev",
    LIGHTBOX_BUTTON_NEXT: "asset-lightbox-button-next",
    /** ปุ่ม "บันทึก" */
    BUTTON_SUBMIT: "asset-button-submit",
    /** ปุ่ม "ยกเลิก" */
    BUTTON_CANCEL: "asset-button-cancel",
  },

  ASSET_IMPORT: {
    /** Modal import */
    MODAL: "modal-asset-import",
    /** Input upload file */
    INPUT_FILE: "asset-import-input-file",
    BUTTON_ROW_ACTIONS: (rowIndex: number) => `asset-import-button-row-actions-${rowIndex}`,
    MENUITEM_INSERT_ROW_ABOVE: (rowIndex: number) => `asset-import-menuitem-insert-row-above-${rowIndex}`,
    MENUITEM_INSERT_ROW_BELOW: (rowIndex: number) => `asset-import-menuitem-insert-row-below-${rowIndex}`,
    MENUITEM_DELETE_ROW: (rowIndex: number) => `asset-import-menuitem-delete-row-${rowIndex}`,
    INPUT_CELL: (rowIndex: number, columnKey: string) => `asset-import-input-cell-${rowIndex}-${columnKey}`,
    BUTTON_ADD_ROW: "asset-import-button-add-row",
    BUTTON_FIRST_PAGE: "asset-import-button-first-page",
    BUTTON_PREV_PAGE: "asset-import-button-prev-page",
    BUTTON_NEXT_PAGE: "asset-import-button-next-page",
    BUTTON_LAST_PAGE: "asset-import-button-last-page",
    /** ปุ่ม "ยืนยันนำเข้า" */
    BUTTON_CONFIRM: "asset-import-button-confirm",
    /** ปุ่ม "ยกเลิก" */
    BUTTON_CANCEL: "asset-import-button-cancel",
  },

  ASSET_DOCS: {
    BUTTON_ADD_DOC: "asset-docs-button-add",
    INPUT_DOC_NAME: "asset-docs-input-name",
    INPUT_DOC_FILE: "asset-docs-input-file",
    BUTTON_DOC_SAVE: "asset-docs-button-save",
    BUTTON_DOC_CANCEL: "asset-docs-button-cancel",
    TABLE: "asset-docs-table",
    TABLE_ROW: (id: number | string) => `asset-docs-table-row-${id}`,
    BUTTON_ROW_DOWNLOAD: (id: number | string) => `asset-docs-button-row-download-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `asset-docs-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `asset-docs-button-row-delete-${id}`,
  },

  ASSET_GALLERY: {
    MODAL_GALLERY: "modal-asset-gallery",
    BUTTON_PREV_IMAGE: "asset-gallery-button-prev",
    BUTTON_NEXT_IMAGE: "asset-gallery-button-next",
    BUTTON_CLOSE: "asset-gallery-button-close",
  },

  ASSET_LOCATION: {
    TABLE: "table-asset-location",
    TABLE_ROW: (id: number | string) => `table-asset-location-row-${id}`,
    DROPDOWN_PAGE_SIZE: "asset-location-dropdown-page-size",
    BUTTON_FIRST_PAGE: "asset-location-button-first-page",
    BUTTON_PREV_PAGE: "asset-location-button-prev-page",
    BUTTON_NEXT_PAGE: "asset-location-button-next-page",
    BUTTON_LAST_PAGE: "asset-location-button-last-page",
    BUTTON_ROW_VIEW: (id: number | string) => `asset-location-button-row-view-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `asset-location-button-row-edit-${id}`,
  },

  ASSET_STRUCTURE: {
    INPUT_IMPORT_FILE: "asset-structure-input-import-file",
    BUTTON_TEMPLATE: "asset-structure-button-template",
    BUTTON_IMPORT: "asset-structure-button-import",
    BUTTON_EXPORT: "asset-structure-button-export",
    BUTTON_CREATE: "asset-structure-button-create",
    MENUITEM_TEMPLATE: "asset-structure-menuitem-template",
    MENUITEM_IMPORT: "asset-structure-menuitem-import",
    MENUITEM_EXPORT: "asset-structure-menuitem-export",
  },

  ASSET_TYPE: {
    TABLE: "table-asset-type",
    TABLE_ROW: (id: number | string) => `table-asset-type-row-${id}`,
    TABLE_HEADER_ROW: "table-asset-type-header-row",
    TABLE_EMPTY_ROW: "table-asset-type-empty-row",
    INPUT_SEARCH: "asset-type-input-search",
    BUTTON_CREATE: "asset-type-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `asset-type-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `asset-type-button-row-delete-${id}`,
    BUTTON_CLEAR_FILTER: "asset-type-button-clear-filter",
    BUTTON_BULK_DELETE: "asset-type-button-bulk-delete",
    MODAL_BULK_DELETE: "modal-asset-type-bulk-delete",
    BUTTON_BULK_DELETE_CONFIRM: "asset-type-button-bulk-delete-confirm",
    BUTTON_BULK_DELETE_CANCEL: "asset-type-button-bulk-delete-cancel",
  },

  ASSET_TYPE_FORM: {
    MODAL: "modal-asset-type-form",
    INPUT_NAME: "input-asset-type-name",
    SELECT_CATEGORY: "asset-type-select-category",
    BUTTON_SUBMIT: "asset-type-button-submit",
    BUTTON_CANCEL: "asset-type-button-cancel",
  },

  ASSET_TYPE_DELETE: {
    MODAL: "modal-asset-type-delete-confirm",
    BUTTON_CONFIRM: "asset-type-button-delete-confirm",
    BUTTON_CANCEL: "asset-type-button-delete-cancel",
  },

  // ASSET_CATEGORY — จัดการหมวดหมู่สินทรัพย์

  ASSET_CATEGORY: {
    TABLE: "table-asset-category",
    TABLE_ROW: (id: number | string) => `table-asset-category-row-${id}`,
    TABLE_HEADER_ROW: "table-asset-category-header-row",
    TABLE_EMPTY_ROW: "table-asset-category-empty-row",
    INPUT_SEARCH: "asset-category-input-search",
    BUTTON_CREATE: "asset-category-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `asset-category-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `asset-category-button-row-delete-${id}`,
  },

  ASSET_CATEGORY_FORM: {
    MODAL: "modal-asset-category-form",
    INPUT_NAME: "input-asset-category-name",
    BUTTON_SUBMIT: "asset-category-form-button-submit",
    BUTTON_CANCEL: "asset-category-form-button-cancel",
  },

  ASSET_CATEGORY_DELETE: {
    MODAL: "modal-asset-category-delete-confirm",
    BUTTON_CONFIRM: "asset-category-button-delete-confirm",
    BUTTON_CANCEL: "asset-category-button-delete-cancel",
  },

  // ASSET_CLASS — จัดการกลุ่มสินทรัพย์

  ASSET_CLASS: {
    TABLE: "table-asset-class",
    TABLE_ROW: (id: number | string) => `table-asset-class-row-${id}`,
    TABLE_HEADER_ROW: "table-asset-class-header-row",
    TABLE_EMPTY_ROW: "table-asset-class-empty-row",
    INPUT_SEARCH: "asset-class-input-search",
    BUTTON_CREATE: "asset-class-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `asset-class-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `asset-class-button-row-delete-${id}`,
  },

  ASSET_CLASS_FORM: {
    MODAL: "modal-asset-class-form",
    INPUT_NAME: "input-asset-class-name",
    SELECT_TYPE: "asset-class-select-type",
    BUTTON_SUBMIT: "asset-class-form-button-submit",
    BUTTON_CANCEL: "asset-class-form-button-cancel",
  },

  ASSET_CLASS_DELETE: {
    MODAL: "modal-asset-class-delete-confirm",
    BUTTON_CONFIRM: "asset-class-button-delete-confirm",
    BUTTON_CANCEL: "asset-class-button-delete-cancel",
  },


  ASSET_CLASS_DOCS: {
    MODAL: "modal-asset-class-docs",
    BUTTON_ADD_DOC: "asset-class-docs-button-add",
    INPUT_DOC_NAME: "asset-class-docs-input-name",
    INPUT_DOC_URL: "asset-class-docs-input-url",
    BUTTON_SAVE_DOC: "asset-class-docs-button-save",
    BUTTON_CANCEL_DOC: "asset-class-docs-button-cancel",
    TABLE: "asset-class-docs-table",
    TABLE_ROW: (id: number | string) => `asset-class-docs-table-row-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `asset-class-docs-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `asset-class-docs-button-row-delete-${id}`,
  },

  // FACILITY — จัดการอาคารและห้อง

  FACILITY: {
    BUTTON_CREATE_BUILDING: "facility-button-create-building",
    BUTTON_CREATE_ROOM: "facility-button-create-room",
    BUTTON_IMPORT: "facility-button-import",
    BUTTON_EXPORT: "facility-button-export",
    BUTTON_TEMPLATE: "facility-button-template",
    INPUT_IMPORT_FILE: "facility-input-import-file",
    INPUT_SEARCH: "facility-input-search",
    BUILDING_CARD: (id: number | string) => `facility-building-card-${id}`,
    BUTTON_BUILDING_EDIT: (id: number | string) => `facility-building-button-edit-${id}`,
    BUTTON_BUILDING_DELETE: (id: number | string) => `facility-building-button-delete-${id}`,
    BUTTON_BUILDING_EXPAND: (id: number | string) => `facility-building-button-expand-${id}`,
    ROOM_ROW: (id: number | string) => `facility-room-row-${id}`,
    BUTTON_ROOM_EDIT: (id: number | string) => `facility-room-button-edit-${id}`,
    BUTTON_ROOM_DELETE: (id: number | string) => `facility-room-button-delete-${id}`,
    BUTTON_ROOM_SELECT: (id: number | string) => `facility-room-button-select-${id}`,
  },

  FACILITY_IMPORT: {
    MODAL: "modal-facility-import",
    BUTTON_UPLOAD: "facility-import-button-upload",
    INPUT_FILE: "facility-import-input-file",
    BUTTON_ADD_ROW: "facility-import-button-add-row",
    BUTTON_FIRST_PAGE: "facility-import-button-first-page",
    BUTTON_PREV_PAGE: "facility-import-button-prev-page",
    BUTTON_NEXT_PAGE: "facility-import-button-next-page",
    BUTTON_LAST_PAGE: "facility-import-button-last-page",
    BUTTON_CONFIRM: "facility-import-button-confirm",
    BUTTON_CANCEL: "facility-import-button-cancel",
  },

  // AUDIT — ตรวจนับสินทรัพย์

  AUDIT: {
    TABLE: "table-audit",
    TABLE_ROW: (id: number | string) => `table-audit-row-${id}`,
    INPUT_SEARCH: "audit-input-search",
    DROPDOWN_FILTER_STATUS: "dropdown-audit-filter-status",
    BUTTON_CREATE_JOB: "audit-button-create-job",
    BUTTON_ROW_VIEW: (id: number | string) => `audit-button-row-view-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `audit-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `audit-button-row-delete-${id}`,
    BUTTON_ROW_EXPORT: (id: number | string) => `audit-button-row-export-${id}`,
    BUTTON_FIRST_PAGE: "audit-button-first-page",
    BUTTON_PREV_PAGE: "audit-button-prev-page",
    BUTTON_NEXT_PAGE: "audit-button-next-page",
    BUTTON_LAST_PAGE: "audit-button-last-page",
  },

  AUDIT_JOB_FORM: {
    MODAL: "modal-audit-job-form",
    INPUT_NAME: "input-audit-job-name",
    TEXTAREA_DESCRIPTION: "audit-job-textarea-description",
    INPUT_DATE_START: "input-audit-date-start",
    INPUT_DATE_END: "input-audit-date-end",
    /** Selection mode */
    TAB_FACILITY: "audit-job-tab-facility",
    TAB_ORG_STRUCTURE: "audit-job-tab-org-structure",
    /** Facility selector */
    SELECT_BUILDING: "audit-job-select-building",
    SELECT_ROOM: "audit-job-select-room",
    BUTTON_ADD_FACILITY: "audit-job-button-add-facility",
    BUTTON_REMOVE_FACILITY: (index: number) => `audit-job-button-remove-facility-${index}`,
    /** Asset table */
    TABLE_ASSETS: "audit-job-table-assets",
    CHECKBOX_SELECT_ALL_ASSETS: "audit-job-checkbox-select-all-assets",
    CHECKBOX_ASSET: (id: number | string) => `audit-job-checkbox-asset-${id}`,
    TABLE_ASSET_ROW: (id: number | string) => `audit-job-table-asset-row-${id}`,
    /** Footer */
    BUTTON_BACK: "audit-job-button-back",
    BUTTON_NEXT: "audit-job-button-next",
    BUTTON_SUBMIT: "audit-job-button-submit",
    BUTTON_CANCEL: "audit-job-button-cancel",
    
    // Edit specific
    MODAL_EDIT: "modal-audit-job-edit",
  },

  AUDIT_DETAIL: {
    TABLE_FOUND: "table-audit-detail-found",
    TABLE_MISSING: "table-audit-detail-missing",
    TABLE_EXTRA: "table-audit-detail-extra",
    TABLE_ROW: (id: number | string) => `table-audit-detail-row-${id}`,
    TAB_FOUND: "audit-detail-tab-found",
    TAB_MISSING: "audit-detail-tab-missing",
    TAB_EXTRA: "audit-detail-tab-extra",
  },

  AUDIT_ONGOING: {
    TABLE_ASSET: "table-audit-ongoing-asset",
    TABLE_ROW: (id: number | string) => `table-audit-ongoing-asset-row-${id}`,
    BUTTON_MARK_FOUND: (id: number | string) => `audit-button-mark-found-${id}`,
    BUTTON_MARK_NOT_FOUND: (id: number | string) => `audit-button-mark-not-found-${id}`,
    BUTTON_COMPLETE_JOB: "audit-button-complete-job",
    BUTTON_PAUSE_JOB: "audit-button-pause-job",
    BUTTON_ROW_ACTIONS: (id: number | string) => `audit-ongoing-button-row-actions-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `audit-ongoing-button-row-delete-${id}`,
    BUTTON_COMPLETE_EMPTY_STATE: "audit-ongoing-button-complete-empty-state",
  },

  // WARRANTY — ข้อมูลการรับประกัน

  WARRANTY_DETAIL: {
    INPUT_SEARCH: "warranty-input-search",
    TABLE_ACTIVE: "table-warranty-active",
    TABLE_EXPIRED: "table-warranty-expired",
    TABLE_EXPIRING_SOON: "table-warranty-expiring-soon",
    TABLE_ROW: (id: number | string) => `table-warranty-row-${id}`,
    TAB_ACTIVE: "warranty-tab-active",
    TAB_EXPIRED: "warranty-tab-expired",
    TAB_EXPIRING_SOON: "warranty-tab-expiring-soon",
    TAB_NO_WARRANTY: "warranty-tab-no-warranty",
  },

  // DOCUMENT — เอกสาร

  DOCUMENT_BROWSE: {
    INPUT_SEARCH: "document-browse-input-search",
    BUTTON_FOLDER_ITEM: (id: number | string) => `document-browse-button-folder-${id}`,
    BUTTON_PREV_PAGE: "document-browse-button-prev-page",
    BUTTON_NEXT_PAGE: "document-browse-button-next-page",
  },

  WITHDRAWAL_DELETE: {
    MODAL: "modal-withdrawal-delete-confirm",
    BUTTON_CONFIRM: "withdrawal-button-delete-confirm",
    BUTTON_CANCEL: "withdrawal-button-delete-cancel",
  },

  WITHDRAWAL_APPROVAL: {
    TABLE: "table-withdrawal-approval",
    TABLE_ROW: (id: number | string) => `table-withdrawal-approval-row-${id}`,
    BUTTON_APPROVE: (id: number | string) => `withdrawal-button-approve-${id}`,
    BUTTON_REJECT: (id: number | string) => `withdrawal-button-reject-${id}`,
    MODAL_APPROVE: "modal-withdrawal-approve-confirm",
    MODAL_REJECT: "modal-withdrawal-reject-confirm",
    MODAL_TAKE: "modal-withdrawal-take-confirm",
    BUTTON_CONFIRM_APPROVE: "withdrawal-approval-button-confirm-approve",
    BUTTON_CONFIRM_REJECT: "withdrawal-approval-button-confirm-reject",
    BUTTON_CONFIRM_TAKE: "withdrawal-approval-button-confirm-take",
    BUTTON_CANCEL_DIALOG: "withdrawal-approval-button-cancel-dialog",
  },

  DOCUMENT_DETAIL: {
    BUTTON_BACK: "document-detail-button-back",
    BUTTON_ADD_DOC: "document-detail-button-add-doc",
    INPUT_DOC_NAME: "document-detail-input-name",
    INPUT_DOC_FILE: "document-detail-input-file",
    BUTTON_SAVE_DOC: "document-detail-button-save",
    BUTTON_CANCEL_DOC: "document-detail-button-cancel",
    TABLE: "document-detail-table",
    TABLE_ROW: (id: number | string) => `document-detail-table-row-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `document-detail-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `document-detail-button-row-delete-${id}`,
    BUTTON_ROW_DOWNLOAD: (id: number | string) => `document-detail-button-row-download-${id}`,
  },

  // USERS — จัดการผู้ใช้งาน

  USERS: {
    TABLE: "table-user",
    TABLE_ROW: (id: number | string) => `table-user-row-${id}`,
    INPUT_SEARCH: "user-input-search",
    DROPDOWN_FILTER_ROLE: "dropdown-user-filter-role",
    BUTTON_CREATE: "user-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `user-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `user-button-row-delete-${id}`,
    BUTTON_ROW_VIEW: (id: number | string) => `user-button-row-view-${id}`,
    BUTTON_ROW_ROLE: (id: number | string) => `user-button-row-role-${id}`,
    BUTTON_ROW_INACTIVATE: (id: number | string) => `user-button-row-inactivate-${id}`,
    BUTTON_ROW_ACTIONS: (id: number | string) => `user-button-row-actions-${id}`,
    BUTTON_ROW_UPDATE_ROLE: (id: number | string) => `user-button-row-update-role-${id}`,
    
    // Toolbar
    INPUT_UPLOAD_FILE: "user-input-upload-file",
    BUTTON_DOWNLOAD_TEMPLATE: "user-button-download-template",
    BUTTON_IMPORT: "user-button-import",
    BUTTON_EXPORT: "user-button-export",
    BUTTON_REFRESH: "user-button-refresh",
    BUTTON_FILTER: "user-button-filter",
    BUTTON_CLEAR_FILTER: "user-button-clear-filter",

    // Filters
    SELECT_ROLE_FILTER: "user-select-role-filter",
    SELECT_STATUS_FILTER: "user-select-status-filter",
    SELECT_ORG_FILTER: "user-select-org-filter",
  },

  USER_FORM: {
    MODAL: "modal-user-form",
    INPUT_USERNAME: "input-user-username",
    INPUT_EMAIL: "input-user-email",
    INPUT_PASSWORD: "input-user-password",
    INPUT_CONFIRM_PASSWORD: "input-user-confirm-password",
    SELECT_ROLE: "user-select-role",
    SELECT_DEPARTMENT: "user-select-department",
    SELECT_POSITION: "user-select-position",
    INPUT_IMPORT_FILE: "user-input-import-file",
    BUTTON_INVITE: "user-button-invite",
    BUTTON_ADD: "user-button-add",
    BUTTON_SUBMIT: "user-button-submit",
    BUTTON_CANCEL: "user-button-cancel",
    BUTTON_DELETE_CONFIRM: "user-button-delete-confirm",
  },

  USER_IMPORT: {
    MODAL: "modal-user-import",
    BUTTON_UPLOAD: "user-import-button-upload",
    INPUT_FILE: "user-import-input-file",
    BUTTON_ADD_ROW: "user-import-button-add-row",
    BUTTON_FIRST_PAGE: "user-import-button-first-page",
    BUTTON_PREV_PAGE: "user-import-button-prev-page",
    BUTTON_NEXT_PAGE: "user-import-button-next-page",
    BUTTON_LAST_PAGE: "user-import-button-last-page",
    BUTTON_CONFIRM: "user-import-button-confirm",
    BUTTON_CANCEL: "user-import-button-cancel",
    
    // Menu items
    MENUITEM_DOWNLOAD_TEMPLATE: "user-import-menuitem-download-template",
    MENUITEM_IMPORT_USERS: "user-import-menuitem-import",
    MENUITEM_EXPORT_USERS: "user-import-menuitem-export",
  },

  USER_ROLE_UPDATE: {
    SHEET: "user-role-update-sheet",
    SELECT_ROLE: "user-role-update-select-role",
    SELECT_INSTITUTE: "user-role-update-select-institute",
    SELECT_DEPARTMENT: "user-role-update-select-department",
    SELECT_SECTION: "user-role-update-select-section",
    SELECT_POSITION: "user-role-update-select-position",
    LINK_ORG_STRUCTURE: "user-role-update-link-org-structure",
    BUTTON_OPEN_ORG_STRUCTURE: "user-role-update-button-open-org-structure",
    BUTTON_SUBMIT: "user-role-update-button-submit",
    BUTTON_CANCEL: "user-role-update-button-cancel",
  },

  // ORGANIZATION — โครงสร้างองค์กร

  ORGANIZATION: {
    TAB_INSTITUTE: "org-tab-institute",
    TAB_DEPARTMENT: "org-tab-department",
    TAB_SECTION: "org-tab-section",
    TAB_POSITION: "org-tab-position",
    INPUT_SEARCH: "org-input-search",
    BUTTON_CREATE: "org-button-create",
    BUTTON_EXPAND_ALL: "org-button-expand-all",
    BUTTON_COLLAPSE_ALL: "org-button-collapse-all",
    BUTTON_TEMPLATE: "org-button-template",
    BUTTON_IMPORT: "org-button-import",
    BUTTON_EXPORT: "org-button-export",
    MENUITEM_TEMPLATE: "org-menuitem-template",
    MENUITEM_IMPORT: "org-menuitem-import",
    MENUITEM_EXPORT: "org-menuitem-export",
  },

  ORG_BUILDING: {
    MODAL_CREATE: "org-building-modal-create",
    MODAL_EDIT: "org-building-modal-edit",
    INPUT_NAME: "org-building-input-name",
    BUTTON_SUBMIT: "org-building-button-submit",
  },

  ORG_ROOM: {
    MODAL_CREATE: "org-room-modal-create",
    MODAL_EDIT: "org-room-modal-edit",
    INPUT_NAME: "org-room-input-name",
    INPUT_NUMBER: "org-room-input-number",
    INPUT_FLOOR: "org-room-input-floor",
    INPUT_DEPT: "org-room-input-dept",
    TEXTAREA_DETAILS: "org-room-textarea-details",
    BUTTON_DELETE: "org-room-button-delete",
    BUTTON_SUBMIT: "org-room-button-submit",
  },

  ORG_INSTITUTE: {
    TABLE: "table-org-institute",
    TABLE_ROW: (id: number | string) => `table-org-institute-row-${id}`,
    TABLE_HEADER_ROW: "table-org-institute-header-row",
    TABLE_EMPTY_ROW: "table-org-institute-empty-row",
    INPUT_SEARCH: "org-institute-input-search",
    BUTTON_CREATE: "org-institute-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `org-institute-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `org-institute-button-row-delete-${id}`,
  },

  ORG_INSTITUTE_FORM: {
    MODAL: "modal-org-institute-form",
    INPUT_NAME: "input-org-institute-name",
    INPUT_CODE: "input-org-institute-code",
    BUTTON_SUBMIT: "org-institute-button-submit",
    BUTTON_CANCEL: "org-institute-button-cancel",
  },

  ORG_DEPARTMENT: {
    TABLE: "table-org-department",
    TABLE_ROW: (id: number | string) => `table-org-department-row-${id}`,
    INPUT_SEARCH: "org-department-input-search",
    BUTTON_CREATE: "org-department-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `org-department-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `org-department-button-row-delete-${id}`,
  },

  ORG_DEPARTMENT_FORM: {
    MODAL: "modal-org-department-form",
    INPUT_NAME: "input-org-department-name",
    SELECT_INSTITUTE: "org-department-select-institute",
    BUTTON_SUBMIT: "org-department-button-submit",
    BUTTON_CANCEL: "org-department-button-cancel",
  },

  ORG_SECTION: {
    TABLE: "table-org-section",
    TABLE_ROW: (id: number | string) => `table-org-section-row-${id}`,
    TABLE_HEADER_ROW: "table-org-section-header-row",
    TABLE_EMPTY_ROW: "table-org-section-empty-row",
    INPUT_SEARCH: "org-section-input-search",
    BUTTON_CREATE: "org-section-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `org-section-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `org-section-button-row-delete-${id}`,
  },

  ORG_SECTION_FORM: {
    MODAL: "modal-org-section-form",
    INPUT_NAME: "input-org-section-name",
    SELECT_DEPARTMENT: "org-section-select-department",
    BUTTON_SUBMIT: "org-section-button-submit",
    BUTTON_CANCEL: "org-section-button-cancel",
  },

  ORG_POSITION: {
    TABLE: "table-org-position",
    TABLE_ROW: (id: number | string) => `table-org-position-row-${id}`,
    TABLE_HEADER_ROW: "table-org-position-header-row",
    TABLE_EMPTY_ROW: "table-org-position-empty-row",
    INPUT_SEARCH: "org-position-input-search",
    BUTTON_CREATE: "org-position-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `org-position-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `org-position-button-row-delete-${id}`,
  },

  ORG_POSITION_FORM: {
    MODAL: "modal-org-position-form",
    INPUT_NAME: "input-org-position-name",
    BUTTON_SUBMIT: "org-position-button-submit",
    BUTTON_CANCEL: "org-position-button-cancel",
  },

  // SALES — การขายสินทรัพย์

  SALES: {
    TABLE: "table-sales",
    TABLE_ROW: (id: number | string) => `table-sales-row-${id}`,
    INPUT_SEARCH: "sales-input-search",
    BUTTON_CREATE: "sales-button-create",
    BUTTON_ROW_VIEW: (id: number | string) => `sales-button-row-view-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `sales-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `sales-button-row-delete-${id}`,
    INPUT_IMPORT_FILE: "sales-input-import-file",
    BUTTON_TEMPLATE: "sales-button-template",
    BUTTON_IMPORT: "sales-button-import",
    BUTTON_EXPORT: "sales-button-export",
    MENUITEM_TEMPLATE: "sales-menuitem-template",
    MENUITEM_IMPORT: "sales-menuitem-import",
    MENUITEM_EXPORT: "sales-menuitem-export",
  },

  SALES_FORM: {
    MODAL: "modal-sales-form",
    SELECT_ASSET: "sales-select-asset",
    /** Input หมายเลข Lot */
    INPUT_LOT: "input-sales-lot",
    INPUT_PRICE: "input-sales-price",
    INPUT_DATE: "input-sales-date",
    INPUT_BUYER: "input-sales-buyer",
    /** Textarea เหตุผล / รายละเอียด */
    TEXTAREA_REASON: "sales-textarea-reason",
    TEXTAREA_NOTE: "sales-textarea-note",
    BUTTON_SUBMIT: "sales-button-submit",
    BUTTON_CANCEL: "sales-button-cancel",
  },

  SALES_DELETE: {
    MODAL: "modal-sales-delete-confirm",
    BUTTON_CONFIRM: "sales-button-delete-confirm",
    BUTTON_CANCEL: "sales-button-delete-cancel",
  },

  // PROFILE — หน้าโปรไฟล์

  PROFILE: {
    /** Modal ข้อมูลส่วนตัว */
    MODAL: "profile-dialog",
    SECTION_INFO: "profile-section-info",
    TAB_PERSONAL: "profile-tab-personal",
    TAB_ACCOUNT: "profile-tab-account",
    TAB_SECURITY: "profile-tab-security",
    SELECT_ORGANIZATION: "profile-select-organization",
    INPUT_DISPLAY_NAME: "input-profile-display-name",
    INPUT_EMAIL: "input-profile-email",
    INPUT_PHONE: "input-profile-phone",
    INPUT_POSITION: "input-profile-position",
    INPUT_DEPARTMENT: "input-profile-department",
    BUTTON_EDIT: "profile-button-edit",
    BUTTON_SAVE: "profile-button-save",
    BUTTON_CANCEL: "profile-button-cancel",
    BUTTON_EDIT_MOBILE: "profile-button-edit-mobile",
    BUTTON_SAVE_MOBILE: "profile-button-save-mobile",
    BUTTON_CANCEL_MOBILE: "profile-button-cancel-mobile",
    BUTTON_CHANGE_PASSWORD: "profile-button-change-password",
    MODAL_CHANGE_PASSWORD: "modal-profile-change-password",
    INPUT_CURRENT_PASSWORD: "input-profile-current-password",
    INPUT_NEW_PASSWORD: "input-profile-new-password",
    INPUT_CONFIRM_PASSWORD: "input-profile-confirm-password",
    BUTTON_SUBMIT_PASSWORD: "profile-button-submit-password",
    BUTTON_CANCEL_PASSWORD: "profile-button-cancel-password",
  },

  // SETTINGS — การตั้งค่า

  SETTINGS: {
    SECTION_GENERAL: "settings-section-general",
    TOGGLE_DARK_MODE: "toggle-dark-mode",
    TOGGLE_NOTIFICATION: "toggle-notification",
    DROPDOWN_LANGUAGE: "dropdown-settings-language",
    BUTTON_SAVE: "settings-button-save",
  },

  // SUPER ADMIN — จัดการระบบ

  SUPER_ADMIN_ORG: {
    TABLE: "table-superadmin-org",
    TABLE_ROW: (id: number | string) => `table-superadmin-org-row-${id}`,
    INPUT_SEARCH: "superadmin-org-input-search",
    BUTTON_CREATE: "superadmin-org-button-create",
    BUTTON_ROW_ACTIONS: (id: number | string) => `superadmin-org-button-row-actions-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `superadmin-org-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `superadmin-org-button-row-delete-${id}`,
    BUTTON_ROW_ACCESS: (id: number | string) => `superadmin-org-button-row-access-${id}`,
    BUTTON_ROW_SET_ADMIN: (id: number | string) => `superadmin-org-button-row-set-admin-${id}`,
  },

  SUPER_ADMIN_ORG_FORM: {
    MODAL: "modal-superadmin-org-form",
    SELECT_PROVINCE: "superadmin-org-select-province",
    SELECT_DISTRICT: "superadmin-org-select-district",
    SELECT_SUB_DISTRICT: "superadmin-org-select-sub-district",
    INPUT_POSTAL_CODE: "superadmin-org-input-postal-code",
    INPUT_PHONE: "superadmin-org-input-phone",
    INPUT_EMAIL: "superadmin-org-input-email",
    INPUT_TAX_ID: "superadmin-org-input-tax-id",
    INPUT_WEBSITE: "superadmin-org-input-website",
    INPUT_NAME: "superadmin-org-input-name",
    INPUT_BRANCH: "superadmin-org-input-branch",
    TEXTAREA_DETAIL: "superadmin-org-textarea-detail",
    SWITCH_ACTIVE: "superadmin-org-switch-active",
    SWITCH_STORAGE_LIMIT: "superadmin-org-switch-storage-limit",
    SWITCH_RECORD_LIMIT: "superadmin-org-switch-record-limit",
    BUTTON_SUBMIT: "superadmin-org-button-submit",
    BUTTON_CANCEL: "superadmin-org-button-cancel",
  },

  SUPER_ADMIN_SET_ADMIN: {
    MODAL_SET_ADMIN: "modal-superadmin-set-admin",
    TAB_EXISTING: "superadmin-set-admin-tab-existing",
    TAB_NEW: "superadmin-set-admin-tab-new",
    INPUT_SEARCH_USER: "superadmin-set-admin-input-search-user",
    BUTTON_SELECT_USER: (id: number | string) => `superadmin-set-admin-button-select-user-${id}`,
    BUTTON_CLEAR_USER: "superadmin-set-admin-button-clear-user",
    INPUT_USERNAME: "superadmin-set-admin-input-username",
    INPUT_EMAIL: "superadmin-set-admin-input-email",
    INPUT_PASSWORD: "superadmin-set-admin-input-password",
    INPUT_CONFIRM_PASSWORD: "superadmin-set-admin-input-confirm-password",
    BUTTON_SUBMIT: "superadmin-set-admin-button-submit",
    BUTTON_CANCEL: "superadmin-set-admin-button-cancel",
  },

  SUPER_ADMIN_ORG_ACCESS: {
    BUTTON_CREATE_ACCESS: "superadmin-org-access-button-create",
    BUTTON_REFRESH: "superadmin-org-access-button-refresh",
    INPUT_SEARCH: "superadmin-org-access-input-search",
    SELECT_ORGANIZATION: "superadmin-org-access-select-organization",
    SELECT_MENU: "superadmin-org-access-select-menu",
    TABLE: "table-superadmin-org-access",
    TABLE_ROW: (id: number | string) => `table-superadmin-org-access-row-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `superadmin-org-access-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `superadmin-org-access-button-row-delete-${id}`,
    MODAL_FORM: "modal-superadmin-org-access-form",
    MODAL_DELETE: "modal-superadmin-org-access-delete",
    BUTTON_SUBMIT: "superadmin-org-access-button-submit",
    BUTTON_CANCEL: "superadmin-org-access-button-cancel",
    BUTTON_DELETE_CONFIRM: "superadmin-org-access-button-delete-confirm",
  },

  SUPER_ADMIN_MENUS: {
    MODAL_ASSIGN_MENU: "modal-superadmin-assign-menu",
    TAB_ASSIGNMENT: "superadmin-menu-tab-assignment",
    TAB_GLOBAL: "superadmin-menu-tab-global",
    SELECT_ORGANIZATION: "superadmin-menu-select-organization",
    BUTTON_ASSIGN_MENU: "superadmin-menu-button-assign",
    TABLE_ASSIGNMENT: "table-superadmin-menu-assignment",
    TABLE_GLOBAL: "table-superadmin-menu-global",
    TABLE_ROW: (id: number | string) => `table-superadmin-menu-row-${id}`,
    BUTTON_ROW_EDIT: (id: number | string) => `superadmin-menu-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `superadmin-menu-button-row-delete-${id}`,
    TOGGLE_MENU_VISIBLE: (id: number | string) => `toggle-superadmin-menu-visible-${id}`,
    SELECT_MENU: "superadmin-menu-select-menu",
    BUTTON: "superadmin-menu-button",
    BUTTON_SUBMIT: "superadmin-menu-button-submit",
    BUTTON_CANCEL: "superadmin-menu-button-cancel",
  },

  SUPER_ADMIN_MENU_FORM: {
    MODAL: "modal-superadmin-menu-form",
    INPUT_NAME: "superadmin-menu-form-input-name",
    BUTTON_SUBMIT: "superadmin-menu-form-button-submit",
    BUTTON_CANCEL: "superadmin-menu-form-button-cancel",
  },

  // WITHDRAWAL — เบิก/ยืม

  WITHDRAWAL: {
    TAB_INTERNAL: "withdrawal-tab-internal",
    TAB_EXTERNAL: "withdrawal-tab-external",
    TAB_HISTORY: "withdrawal-tab-history",
    TABLE: "table-withdrawal",
    TABLE_ROW: (id: number | string) => `table-withdrawal-row-${id}`,
  },

  // ONBOARDING — ขั้นตอนลงทะเบียนองค์กรใหม่

  ONBOARDING: {
    SELECT_ORGANIZATION_TYPE: "onboarding-select-org-type",
    INPUT_ORG_NAME: "onboarding-input-org-name",
    INPUT_BRANCH: "onboarding-input-branch",
    INPUT_PHONE: "onboarding-input-phone",
    INPUT_EMAIL: "onboarding-input-email",
    INPUT_TAX_ID: "onboarding-input-tax-id",
    TEXTAREA_DETAIL: "onboarding-textarea-detail",
    BUTTON_LOGOUT: "onboarding-button-logout",
    BUTTON_CANCEL_REQUEST: "onboarding-button-cancel-request",
    BUTTON_PREVIOUS: "onboarding-button-previous",
    BUTTON_NEXT: "onboarding-button-next",
    BUTTON_SUBMIT: "onboarding-button-submit",
  },

  // HOME — หน้าหลัก/หน้า Landing

  HOME: {
    BUTTON_DASHBOARD: "home-button-dashboard",
    BUTTON_LOGIN: "home-button-login",
    BUTTON_REGISTER: "home-button-register",
    BUTTON_GOOGLE: "home-button-google",
    LINK_DASHBOARD: "home-link-dashboard",
    LINK_LOGIN: "home-link-login",
    LINK_REGISTER: "home-link-register",
  },

  // GENERIC_IMPORT — คอมโพเนนต์นำเข้าข้อมูลทั่วไป

  GENERIC_IMPORT: {
    MODAL: "modal-generic-import",
    BUTTON_UPLOAD: "generic-import-button-upload",
    INPUT_CELL: (rowIndex: number, columnKey: string) => `generic-import-input-cell-${rowIndex}-${columnKey}`,
    BUTTON_ROW_ACTIONS: (rowIndex: number) => `generic-import-button-row-actions-${rowIndex}`,
    MENUITEM_INSERT_ROW_ABOVE: (rowIndex: number) => `generic-import-menuitem-insert-row-above-${rowIndex}`,
    MENUITEM_INSERT_ROW_BELOW: (rowIndex: number) => `generic-import-menuitem-insert-row-below-${rowIndex}`,
    MENUITEM_DELETE_ROW: (rowIndex: number) => `generic-import-menuitem-delete-row-${rowIndex}`,
    BUTTON_ADD_ROW: "generic-import-button-add-row",
    BUTTON_FIRST_PAGE: "generic-import-button-first-page",
    BUTTON_PREV_PAGE: "generic-import-button-prev-page",
    BUTTON_NEXT_PAGE: "generic-import-button-next-page",
    BUTTON_LAST_PAGE: "generic-import-button-last-page",
    BUTTON_CONFIRM: "generic-import-button-confirm",
    BUTTON_CANCEL: "generic-import-button-cancel",
  },

  CONFIRM_IMPORT: {
    MODAL_CONFIRM_IMPORT: "modal-confirm-import",
    BUTTON_CANCEL: "confirm-import-button-cancel",
    BUTTON_CONFIRM: "confirm-import-button-confirm",
    TABLE_PREVIEW: "table-import-preview",
    TABLE_PREVIEW_ROW: (index: number) => `table-import-preview-row-${index}`,
  },

  // SELL_FORM — การขายสินทรัพย์ (เพิ่มเติม)

  SELL_FORM: {
    MODAL_SELL: "modal-sell-form",
    INPUT_BUYER: "input-sell-buyer",
    INPUT_PRICE: "input-sell-price",
    INPUT_FILE: "input-sell-file",
    BUTTON_UPLOAD: "sell-button-upload",
    BUTTON_SUBMIT: "sell-button-submit",
    BUTTON_CANCEL: "sell-button-cancel",
  },

  // COMMON COMPONENTS — ใช้ซ้ำทั่วทั้งระบบ

  SIDEBAR: {
    /** Sidebar wrapper */
    WRAPPER: "sidebar-wrapper",
    /** ปุ่ม toggle sidebar */
    BUTTON_TOGGLE: "sidebar-button-toggle",
    /** ลิงก์ไปหน้า Dashboard */
    LINK_DASHBOARD: "sidebar-link-dashboard",
    /** ลิงก์ไปหน้า Assets */
    LINK_ASSETS: "sidebar-link-assets",
    /** ลิงก์ไปหน้า Repair */
    LINK_REPAIR: "sidebar-link-repair",
    /** ลิงก์ไปหน้า Audit */
    LINK_AUDIT: "sidebar-link-audit",
    /** ลิงก์ไปหน้า Withdrawal */
    LINK_WITHDRAWAL: "sidebar-link-withdrawal",
    /** ลิงก์ไปหน้า Users */
    LINK_USERS: "sidebar-link-users",
    /** ลิงก์ไปหน้า Organization */
    LINK_ORGANIZATION: "sidebar-link-organization",
    /** ลิงก์ไปหน้า Settings */
    LINK_SETTINGS: "sidebar-link-settings",
  },

  NAV_USER: {
    /** Avatar / ชื่อผู้ใช้ที่ nav */
    BUTTON_USER_MENU: "nav-button-user-menu",
    /** Menu item "โปรไฟล์" */
    MENUITEM_PROFILE: "nav-menuitem-profile",
    /** Menu item "ตั้งค่า" */
    MENUITEM_SETTINGS: "nav-menuitem-settings",
    /** Menu item "ออกจากระบบ" */
    MENUITEM_LOGOUT: "nav-menuitem-logout",
  },

  CONFIRM_DELETE_DIALOG: {
    /** Generic dialog ยืนยันลบ (ใช้ใน ConfirmDeleteDialog component) */
    WRAPPER: "modal-delete-confirm",
    /** ปุ่มยืนยัน */
    BUTTON_CONFIRM: "delete-button-confirm",
    /** ปุ่มยกเลิก */
    BUTTON_CANCEL: "delete-button-cancel",
  },

  LOGOUT_BUTTON: {
    /** ปุ่ม logout ทั่วไป */
    BUTTON: "nav-button-logout",
  },

  PAGINATION: {
    /** ปุ่ม Previous page */
    BUTTON_PREV: "pagination-button-prev",
    /** ปุ่ม Next page */
    BUTTON_NEXT: "pagination-button-next",
    BUTTON_FIRST: "pagination-button-first",
    BUTTON_LAST: "pagination-button-last",
    /** Dropdown เลือกจำนวน rows per page */
    DROPDOWN_PAGE_SIZE: "dropdown-pagination-page-size",
  },

  TABLE: {
    WRAPPER: "table-wrapper",
    ROW: (id: number | string) => `table-row-${id}`,
    HEADER_ROW: "table-header-row",
    EMPTY_ROW: "table-empty-row",
    CHECKBOX_SELECT_ALL: "table-checkbox-select-all",
    CHECKBOX_ROW: (id: number | string) => `table-checkbox-row-${id}`,
    COLUMN_MENU: (columnId: string) => `table-column-menu-${columnId}`,
    MENUITEM_SORT_ASC: (columnId: string) => `table-menuitem-sort-asc-${columnId}`,
    MENUITEM_SORT_DESC: (columnId: string) => `table-menuitem-sort-desc-${columnId}`,
    MENUITEM_HIDE_COLUMN: (columnId: string) => `table-menuitem-hide-column-${columnId}`,
  },

  INBOX: {
    TABLE: "table-inbox",
    TABLE_ROW: (id: number | string) => `table-inbox-row-${id}`,
    BUTTON_ROW_READ: (id: number | string) => `inbox-button-row-read-${id}`,
    BUTTON_MARK_ALL_READ: "inbox-button-mark-all-read",
  },

  REPAIR: {
    TABLE: "table-repair",
    TABLE_ROW: (id: number | string) => `table-repair-row-${id}`,
    INPUT_SEARCH: "repair-input-search",
    BUTTON_CREATE: "repair-button-create",
    BUTTON_ROW_EDIT: (id: number | string) => `repair-button-row-edit-${id}`,
    BUTTON_ROW_DELETE: (id: number | string) => `repair-button-row-delete-${id}`,
  },

  REPAIR_FORM: {
    MODAL: "repair-form-modal",
    SELECT_ASSET: "repair-form-select-asset",
    TEXTAREA_NOTE: "repair-form-textarea-note",
    INPUT_RETURN_DATE: "repair-form-input-return-date",
    BUTTON_CANCEL: "repair-form-button-cancel",
    BUTTON_SUBMIT: "repair-form-button-submit",
  },

  REPAIR_DELETE: {
    MODAL: "repair-delete-modal",
    BUTTON_CANCEL: "repair-delete-button-cancel",
    BUTTON_CONFIRM: "repair-delete-button-confirm",
  },

  WITHDRAWAL_FORM: {
    INPUT_REASON: "withdrawal-form-input-reason",
    BUTTON_SUBMIT: "withdrawal-form-button-submit",
  },

  SELECT_ORG_PAGE: {
    INPUT_SEARCH: "select-org-input-search",
    BUTTON_ORG_ITEM: (id: number | string) => `select-org-button-item-${id}`,
    BUTTON_SKIP: "select-org-button-skip",
    BUTTON_SWITCH: "select-org-button-switch",
  },

} as const;
