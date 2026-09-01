import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { APPLICATION_STAGE, DOC_STATUS, type ApplicationStage } from "./types";

export interface IAdmissionSession {
  _id: Ref;
  name: string; // "Admission 2027"
  year: Ref; // target academic year
  opensAt: Date;
  closesAt: Date;
  isOpen: boolean;
  applicationFee: number;
  requiredDocuments: string[]; // ["Birth Certificate", "Previous Result", "Photo"]
  seats: { klass: Ref; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}
const admissionSessionSchema = new Schema<IAdmissionSession>(
  {
    name: { type: String, required: true },
    year: { type: ObjectId, ref: "AcademicYear", required: true },
    opensAt: { type: Date, required: true },
    closesAt: { type: Date, required: true },
    isOpen: { type: Boolean, default: true },
    applicationFee: { type: Number, default: 0 },
    requiredDocuments: { type: [String], default: ["Birth Certificate", "Previous Marksheet", "Passport-size Photo"] },
    seats: [{ klass: { type: ObjectId, ref: "Class" }, count: Number }],
  },
  baseSchemaOptions,
);
export const AdmissionSession = defineModel<IAdmissionSession>(
  "AdmissionSession",
  admissionSessionSchema,
);

export interface IApplicationDocument {
  label: string;
  url: string;
  status: (typeof DOC_STATUS)[number];
  note?: string;
  uploadedAt: Date;
}

export interface IAdmissionApplication {
  _id: Ref;
  applicationNo: string; // "APP-2027-0001"
  session: Ref;
  klass: Ref; // class applied for
  stage: ApplicationStage;
  // student
  studentName: string;
  gender: "male" | "female" | "other";
  dateOfBirth?: Date;
  birthCertNo?: string;
  religion?: string;
  address?: string;
  // guardian
  guardianName: string;
  guardianRelation: "father" | "mother" | "guardian";
  guardianPhone: string;
  guardianEmail?: string;
  guardianOccupation?: string;
  // previous school
  previousSchool?: string;
  previousClass?: string;
  previousResult?: string;
  // process
  documents: IApplicationDocument[];
  entranceTest?: Ref;
  testScore?: number;
  applicationFeePaid: boolean;
  rejectionReason?: string;
  enrolledStudent?: Ref;
  createdAt: Date;
  updatedAt: Date;
}
const admissionApplicationSchema = new Schema<IAdmissionApplication>(
  {
    applicationNo: { type: String, required: true, unique: true },
    session: { type: ObjectId, ref: "AdmissionSession", required: true, index: true },
    klass: { type: ObjectId, ref: "Class", required: true, index: true },
    stage: { type: String, enum: APPLICATION_STAGE, default: "submitted", index: true },
    studentName: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dateOfBirth: Date,
    birthCertNo: String,
    religion: String,
    address: String,
    guardianName: { type: String, required: true },
    guardianRelation: { type: String, enum: ["father", "mother", "guardian"], default: "father" },
    guardianPhone: { type: String, required: true, index: true },
    guardianEmail: String,
    guardianOccupation: String,
    previousSchool: String,
    previousClass: String,
    previousResult: String,
    documents: [
      {
        label: String,
        url: String,
        status: { type: String, enum: DOC_STATUS, default: "pending" },
        note: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    entranceTest: { type: ObjectId, ref: "EntranceTest" },
    testScore: Number,
    applicationFeePaid: { type: Boolean, default: false },
    rejectionReason: String,
    enrolledStudent: { type: ObjectId, ref: "Student" },
  },
  baseSchemaOptions,
);
export const AdmissionApplication = defineModel<IAdmissionApplication>(
  "AdmissionApplication",
  admissionApplicationSchema,
);

export interface IEntranceTest {
  _id: Ref;
  session: Ref;
  title: string;
  date: Date;
  venue?: string;
  fullMarks: number;
  applicants: Ref[]; // AdmissionApplication ids
  createdAt: Date;
  updatedAt: Date;
}
const entranceTestSchema = new Schema<IEntranceTest>(
  {
    session: { type: ObjectId, ref: "AdmissionSession", required: true, index: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    venue: String,
    fullMarks: { type: Number, default: 100 },
    applicants: [{ type: ObjectId, ref: "AdmissionApplication" }],
  },
  baseSchemaOptions,
);
export const EntranceTest = defineModel<IEntranceTest>("EntranceTest", entranceTestSchema);
