import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { STUDENT_STATUS, type StudentStatus } from "./types";

/* ─────────────────────────── Staff ─────────────────────────── */

export interface IStaff {
  _id: Ref;
  staffCode: string;
  name: string;
  designation: string; // "Senior Teacher", "Accountant", "Office Assistant"
  type: "teaching" | "non_teaching";
  phone: string;
  email?: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: Date;
  dateOfJoining?: Date;
  photoUrl?: string;
  nid?: string;
  address?: string;
  qualifications?: string;
  subjects?: Ref[]; // subjects this teacher can teach
  documents?: { label: string; url: string; uploadedAt: Date }[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    staffCode: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true },
    type: { type: String, enum: ["teaching", "non_teaching"], default: "teaching" },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    dateOfBirth: Date,
    dateOfJoining: Date,
    photoUrl: String,
    nid: String,
    address: String,
    qualifications: String,
    subjects: [{ type: ObjectId, ref: "Subject" }],
    documents: [{ label: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

export const Staff = defineModel<IStaff>("Staff", staffSchema);

/* ─────────────────────────── Guardian ─────────────────────────── */

export interface IGuardian {
  _id: Ref;
  name: string;
  relation: "father" | "mother" | "guardian";
  phone: string;
  email?: string;
  occupation?: string;
  nid?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guardianSchema = new Schema<IGuardian>(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, enum: ["father", "mother", "guardian"], default: "guardian" },
    phone: { type: String, required: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    occupation: String,
    nid: String,
    address: String,
  },
  baseSchemaOptions,
);

export const Guardian = defineModel<IGuardian>("Guardian", guardianSchema);

/* ─────────────────────────── Student ─────────────────────────── */

export interface IStudent {
  _id: Ref;
  studentCode: string; // school admission number
  name: string;
  gender: "male" | "female" | "other";
  dateOfBirth?: Date;
  bloodGroup?: string;
  religion?: string;
  photoUrl?: string;
  address?: string;
  birthCertNo?: string;
  admissionDate?: Date;
  status: StudentStatus;
  guardians: { guardian: Ref; isPrimary: boolean }[];
  documents?: { label: string; url: string; uploadedAt: Date }[];
  medicalNotes?: string;
  fromApplication?: Ref;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    studentCode: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dateOfBirth: Date,
    bloodGroup: String,
    religion: String,
    photoUrl: String,
    address: String,
    birthCertNo: String,
    admissionDate: Date,
    status: { type: String, enum: STUDENT_STATUS, default: "active", index: true },
    guardians: [
      {
        guardian: { type: ObjectId, ref: "Guardian", required: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    documents: [{ label: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    medicalNotes: String,
    fromApplication: { type: ObjectId, ref: "AdmissionApplication" },
  },
  baseSchemaOptions,
);
studentSchema.index({ name: "text", studentCode: "text" });

export const Student = defineModel<IStudent>("Student", studentSchema);
