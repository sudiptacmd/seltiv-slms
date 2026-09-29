import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { PERIODS, type Allocation } from "@/lib/ai/grading";
export interface IMarkingStructure {
  _id: string; year: Ref; klass: Ref; subject: Ref; version: number; allocations: Allocation[];
  history: { proposalId: string; actor: Ref; actorName: string; approvedAt: Date; before: Allocation[]; after: Allocation[] }[];
}
const allocation = new Schema({
  period: { type: String, enum: PERIODS, required: true }, total: { type: Number, required: true },
  components: [{ _id: false, key: { type: String, required: true }, marks: { type: Number, required: true } }],
}, { _id: false });
const schema = new Schema<IMarkingStructure>({
  _id: String, year: { type: ObjectId, ref: "AcademicYear", required: true },
  klass: { type: ObjectId, ref: "Class", required: true }, subject: { type: ObjectId, ref: "Subject", required: true },
  version: { type: Number, default: 0 }, allocations: [allocation],
  history: [{ _id: false, proposalId: String, actor: { type: ObjectId, ref: "User" }, actorName: String,
    approvedAt: Date, before: [allocation], after: [allocation] }],
}, baseSchemaOptions);
export const MarkingStructure = defineModel<IMarkingStructure>("MarkingStructure", schema);
