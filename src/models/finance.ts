import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import {
  INVOICE_STATUS,
  LATE_FEE_RULE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  type InvoiceStatus,
  type LateFeeRule,
  type PaymentMethod,
} from "./types";

export interface IFeeHead {
  _id: Ref;
  name: string; // "Monthly Tuition", "Exam Fee", "Admission Fee", "Late Fee"
  code: string;
  recurring: boolean; // monthly vs one-off
  order: number;
}
const feeHeadSchema = new Schema<IFeeHead>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    recurring: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);
export const FeeHead = defineModel<IFeeHead>("FeeHead", feeHeadSchema);

export interface IFeePlanItem {
  head: Ref;
  amount: number;
}
export interface IFeePlan {
  _id: Ref;
  name: string;
  year: Ref;
  klass: Ref;
  items: IFeePlanItem[]; // monthly recurring charges
  instalments: number; // default 2
  lateFeeRule: LateFeeRule;
  lateFeeValue: number; // flat amount / per-day amount / percent
  graceDays: number;
  dueDayOfMonth: number; // e.g. 5
  active: boolean;
}
const feePlanSchema = new Schema<IFeePlan>(
  {
    name: { type: String, required: true },
    year: { type: ObjectId, ref: "AcademicYear", required: true, index: true },
    klass: { type: ObjectId, ref: "Class", required: true, index: true },
    items: [{ head: { type: ObjectId, ref: "FeeHead" }, amount: Number }],
    instalments: { type: Number, default: 2 },
    lateFeeRule: { type: String, enum: LATE_FEE_RULE, default: "flat" },
    lateFeeValue: { type: Number, default: 100 },
    graceDays: { type: Number, default: 0 },
    dueDayOfMonth: { type: Number, default: 5 },
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);
feePlanSchema.index({ year: 1, klass: 1 }, { unique: true });
export const FeePlan = defineModel<IFeePlan>("FeePlan", feePlanSchema);

export interface IDiscount {
  _id: Ref;
  student: Ref;
  year: Ref;
  label: string; // "Sibling discount", "Merit scholarship", "Full waiver"
  kind: "percent" | "flat";
  value: number;
  heads?: Ref[]; // limit to certain fee heads; empty = all
  active: boolean;
}
const discountSchema = new Schema<IDiscount>(
  {
    student: { type: ObjectId, ref: "Student", required: true, index: true },
    year: { type: ObjectId, ref: "AcademicYear", required: true },
    label: { type: String, required: true },
    kind: { type: String, enum: ["percent", "flat"], default: "percent" },
    value: { type: Number, required: true },
    heads: [{ type: ObjectId, ref: "FeeHead" }],
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);
export const Discount = defineModel<IDiscount>("Discount", discountSchema);

export interface IInvoiceLine {
  head: Ref;
  label: string;
  amount: number;
}
export interface IInvoice {
  _id: Ref;
  invoiceNo: string; // "INV-2026-09-0142"
  student: Ref;
  year: Ref;
  section?: Ref;
  klass?: Ref;
  period: string; // "2026-09" or "Term 1"
  title: string; // "Tuition Fee — September 2026"
  lines: IInvoiceLine[];
  discountTotal: number;
  lateFee: number;
  grossTotal: number; // sum(lines)
  netPayable: number; // gross - discount + lateFee
  paidAmount: number;
  dueDate: Date;
  status: InvoiceStatus;
  instalmentPlan?: { number: number; amount: number; dueDate: Date; paid: boolean }[];
  payToken: string; // for public /pay/[token]
  createdAt: Date;
  updatedAt: Date;
}
const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNo: { type: String, required: true, unique: true },
    student: { type: ObjectId, ref: "Student", required: true, index: true },
    year: { type: ObjectId, ref: "AcademicYear", required: true, index: true },
    section: { type: ObjectId, ref: "Section", index: true },
    klass: { type: ObjectId, ref: "Class", index: true },
    period: { type: String, required: true, index: true },
    title: { type: String, required: true },
    lines: [{ head: { type: ObjectId, ref: "FeeHead" }, label: String, amount: Number }],
    discountTotal: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    grossTotal: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: INVOICE_STATUS, default: "issued", index: true },
    instalmentPlan: [{ number: Number, amount: Number, dueDate: Date, paid: Boolean }],
    payToken: { type: String, required: true, unique: true },
  },
  baseSchemaOptions,
);
invoiceSchema.index({ student: 1, period: 1 }, { unique: true });
export const Invoice = defineModel<IInvoice>("Invoice", invoiceSchema);

export interface IPayment {
  _id: Ref;
  receiptNo?: string;
  invoice: Ref;
  student: Ref;
  amount: number;
  method: PaymentMethod;
  status: (typeof PAYMENT_STATUS)[number];
  reference?: string; // bKash trxID / bank slip
  bkashTransaction?: Ref;
  note?: string;
  receivedBy?: Ref; // Staff
  receiptUrl?: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
const paymentSchema = new Schema<IPayment>(
  {
    receiptNo: { type: String, index: true },
    invoice: { type: ObjectId, ref: "Invoice", required: true, index: true },
    student: { type: ObjectId, ref: "Student", required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: PAYMENT_METHOD, required: true },
    status: { type: String, enum: PAYMENT_STATUS, default: "success" },
    reference: String,
    bkashTransaction: { type: ObjectId, ref: "BkashTransaction" },
    note: String,
    receivedBy: { type: ObjectId, ref: "Staff" },
    receiptUrl: String,
    paidAt: { type: Date, default: Date.now, index: true },
  },
  baseSchemaOptions,
);
export const Payment = defineModel<IPayment>("Payment", paymentSchema);

export interface IBkashTransaction {
  _id: Ref;
  trxId: string;
  amount: number;
  senderMsisdn: string;
  merchantInvoiceNumber?: string;
  paymentID: string;
  status: "initiated" | "completed" | "failed" | "cancelled";
  matchedInvoice?: Ref;
  matchedPayment?: Ref;
  raw?: unknown;
  createdAt: Date;
  updatedAt: Date;
}
const bkashSchema = new Schema<IBkashTransaction>(
  {
    trxId: { type: String, index: true },
    amount: Number,
    senderMsisdn: String,
    merchantInvoiceNumber: String,
    paymentID: { type: String, index: true },
    status: { type: String, enum: ["initiated", "completed", "failed", "cancelled"], default: "initiated" },
    matchedInvoice: { type: ObjectId, ref: "Invoice" },
    matchedPayment: { type: ObjectId, ref: "Payment" },
    raw: Schema.Types.Mixed,
  },
  baseSchemaOptions,
);
export const BkashTransaction = defineModel<IBkashTransaction>("BkashTransaction", bkashSchema);

export interface IReminderLog {
  _id: Ref;
  invoice: Ref;
  student: Ref;
  channel: "sms";
  sentAt: Date;
  sentBy?: Ref;
}
const reminderLogSchema = new Schema<IReminderLog>(
  {
    invoice: { type: ObjectId, ref: "Invoice", required: true, index: true },
    student: { type: ObjectId, ref: "Student", required: true },
    channel: { type: String, default: "sms" },
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: ObjectId, ref: "Staff" },
  },
  baseSchemaOptions,
);
export const ReminderLog = defineModel<IReminderLog>("ReminderLog", reminderLogSchema);
