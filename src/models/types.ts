export const ROLES = ["admin", "teacher", "accountant", "parent"] as const;
export type Role = (typeof ROLES)[number];

export const STUDENT_STATUS = ["active", "transferred", "withdrawn", "graduated", "suspended"] as const;
export type StudentStatus = (typeof STUDENT_STATUS)[number];

export const ENROLLMENT_STATUS = ["active", "promoted", "retained", "left"] as const;

export const ATTENDANCE_STATUS = ["present", "absent", "late", "leave"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export const APPLICATION_STAGE = [
  "submitted",
  "test_scheduled",
  "test_taken",
  "verified",
  "seat_offered",
  "enrolled",
  "rejected",
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGE)[number];

export const DOC_STATUS = ["pending", "verified", "rejected"] as const;

export const INVOICE_STATUS = ["draft", "issued", "partial", "paid", "void", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

export const PAYMENT_METHOD = ["cash", "bkash", "bank", "adjustment", "waiver"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const PAYMENT_STATUS = ["pending", "success", "failed", "refunded"] as const;

export const PAYSLIP_STATUS = ["draft", "pending", "paid"] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUS)[number];

export const LATE_FEE_RULE = ["none", "flat", "per_day", "percent"] as const;
export type LateFeeRule = (typeof LATE_FEE_RULE)[number];

export const NOTICE_STATUS = ["draft", "scheduled", "published"] as const;
export const NOTICE_CHANNELS = ["portal", "sms"] as const;
export const AUDIENCE_KIND = ["all", "all_parents", "all_teachers", "class", "section", "individuals"] as const;

export const SMS_STATUS = ["queued", "sent", "delivered", "failed"] as const;

export const SR_STATUS = ["submitted", "in_review", "approved", "ready", "collected", "rejected", "closed"] as const;
export type ServiceRequestStatus = (typeof SR_STATUS)[number];

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const DOC_TYPES = [
  "report_card",
  "gradesheet",
  "invoice",
  "receipt",
  "payslip",
  "transfer_certificate",
  "testimonial",
  "bonafide",
  "id_card",
  "admit_card",
  "admission_form",
] as const;
export type DocType = (typeof DOC_TYPES)[number];
