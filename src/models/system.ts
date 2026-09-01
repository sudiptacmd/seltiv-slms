import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { DOC_TYPES, type DocType } from "./types";

export interface IAuditLog {
  _id: Ref;
  actor?: Ref; // User
  actorName: string;
  action: string; // "grade.edit", "fee.waiver", "user.permission", "gradesheet.publish"
  entity: string; // "Mark", "Invoice", ...
  entityId?: string;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
  createdAt: Date;
}
const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: ObjectId, ref: "User" },
    actorName: { type: String, default: "system" },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    meta: Schema.Types.Mixed,
  },
  { ...baseSchemaOptions, timestamps: { createdAt: true, updatedAt: false } },
);
export const AuditLog = defineModel<IAuditLog>("AuditLog", auditLogSchema);

export interface INotification {
  _id: Ref;
  user: Ref;
  title: string;
  body?: string;
  href?: string;
  icon?: string;
  readAt?: Date;
  createdAt: Date;
}
const notificationSchema = new Schema<INotification>(
  {
    user: { type: ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    body: String,
    href: String,
    icon: String,
    readAt: Date,
  },
  { ...baseSchemaOptions, timestamps: { createdAt: true, updatedAt: false } },
);
export const Notification = defineModel<INotification>("Notification", notificationSchema);

/** Single-doc settings for this branch (overrides env where set). */
export interface ISettings {
  _id: Ref;
  key: "singleton";
  schoolName?: string;
  headTeacher?: string;
  address?: string;
  eiin?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  currentYear?: Ref;
  gradingScale?: Ref;
  attendanceEditWindowHours: number;
  absenceSmsTemplate: string;
  feeReminderSmsTemplate: string;
  noticeDefaultChannels: string[];
  updatedAt: Date;
}
const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: "singleton", unique: true },
    schoolName: String,
    headTeacher: String,
    address: String,
    eiin: String,
    phone: String,
    email: String,
    logoUrl: String,
    currentYear: { type: ObjectId, ref: "AcademicYear" },
    gradingScale: { type: ObjectId, ref: "GradingScale" },
    attendanceEditWindowHours: { type: Number, default: 24 },
    absenceSmsTemplate: {
      type: String,
      default:
        "Dear Guardian, {student} (Class {class}) was marked {status} on {date} at {school}. — {school}",
    },
    feeReminderSmsTemplate: {
      type: String,
      default:
        "Dear Guardian, {student}'s fee of {amount} for {period} is due on {due}. Pay: {link} — {school}",
    },
    noticeDefaultChannels: { type: [String], default: ["portal", "sms"] },
  },
  baseSchemaOptions,
);
export const Settings = defineModel<ISettings>("Settings", settingsSchema);

export interface IImportJob {
  _id: Ref;
  kind: "students" | "guardians" | "staff" | "marks" | "fee_plans";
  fileName: string;
  status: "pending" | "validated" | "committed" | "failed";
  totalRows: number;
  okRows: number;
  errorRows: number;
  issues: { row: number; message: string }[];
  createdBy?: Ref;
  createdAt: Date;
  updatedAt: Date;
}
const importJobSchema = new Schema<IImportJob>(
  {
    kind: { type: String, enum: ["students", "guardians", "staff", "marks", "fee_plans"], required: true },
    fileName: String,
    status: { type: String, enum: ["pending", "validated", "committed", "failed"], default: "pending" },
    totalRows: { type: Number, default: 0 },
    okRows: { type: Number, default: 0 },
    errorRows: { type: Number, default: 0 },
    issues: [{ row: Number, message: String }],
    createdBy: { type: ObjectId, ref: "User" },
  },
  baseSchemaOptions,
);
export const ImportJob = defineModel<IImportJob>("ImportJob", importJobSchema);

export interface IGeneratedDocument {
  _id: Ref;
  type: DocType;
  title: string;
  url: string;
  student?: Ref;
  staff?: Ref;
  relatedId?: string;
  createdAt: Date;
}
const generatedDocumentSchema = new Schema<IGeneratedDocument>(
  {
    type: { type: String, enum: DOC_TYPES, required: true, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    student: { type: ObjectId, ref: "Student", index: true },
    staff: { type: ObjectId, ref: "Staff", index: true },
    relatedId: String,
  },
  { ...baseSchemaOptions, timestamps: { createdAt: true, updatedAt: false } },
);
export const GeneratedDocument = defineModel<IGeneratedDocument>(
  "GeneratedDocument",
  generatedDocumentSchema,
);

export interface IPasswordResetOtp {
  _id: Ref;
  phone: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}
const otpSchema = new Schema<IPasswordResetOtp>(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { ...baseSchemaOptions, timestamps: { createdAt: true, updatedAt: false } },
);
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const PasswordResetOtp = defineModel<IPasswordResetOtp>("PasswordResetOtp", otpSchema);
