import { Schema } from 'mongoose';
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from './_helpers';
export interface IStaffAttendance { _id: Ref; staff: Ref; date: string; status: 'present'|'absent'|'late'|'leave'; checkIn?: string; note?: string; recordedBy?: Ref }
const schema = new Schema<IStaffAttendance>({
  staff: {type:ObjectId,ref:'Staff',required:true}, date: {type:String,required:true},
  status: {type:String,enum:['present','absent','late','leave'],required:true},
  checkIn: String, note: String, recordedBy: {type:ObjectId,ref:'User'},
}, baseSchemaOptions);
schema.index({staff:1,date:1},{unique:true});
export const StaffAttendance=defineModel<IStaffAttendance>('StaffAttendance',schema);
