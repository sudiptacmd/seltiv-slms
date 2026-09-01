import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { WEEKDAYS, type Weekday } from "./types";

export interface IPeriodSlot {
  _id: Ref;
  name: string; // "Period 1"
  order: number;
  startTime: string; // "09:00"
  endTime: string; // "09:45"
  isBreak?: boolean;
}
const periodSlotSchema = new Schema<IPeriodSlot>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isBreak: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
export const PeriodSlot = defineModel<IPeriodSlot>("PeriodSlot", periodSlotSchema);

export interface ITimetableEntry {
  _id: Ref;
  year: Ref;
  section: Ref;
  weekday: Weekday;
  slot: Ref; // -> PeriodSlot
  subject: Ref;
  teacher: Ref;
}
const timetableEntrySchema = new Schema<ITimetableEntry>(
  {
    year: { type: ObjectId, ref: "AcademicYear", required: true, index: true },
    section: { type: ObjectId, ref: "Section", required: true, index: true },
    weekday: { type: String, enum: WEEKDAYS, required: true },
    slot: { type: ObjectId, ref: "PeriodSlot", required: true },
    subject: { type: ObjectId, ref: "Subject", required: true },
    teacher: { type: ObjectId, ref: "Staff", required: true, index: true },
  },
  baseSchemaOptions,
);
timetableEntrySchema.index({ section: 1, weekday: 1, slot: 1, year: 1 }, { unique: true });
export const TimetableEntry = defineModel<ITimetableEntry>("TimetableEntry", timetableEntrySchema);
