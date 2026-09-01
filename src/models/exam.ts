import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";

export interface IExam {
  _id: Ref;
  year: Ref;
  term: Ref;
  name: string; // "Half-yearly Examination 2026"
  classes: Ref[]; // classes this exam covers
  startDate?: Date;
  endDate?: Date;
  resultPublished: boolean;
  routinePublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const examSchema = new Schema<IExam>(
  {
    year: { type: ObjectId, ref: "AcademicYear", required: true, index: true },
    term: { type: ObjectId, ref: "Term", required: true },
    name: { type: String, required: true },
    classes: [{ type: ObjectId, ref: "Class" }],
    startDate: Date,
    endDate: Date,
    resultPublished: { type: Boolean, default: false },
    routinePublished: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
export const Exam = defineModel<IExam>("Exam", examSchema);

export interface IExamSubject {
  _id: Ref;
  exam: Ref;
  klass: Ref;
  subject: Ref;
  examDate?: Date;
  fullMarks: number;
  passMarks: number;
}
const examSubjectSchema = new Schema<IExamSubject>(
  {
    exam: { type: ObjectId, ref: "Exam", required: true, index: true },
    klass: { type: ObjectId, ref: "Class", required: true },
    subject: { type: ObjectId, ref: "Subject", required: true },
    examDate: Date,
    fullMarks: { type: Number, default: 100 },
    passMarks: { type: Number, default: 33 },
  },
  baseSchemaOptions,
);
examSubjectSchema.index({ exam: 1, subject: 1 }, { unique: true });
export const ExamSubject = defineModel<IExamSubject>("ExamSubject", examSubjectSchema);

export interface IMark {
  _id: Ref;
  exam: Ref;
  section: Ref;
  subject: Ref;
  student: Ref;
  obtained: number | null; // null = not entered
  absent: boolean;
  exempt: boolean;
  enteredBy?: Ref;
  createdAt: Date;
  updatedAt: Date;
}
const markSchema = new Schema<IMark>(
  {
    exam: { type: ObjectId, ref: "Exam", required: true, index: true },
    section: { type: ObjectId, ref: "Section", required: true, index: true },
    subject: { type: ObjectId, ref: "Subject", required: true, index: true },
    student: { type: ObjectId, ref: "Student", required: true, index: true },
    obtained: { type: Number, default: null },
    absent: { type: Boolean, default: false },
    exempt: { type: Boolean, default: false },
    enteredBy: { type: ObjectId, ref: "Staff" },
  },
  baseSchemaOptions,
);
markSchema.index({ exam: 1, subject: 1, student: 1 }, { unique: true });
export const Mark = defineModel<IMark>("Mark", markSchema);

/** Marks-entry lock per exam × section × subject. */
export interface IMarkSubmission {
  _id: Ref;
  exam: Ref;
  section: Ref;
  subject: Ref;
  submitted: boolean;
  submittedBy?: Ref;
  submittedAt?: Date;
  locked: boolean;
}
const markSubmissionSchema = new Schema<IMarkSubmission>(
  {
    exam: { type: ObjectId, ref: "Exam", required: true, index: true },
    section: { type: ObjectId, ref: "Section", required: true },
    subject: { type: ObjectId, ref: "Subject", required: true },
    submitted: { type: Boolean, default: false },
    submittedBy: { type: ObjectId, ref: "Staff" },
    submittedAt: Date,
    locked: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
markSubmissionSchema.index({ exam: 1, section: 1, subject: 1 }, { unique: true });
export const MarkSubmission = defineModel<IMarkSubmission>("MarkSubmission", markSubmissionSchema);

/** Computed per student per exam. */
export interface IResultSubject {
  subject: Ref;
  obtained: number | null;
  fullMarks: number;
  grade: string;
  gpa: number;
  absent: boolean;
}
export interface IResult {
  _id: Ref;
  exam: Ref;
  year: Ref;
  section: Ref;
  klass: Ref;
  student: Ref;
  subjects: IResultSubject[];
  totalObtained: number;
  totalFull: number;
  percent: number;
  gpa: number; // grade-point average (with optional-subject rules kept simple)
  grade: string;
  failed: boolean;
  sectionRank: number;
  classRank: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const resultSchema = new Schema<IResult>(
  {
    exam: { type: ObjectId, ref: "Exam", required: true, index: true },
    year: { type: ObjectId, ref: "AcademicYear", required: true },
    section: { type: ObjectId, ref: "Section", required: true, index: true },
    klass: { type: ObjectId, ref: "Class", required: true, index: true },
    student: { type: ObjectId, ref: "Student", required: true, index: true },
    subjects: [
      {
        subject: { type: ObjectId, ref: "Subject" },
        obtained: Number,
        fullMarks: Number,
        grade: String,
        gpa: Number,
        absent: Boolean,
      },
    ],
    totalObtained: Number,
    totalFull: Number,
    percent: Number,
    gpa: Number,
    grade: String,
    failed: Boolean,
    sectionRank: Number,
    classRank: Number,
    publishedAt: Date,
  },
  baseSchemaOptions,
);
resultSchema.index({ exam: 1, student: 1 }, { unique: true });
export const Result = defineModel<IResult>("Result", resultSchema);
