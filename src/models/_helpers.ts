import mongoose, { Schema, type Model } from "mongoose";

/** Reuse a compiled model across hot reloads / serverless invocations. */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  // In dev, a re-evaluated model file means its schema changed — recompile instead of reusing the stale model.
  if (process.env.NODE_ENV === "development" && mongoose.models[name]) mongoose.deleteModel(name);
  return (mongoose.models[name] as Model<T>) ?? mongoose.model<T, Model<T>>(name, schema);
}

export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: { virtuals: true },
};

export type Ref = mongoose.Types.ObjectId;
export const ObjectId = Schema.Types.ObjectId;

/** Atomic incrementing counters for human-readable reference numbers. */
const counterSchema = new Schema<{ _id: string; seq: number }>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
export const Counter = defineModel<{ _id: string; seq: number }>("Counter", counterSchema);

export async function nextSeq(key: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return doc!.seq;
}
