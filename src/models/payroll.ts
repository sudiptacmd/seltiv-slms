import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { PAYSLIP_STATUS, type PayslipStatus } from "./types";

export interface ISalaryComponent {
  label: string;
  kind: "allowance" | "deduction";
  amount: number;
}
export interface ISalaryStructure {
  _id: Ref;
  staff: Ref;
  basic: number;
  components: ISalaryComponent[];
  providentFundPercent: number; // % of basic
  effectiveFrom: Date;
  active: boolean;
}
const salaryStructureSchema = new Schema<ISalaryStructure>(
  {
    staff: { type: ObjectId, ref: "Staff", required: true, index: true },
    basic: { type: Number, required: true },
    components: [{ label: String, kind: { type: String, enum: ["allowance", "deduction"] }, amount: Number }],
    providentFundPercent: { type: Number, default: 0 },
    effectiveFrom: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);
export const SalaryStructure = defineModel<ISalaryStructure>("SalaryStructure", salaryStructureSchema);

export interface IPayrollRun {
  _id: Ref;
  month: number; // 1-12
  year: number;
  status: "draft" | "finalised";
  workingDays: number;
  note?: string;
  createdBy?: Ref;
  createdAt: Date;
  updatedAt: Date;
}
const payrollRunSchema = new Schema<IPayrollRun>(
  {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    status: { type: String, enum: ["draft", "finalised"], default: "draft" },
    workingDays: { type: Number, default: 26 },
    note: String,
    createdBy: { type: ObjectId, ref: "Staff" },
  },
  baseSchemaOptions,
);
payrollRunSchema.index({ month: 1, year: 1 }, { unique: true });
export const PayrollRun = defineModel<IPayrollRun>("PayrollRun", payrollRunSchema);

export interface IPayslip {
  _id: Ref;
  run: Ref;
  staff: Ref;
  month: number;
  year: number;
  basic: number;
  allowances: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  providentFund: number;
  daysPresent: number;
  daysInMonth: number;
  lopDays: number; // loss-of-pay days (manual for now)
  lopAmount: number;
  gross: number;
  net: number;
  status: PayslipStatus;
  paidAt?: Date;
  paymentRef?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
const payslipSchema = new Schema<IPayslip>(
  {
    run: { type: ObjectId, ref: "PayrollRun", required: true, index: true },
    staff: { type: ObjectId, ref: "Staff", required: true, index: true },
    month: Number,
    year: Number,
    basic: Number,
    allowances: [{ label: String, amount: Number }],
    deductions: [{ label: String, amount: Number }],
    providentFund: { type: Number, default: 0 },
    daysPresent: { type: Number, default: 0 },
    daysInMonth: { type: Number, default: 30 },
    lopDays: { type: Number, default: 0 },
    lopAmount: { type: Number, default: 0 },
    gross: Number,
    net: Number,
    status: { type: String, enum: PAYSLIP_STATUS, default: "draft", index: true },
    paidAt: Date,
    paymentRef: String,
    pdfUrl: String,
  },
  baseSchemaOptions,
);
payslipSchema.index({ run: 1, staff: 1 }, { unique: true });
export const Payslip = defineModel<IPayslip>("Payslip", payslipSchema);
