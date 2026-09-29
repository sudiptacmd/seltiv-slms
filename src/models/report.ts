import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import type { FieldKey, RowKind } from "@/lib/report-card";

/** Report-card layout for one class: which rows appear and how each is marked. */
export interface IReportScheme {
  _id: Ref;
  klass: Ref;
  rows: {
    key: string;
    label: string;
    subject?: Ref;
    kind: RowKind;
    max: Partial<Record<FieldKey, number>>;
    summativePct: number;
    continuousPct: number;
  }[];
  updatedBy?: Ref;
  createdAt: Date;
  updatedAt: Date;
}
const reportSchemeSchema = new Schema<IReportScheme>(
  {
    klass: { type: ObjectId, ref: "Class", required: true, unique: true },
    rows: [
      {
        _id: false,
        key: { type: String, required: true },
        label: { type: String, required: true },
        subject: { type: ObjectId, ref: "Subject" },
        kind: { type: String, enum: ["main", "extra"], default: "main" },
        max: { type: Map, of: Number, default: {} },
        summativePct: { type: Number, default: 70 },
        continuousPct: { type: Number, default: 60 },
      },
    ],
    updatedBy: { type: ObjectId, ref: "User" },
  },
  baseSchemaOptions,
);
export const ReportScheme = defineModel<IReportScheme>("ReportScheme", reportSchemeSchema);

/** One student's marks for one report-card row in one exam, entered by the office. */
export interface IGradeEntry {
  _id: Ref;
  exam: Ref;
  section: Ref;
  student: Ref;
  row: string;
  values: Partial<Record<FieldKey, number | null>>;
  absent: boolean;
  enteredBy?: Ref;
  createdAt: Date;
  updatedAt: Date;
}
const gradeEntrySchema = new Schema<IGradeEntry>(
  {
    exam: { type: ObjectId, ref: "Exam", required: true },
    section: { type: ObjectId, ref: "Section", required: true },
    student: { type: ObjectId, ref: "Student", required: true },
    row: { type: String, required: true },
    values: { type: Map, of: Number, default: {} },
    absent: { type: Boolean, default: false },
    enteredBy: { type: ObjectId, ref: "User" },
  },
  baseSchemaOptions,
);
gradeEntrySchema.index({ exam: 1, student: 1, row: 1 }, { unique: true });
gradeEntrySchema.index({ exam: 1, section: 1 });
export const GradeEntry = defineModel<IGradeEntry>("GradeEntry", gradeEntrySchema);

/** Per-exam attendance and remarks printed at the bottom of the card. */
export interface IExamStudentRecord {
  _id: Ref;
  exam: Ref;
  section: Ref;
  student: Ref;
  workingDays?: number;
  present?: number;
  late?: number;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}
const examStudentRecordSchema = new Schema<IExamStudentRecord>(
  {
    exam: { type: ObjectId, ref: "Exam", required: true },
    section: { type: ObjectId, ref: "Section", required: true },
    student: { type: ObjectId, ref: "Student", required: true },
    workingDays: Number,
    present: Number,
    late: Number,
    remarks: String,
  },
  baseSchemaOptions,
);
examStudentRecordSchema.index({ exam: 1, student: 1 }, { unique: true });
examStudentRecordSchema.index({ exam: 1, section: 1 });
export const ExamStudentRecord = defineModel<IExamStudentRecord>("ExamStudentRecord", examStudentRecordSchema);
