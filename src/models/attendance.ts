import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { ATTENDANCE_STATUS, type AttendanceStatus } from "./types";

/** One roll call: a section on a date, optionally for a specific period. */
export interface IAttendanceSession {
  _id: Ref;
  year: Ref;
  section: Ref;
  date: string; // "YYYY-MM-DD" (local)
  period?: string; // "Period 1" — free text label from timetable
  takenBy: Ref; // -> Staff
  locked: boolean;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  createdAt: Date;
  updatedAt: Date;
}
const sessionSchema = new Schema<IAttendanceSession>(
  {
    year: { type: ObjectId, ref: "AcademicYear", required: true, index: true },
    section: { type: ObjectId, ref: "Section", required: true, index: true },
    date: { type: String, required: true, index: true },
    period: String,
    takenBy: { type: ObjectId, ref: "Staff", required: true },
    locked: { type: Boolean, default: false },
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    leaveCount: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);
sessionSchema.index({ section: 1, date: 1, period: 1 }, { unique: true });
export const AttendanceSession = defineModel<IAttendanceSession>(
  "AttendanceSession",
  sessionSchema,
);

export interface IAttendanceRecord {
  _id: Ref;
  session: Ref;
  student: Ref;
  section: Ref;
  date: string;
  status: AttendanceStatus;
  note?: string;
  smsSent?: boolean;
}
const recordSchema = new Schema<IAttendanceRecord>(
  {
    session: { type: ObjectId, ref: "AttendanceSession", required: true, index: true },
    student: { type: ObjectId, ref: "Student", required: true, index: true },
    section: { type: ObjectId, ref: "Section", required: true },
    date: { type: String, required: true, index: true },
    status: { type: String, enum: ATTENDANCE_STATUS, required: true },
    note: String,
    smsSent: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
recordSchema.index({ student: 1, date: 1, session: 1 }, { unique: true });
export const AttendanceRecord = defineModel<IAttendanceRecord>("AttendanceRecord", recordSchema);

/** School calendar — holidays / events / working-day overrides. */
export interface ICalendarDay {
  _id: Ref;
  date: string; // YYYY-MM-DD
  kind: "holiday" | "event" | "exam" | "working";
  title: string;
}
const calendarDaySchema = new Schema<ICalendarDay>(
  {
    date: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["holiday", "event", "exam", "working"], default: "holiday" },
    title: { type: String, required: true },
  },
  baseSchemaOptions,
);
export const CalendarDay = defineModel<ICalendarDay>("CalendarDay", calendarDaySchema);
