/**
 * Barrel — importing from "@/models" registers every schema with Mongoose
 * (needed for populate() to resolve refs) and re-exports the models + types.
 */
export * from "./types";
export * from "./_helpers";
export * from "./user";
export * from "./people";
export * from "./academic";
export * from "./timetable";
export * from "./attendance";
export * from "./exam";
export * from "./admission";
export * from "./finance";
export * from "./payroll";
export * from "./notice";
export * from "./service-request";
export * from "./system";
