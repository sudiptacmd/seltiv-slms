import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { ROLES, type Role } from "./types";

export interface IUser {
  _id: Ref;
  name: string;
  email?: string;
  phone: string;
  passwordHash: string;
  roles: Role[];
  isClassTeacher?: boolean;
  active: boolean;
  mustChangePassword?: boolean;
  staff?: Ref; // -> Staff (teacher / accountant / admin)
  guardian?: Ref; // -> Guardian (parent)
  lastLoginAt?: Date;
  otpHash?: string;
  otpExpiresAt?: Date;
  failedLogins?: number;
  lockedUntil?: Date;
  notificationPrefs?: { sms: boolean; email: boolean };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, sparse: true, index: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    roles: { type: [String], enum: ROLES, default: ["parent"] },
    isClassTeacher: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    staff: { type: ObjectId, ref: "Staff" },
    guardian: { type: ObjectId, ref: "Guardian" },
    lastLoginAt: Date,
    otpHash: String,
    otpExpiresAt: Date,
    failedLogins: { type: Number, default: 0 },
    lockedUntil: Date,
    notificationPrefs: {
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
  },
  baseSchemaOptions,
);

export const User = defineModel<IUser>("User", userSchema);
