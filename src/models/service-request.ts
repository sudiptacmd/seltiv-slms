import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { SR_STATUS, type ServiceRequestStatus, type DocType } from "./types";

export interface IServiceRequestType {
  _id: Ref;
  name: string; // "Transfer Certificate"
  code: string;
  description?: string;
  fee: number;
  stages: string[]; // ["Submitted", "Verification", "Head-teacher approval", "Ready"]
  documentType?: DocType; // template used to generate the output
  active: boolean;
}
const typeSchema = new Schema<IServiceRequestType>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: String,
    fee: { type: Number, default: 0 },
    stages: {
      type: [String],
      default: ["Submitted", "Verification", "Head-teacher approval", "Ready"],
    },
    documentType: String,
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);
export const ServiceRequestType = defineModel<IServiceRequestType>(
  "ServiceRequestType",
  typeSchema,
);

export interface IServiceRequestEvent {
  at: Date;
  stage: string;
  status: ServiceRequestStatus;
  note?: string;
  by?: Ref;
}
export interface IServiceRequest {
  _id: Ref;
  requestNo: string; // "SR-2026-0001"
  type: Ref;
  student: Ref;
  requestedBy: Ref; // User (parent)
  reason?: string;
  currentStage: string;
  status: ServiceRequestStatus;
  assignee?: Ref; // Staff
  feePaid: boolean;
  events: IServiceRequestEvent[];
  outputUrl?: string; // generated / signed document
  signedCopyUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
const srSchema = new Schema<IServiceRequest>(
  {
    requestNo: { type: String, required: true, unique: true },
    type: { type: ObjectId, ref: "ServiceRequestType", required: true, index: true },
    student: { type: ObjectId, ref: "Student", required: true, index: true },
    requestedBy: { type: ObjectId, ref: "User", required: true, index: true },
    reason: String,
    currentStage: { type: String, default: "Submitted" },
    status: { type: String, enum: SR_STATUS, default: "submitted", index: true },
    assignee: { type: ObjectId, ref: "Staff" },
    feePaid: { type: Boolean, default: false },
    events: [
      {
        at: { type: Date, default: Date.now },
        stage: String,
        status: { type: String, enum: SR_STATUS },
        note: String,
        by: { type: ObjectId, ref: "User" },
      },
    ],
    outputUrl: String,
    signedCopyUrl: String,
  },
  baseSchemaOptions,
);
export const ServiceRequest = defineModel<IServiceRequest>("ServiceRequest", srSchema);
