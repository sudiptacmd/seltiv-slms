import { Schema } from "mongoose";
import { defineModel, baseSchemaOptions, ObjectId, type Ref } from "./_helpers";
import { AUDIENCE_KIND, NOTICE_CHANNELS, NOTICE_STATUS, SMS_STATUS } from "./types";

export interface IAudience {
  kind: (typeof AUDIENCE_KIND)[number];
  klass?: Ref;
  section?: Ref;
  studentIds?: Ref[];
  guardianIds?: Ref[];
}

export interface INotice {
  _id: Ref;
  title: string;
  body: string;
  imageUrl?: string;
  attachmentUrl?: string;
  audience: IAudience;
  channels: (typeof NOTICE_CHANNELS)[number][];
  status: (typeof NOTICE_STATUS)[number];
  scheduledFor?: Date;
  publishedAt?: Date;
  createdBy?: Ref;
  // delivery rollup
  recipientCount: number;
  smsSent: number;
  smsDelivered: number;
  smsFailed: number;
  createdAt: Date;
  updatedAt: Date;
}
const noticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    imageUrl: String,
    attachmentUrl: String,
    audience: {
      kind: { type: String, enum: AUDIENCE_KIND, default: "all_parents" },
      klass: { type: ObjectId, ref: "Class" },
      section: { type: ObjectId, ref: "Section" },
      studentIds: [{ type: ObjectId, ref: "Student" }],
      guardianIds: [{ type: ObjectId, ref: "Guardian" }],
    },
    channels: { type: [String], enum: NOTICE_CHANNELS, default: ["portal"] },
    status: { type: String, enum: NOTICE_STATUS, default: "draft", index: true },
    scheduledFor: Date,
    publishedAt: Date,
    createdBy: { type: ObjectId, ref: "User" },
    recipientCount: { type: Number, default: 0 },
    smsSent: { type: Number, default: 0 },
    smsDelivered: { type: Number, default: 0 },
    smsFailed: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);
export const Notice = defineModel<INotice>("Notice", noticeSchema);

export interface INoticeRecipient {
  _id: Ref;
  notice: Ref;
  user?: Ref;
  guardian?: Ref;
  student?: Ref;
  readAt?: Date;
  smsStatus?: (typeof SMS_STATUS)[number];
  sms?: Ref;
}
const noticeRecipientSchema = new Schema<INoticeRecipient>(
  {
    notice: { type: ObjectId, ref: "Notice", required: true, index: true },
    user: { type: ObjectId, ref: "User", index: true },
    guardian: { type: ObjectId, ref: "Guardian" },
    student: { type: ObjectId, ref: "Student" },
    readAt: Date,
    smsStatus: { type: String, enum: SMS_STATUS },
    sms: { type: ObjectId, ref: "SmsMessage" },
  },
  baseSchemaOptions,
);
noticeRecipientSchema.index({ notice: 1, user: 1 });
export const NoticeRecipient = defineModel<INoticeRecipient>(
  "NoticeRecipient",
  noticeRecipientSchema,
);

export interface ISmsMessage {
  _id: Ref;
  to: string;
  text: string;
  segments: number;
  unicode: boolean;
  status: (typeof SMS_STATUS)[number];
  provider: string;
  providerMessageId?: string;
  purpose: "notice" | "attendance" | "fee_reminder" | "otp" | "service_request" | "other";
  relatedId?: Ref;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
const smsMessageSchema = new Schema<ISmsMessage>(
  {
    to: { type: String, required: true, index: true },
    text: { type: String, required: true },
    segments: { type: Number, default: 1 },
    unicode: { type: Boolean, default: false },
    status: { type: String, enum: SMS_STATUS, default: "queued", index: true },
    provider: { type: String, default: "mock" },
    providerMessageId: String,
    purpose: {
      type: String,
      enum: ["notice", "attendance", "fee_reminder", "otp", "service_request", "other"],
      default: "other",
    },
    relatedId: ObjectId,
    error: String,
  },
  baseSchemaOptions,
);
export const SmsMessage = defineModel<ISmsMessage>("SmsMessage", smsMessageSchema);
