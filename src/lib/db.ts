import mongoose from "mongoose";
import { env } from "./env";

/**
 * One Mongoose connection per process, cached across Next.js hot reloads and
 * serverless invocations.
 */

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalWithMongoose = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = globalWithMongoose._mongoose ?? { conn: null, promise: null };
globalWithMongoose._mongoose = cache;

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(env.mongoUri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

/** Call at the top of every server action / route handler that touches the DB. */
export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  await connectDb();
  return fn();
}
