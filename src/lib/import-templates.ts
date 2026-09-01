import "server-only";
import ExcelJS from "exceljs";

export type ImportKind = "students" | "guardians" | "staff";

type Col = { header: string; key: string; width: number; note?: string; example: string };

export const TEMPLATE_COLUMNS: Record<ImportKind, Col[]> = {
  students: [
    { header: "Name", key: "name", width: 24, example: "Ayesha Siddika" },
    { header: "Gender", key: "gender", width: 10, note: "male / female / other", example: "female" },
    { header: "Date of Birth", key: "dob", width: 14, note: "YYYY-MM-DD", example: "2012-05-14" },
    { header: "Class", key: "className", width: 12, note: "must match an existing class, e.g. 'Class 6'", example: "Class 6" },
    { header: "Section", key: "section", width: 10, note: "A / B", example: "A" },
    { header: "Roll", key: "roll", width: 8, example: "5" },
    { header: "Religion", key: "religion", width: 12, example: "Islam" },
    { header: "Blood Group", key: "bloodGroup", width: 12, example: "B+" },
    { header: "Address", key: "address", width: 28, example: "Kaliganj, Gazipur" },
    { header: "Guardian Name", key: "guardianName", width: 22, example: "Rafiqul Islam" },
    { header: "Guardian Relation", key: "guardianRelation", width: 16, note: "father / mother / guardian", example: "father" },
    { header: "Guardian Phone", key: "guardianPhone", width: 16, note: "01XXXXXXXXX — becomes the parent login", example: "01712345678" },
  ],
  guardians: [
    { header: "Name", key: "name", width: 24, example: "Rafiqul Islam" },
    { header: "Relation", key: "relation", width: 14, note: "father / mother / guardian", example: "father" },
    { header: "Phone", key: "phone", width: 16, example: "01712345678" },
    { header: "Email", key: "email", width: 24, example: "rafiq@example.com" },
    { header: "Occupation", key: "occupation", width: 18, example: "Businessman" },
    { header: "Student ID", key: "studentCode", width: 18, note: "link to this existing student", example: "SFHS-2026-1005" },
  ],
  staff: [
    { header: "Name", key: "name", width: 24, example: "Kamrul Hasan" },
    { header: "Designation", key: "designation", width: 20, example: "Assistant Teacher" },
    { header: "Type", key: "type", width: 14, note: "teaching / non_teaching", example: "teaching" },
    { header: "Phone", key: "phone", width: 16, example: "01812345678" },
    { header: "Email", key: "email", width: 24, example: "kamrul@sfhs.edu.bd" },
    { header: "Gender", key: "gender", width: 10, example: "male" },
    { header: "Date of Joining", key: "doj", width: 14, note: "YYYY-MM-DD", example: "2021-01-10" },
    { header: "Qualifications", key: "qualifications", width: 24, example: "B.Sc, B.Ed" },
  ],
};

export async function buildTemplate(kind: ImportKind): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Seltiv SLMS";
  const cols = TEMPLATE_COLUMNS[kind];
  const ws = wb.addWorksheet(kind[0].toUpperCase() + kind.slice(1));

  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF7FF" } };
  ws.getRow(1).border = { bottom: { style: "thin" } };

  // notes row
  const notes = ws.addRow(cols.map((c) => c.note ?? ""));
  notes.font = { italic: true, size: 9, color: { argb: "FF888888" } };

  // example row
  ws.addRow(cols.map((c) => c.example));

  ws.views = [{ state: "frozen", ySplit: 1 }];

  const guide = wb.addWorksheet("Instructions");
  guide.getColumn(1).width = 100;
  guide.addRow(["Seltiv SLMS — bulk import"]);
  guide.getRow(1).font = { bold: true, size: 13 };
  guide.addRow([""]);
  guide.addRow(["1. Keep row 1 (the headers) exactly as they are."]);
  guide.addRow(["2. Row 2 is a hint row and row 3 is an example — delete both before uploading, or leave them; the importer skips rows whose values don't validate and reports them."]);
  guide.addRow(["3. Add one record per row from row 2 onwards."]);
  guide.addRow(["4. Upload the file under the matching Import screen; you'll see a preview and any errors before anything is saved."]);

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

export async function parseImport(kind: ImportKind, data: Buffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const cols = TEMPLATE_COLUMNS[kind];
  const headerRow = ws.getRow(1);
  const headerIndex = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const match = cols.find((c) => c.header.toLowerCase() === String(cell.value ?? "").trim().toLowerCase());
    if (match) headerIndex.set(match.key, col);
  });

  const rows: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const rec: Record<string, string> = { __row: String(rowNum) };
    let hasValue = false;
    for (const [key, col] of headerIndex) {
      const v = row.getCell(col).value;
      const s = v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(typeof v === "object" && "text" in v ? v.text : v).trim();
      rec[key] = s;
      if (s) hasValue = true;
    }
    // skip the hint/example rows and blank rows
    const isHint = cols.some((c) => c.note && rec[c.key] === c.note);
    if (hasValue && !isHint) rows.push(rec);
  });
  return rows;
}
