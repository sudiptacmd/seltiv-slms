import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { ENROLLMENT_STATUS } from "./types";

/* ── Academic year ── */
export interface IAcademicYear {
  _id: Ref;
  name: string; // "2026"
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  closed: boolean;
}
const academicYearSchema = new Schema<IAcademicYear>(
  {
    name: { type: String, required: true, unique: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    closed: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
export const AcademicYear = defineModel<IAcademicYear>("AcademicYear", academicYearSchema);

/* ── Class (grade) ── */
export interface IClass {
  _id: Ref;
  name: string; // "Class 8"
  numeric: number; // 8  — used for ordering & promotion
  order: number;
}
const classSchema = new Schema<IClass>(
  {
    name: { type: String, required: true, unique: true },
    numeric: { type: Number, required: true },
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);
export const ClassModel = defineModel<IClass>("Class", classSchema);

/* ── Section ── */
export interface ISection {
  _id: Ref;
  klass: Ref; // -> Class
  name: string; // "A" / "B"
  capacity: number;
  classTeacher?: Ref; // -> Staff
  room?: string;
}
const sectionSchema = new Schema<ISection>(
  {
    klass: { type: ObjectId, ref: "Class", required: true, index: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 60 },
    classTeacher: { type: ObjectId, ref: "Staff" },
    room: String,
  },
  baseSchemaOptions,
);
sectionSchema.index({ klass: 1, name: 1 }, { unique: true });
export const Section = defineModel<ISection>("Section", sectionSchema);

/* ── Subject ── */
export interface ISubject {
  _id: Ref;
  name: string; // "Mathematics"
  code: string; // "MATH"
  klass: Ref; // -> Class (each school defines its own)
  fullMarks: number;
  passMarks: number;
  hasCq?: boolean;
  hasMcq?: boolean;
  hasPractical?: boolean;
  order: number;
}
const subjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    klass: { type: ObjectId, ref: "Class", required: true, index: true },
    fullMarks: { type: Number, default: 100 },
    passMarks: { type: Number, default: 33 },
    hasCq: { type: Boolean, default: true },
    hasMcq: { type: Boolean, default: true },
    hasPractical: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);
subjectSchema.index({ klass: 1, code: 1 }, { unique: true });
export const Subject = defineModel<ISubject>("Subject", subjectSchema);

/* ── Subject teacher assignment ── */
export interface ISubjectAssignment {
  _id: Ref;
  section: Ref;
  subject: Ref;
  teacher: Ref;
  year: Ref;
}
const subjectAssignmentSchema = new Schema<ISubjectAssignment>(
  {
    section: { type: ObjectId, ref: "Section", required: true, index: true },
    subject: { type: ObjectId, ref: "Subject", required: true },
    teacher: { type: ObjectId, ref: "Staff", required: true, index: true },
    year: { type: ObjectId, ref: "AcademicYear", required: true },
  },
  baseSchemaOptions,
);
subjectAssignmentSchema.index({ section: 1, subject: 1, year: 1 }, { unique: true });
export const SubjectAssignment = defineModel<ISubjectAssignment>(
  "SubjectAssignment",
  subjectAssignmentSchema,
);

/* ── Enrollment (student ↔ section ↔ year) ── */
export interface IEnrollment {
  _id: Ref;
  student: Ref;
  year: Ref;
  klass: Ref;
  section: Ref;
  rollNumber: number;
  status: (typeof ENROLLMENT_STATUS)[number];
  createdAt: Date;
  updatedAt: Date;
}
const enrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: ObjectId, ref: "Student", required: true, index: true },
    year: { type: ObjectId, ref: "AcademicYear", required: true, index: true },
    klass: { type: ObjectId, ref: "Class", required: true },
    section: { type: ObjectId, ref: "Section", required: true, index: true },
    rollNumber: { type: Number, required: true },
    status: { type: String, enum: ENROLLMENT_STATUS, default: "active" },
  },
  baseSchemaOptions,
);
enrollmentSchema.index({ student: 1, year: 1 }, { unique: true });
enrollmentSchema.index({ section: 1, rollNumber: 1, year: 1 }, { unique: true });
export const Enrollment = defineModel<IEnrollment>("Enrollment", enrollmentSchema);

/* ── Term ── */
export interface ITerm {
  _id: Ref;
  year: Ref;
  name: string; // "Term 1"
  order: number;
  weight: number; // contribution to final result (%)
}
const termSchema = new Schema<ITerm>(
  {
    year: { type: ObjectId, ref: "AcademicYear", required: true, index: true },
    name: { type: String, required: true },
    order: { type: Number, default: 1 },
    weight: { type: Number, default: 100 },
  },
  baseSchemaOptions,
);
export const Term = defineModel<ITerm>("Term", termSchema);

/* ── Grading scale ── */
export interface IGradeBand {
  grade: string; // "A+"
  minPercent: number;
  gpa: number;
}
export interface IGradingScale {
  _id: Ref;
  name: string;
  isDefault: boolean;
  bands: IGradeBand[]; // sorted desc by minPercent
  failGrade: string;
}
const gradingScaleSchema = new Schema<IGradingScale>(
  {
    name: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    bands: [{ grade: String, minPercent: Number, gpa: Number }],
    failGrade: { type: String, default: "F" },
  },
  baseSchemaOptions,
);
export const GradingScale = defineModel<IGradingScale>("GradingScale", gradingScaleSchema);
