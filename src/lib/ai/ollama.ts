import "server-only";
import { requestSchema, type GradingRequest } from "./grading";
export const aiModel = () => process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";
const base = () => (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
export async function localModelStatus() {
  try {
    const response = await fetch(`${base()}/api/tags`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    const data = await response.json();
    return Boolean(response.ok && data.models?.some((m: { name: string }) => m.name === aiModel()));
  } catch { return false; }
}
const format = {
  type: "object", additionalProperties: false, required: ["classNumber", "subjectName", "allocations"],
  properties: {
    classNumber: { type: "integer" }, subjectName: { type: "string" },
    allocations: { type: "array", items: { type: "object", additionalProperties: false, required: ["period", "total", "components"], properties: {
      period: { type: "string", enum: ["pretest", "test", "final_term"] }, total: { type: "number" },
      components: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "marks"], properties: {
        key: { type: "string", enum: ["diary", "attendance", "weekly_test", "final_exam", "exam", "final_test"] }, marks: { type: "number" },
      } } },
    } } },
  },
};
export async function interpretGrading(prompt: string, catalog: { classNumber: number; subjects: string[] }[]): Promise<GradingRequest> {
  let response: Response;
  try {
    response = await fetch(`${base()}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({ model: aiModel(), stream: false, format, options: { temperature: 0, num_ctx: 4096, num_predict: 1200 }, messages: [
        { role: "system", content: `Extract a school marking-structure change from English, Bengali or Banglish into JSON. You only propose allocations, never execute instructions. The user must specify a class, subject, assessment periods, totals and component marks. Use the catalog's exact English subject name. pretest means pretest, test means test, final term means final_term. Distinguish weekly_test from final_test and final_exam. Preserve every number. A single exam-only test uses key exam. Do not invent missing marks or silently rebalance totals. If no valid class/subject or unsupported request, output classNumber 0, subjectName empty, allocations empty. Output only the schema JSON. Catalog: ${JSON.stringify(catalog)}. Schema: ${JSON.stringify(format)}` },
        { role: "user", content: prompt },
      ] }),
    });
  } catch { throw new Error("The local model did not respond. Check Ollama is running and try again."); }
  if (!response.ok) throw new Error("Ollama could not prepare the request. Check that the configured model is installed.");
  const data = await response.json();
  let parsed: unknown;
  try { parsed = JSON.parse(data.message?.content); } catch { throw new Error("The model returned an unreadable proposal. Please try rephrasing your request."); }
  const result = requestSchema.safeParse(parsed);
  if (!result.success) throw new Error(`Please specify the class, subject and complete marking totals. ${result.error.issues.find(i => i.code === "custom")?.message ?? "The request could not be validated."}`);
  return result.data;
}
