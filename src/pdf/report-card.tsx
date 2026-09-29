import { Document, Page, View, Text, StyleSheet, Font, Image, Svg, Path, Circle, G, Rect, Line } from "@react-pdf/renderer";
import { CONTINUOUS_FIELDS, EXTRA_FIELDS, SUMMATIVE_FIELDS, type FieldKey } from "@/lib/report-card";
import { DEFAULT_GRADE_BANDS } from "@/lib/academic";
import type { IResultRow } from "@/models";

export type CardExam = {
  name: string;
  rows?: IResultRow[];
  grandTotal: number;
  totalFull: number;
  percent: number;
  gpa: number;
  grade: string;
  failed: boolean;
  sectionRank?: number;
  classRank?: number;
  sectionCount?: number;
  classCount?: number;
  remarks?: string;
  attendance?: { workingDays?: number; present?: number; absent?: number; late?: number };
  /** Older results without per-column detail. */
  subjects: { name: string; obtained: number | null; fullMarks: number; grade: string; absent: boolean }[];
};

export type CardSchool = { name: string; code: string; address: string; eiin?: string; phone?: string; email?: string; headTeacher?: string; logoUrl?: string };

// Keep subject names and headings whole ("Education", not "Educa-tion").
Font.registerHyphenationCallback((word) => [word]);

const K = {
  navy: "#0a303e",
  teal: "#006786",
  tealSoft: "#e6f4f8",
  gold: "#c79a2a",
  goldSoft: "#fbf4e2",
  ink: "#1f2a2e",
  muted: "#66737a",
  line: "#c9d3d6",
  zebra: "#f6f9fa",
  red: "#b0102b",
};
const GRADE_TONE: Record<string, [string, string]> = {
  "A+": ["#1a7f4b", "#e2f3e9"], A: ["#2f7d8c", "#e2f1f4"], "A-": ["#3a6ea5", "#e5edf7"],
  B: ["#8a6d1d", "#f7f0dc"], C: ["#a0561d", "#f8ebdf"], D: ["#8f4a3a", "#f6e6e2"], F: [K.red, "#fbe6e8"],
};

const st = StyleSheet.create({
  page: { padding: 20, paddingBottom: 26, fontSize: 7.5, color: K.ink, fontFamily: "Helvetica" },
  cell: { borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: K.line, justifyContent: "center", alignItems: "center", paddingHorizontal: 1 },
  head: { backgroundColor: K.navy, color: "#ffffff", fontSize: 6.2, textAlign: "center", fontFamily: "Helvetica-Bold" },
  sub: { backgroundColor: K.teal, color: "#ffffff", fontSize: 6, textAlign: "center" },
  box: { borderTopWidth: 0.5, borderLeftWidth: 0.5, borderColor: K.line },
  label: { fontSize: 6, color: K.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  panelTitle: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: K.teal, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
});
const ROW_H = 18, HEAD_H = 30;
const fmt = (n: number | null | undefined) => (n == null ? "" : String(Math.round(n * 100) / 100));

type ViewStyle = NonNullable<React.ComponentProps<typeof View>["style"]>;
function Cell({ w, h = ROW_H, children, style }: { w: number; h?: number; children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[st.cell, { height: h, width: w }, style ?? {}]}>
      {typeof children === "string" || typeof children === "number" ? <Text>{children}</Text> : children}
    </View>
  );
}

function GradeChip({ grade, size = 7 }: { grade: string; size?: number }) {
  const [fg, bg] = GRADE_TONE[grade] ?? [K.ink, "#eeeeee"];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1.5 }}>
      <Text style={{ color: fg, fontFamily: "Helvetica-Bold", fontSize: size }}>{grade || "—"}</Text>
    </View>
  );
}

/** Default school crest (used when no logo URL is configured): shield, open book and the school's initials. */
function Crest({ size, code }: { size: number; code: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill={K.navy} />
      <Circle cx="50" cy="50" r="43" fill="none" stroke={K.gold} strokeWidth="2" />
      <Circle cx="50" cy="50" r="39.5" fill="none" stroke={K.gold} strokeWidth="0.6" />
      <Path d="M50 20 L72 27 L72 48 C72 62 62 72 50 78 C38 72 28 62 28 48 L28 27 Z" fill="#ffffff" />
      <Path d="M50 24 L68 30 L68 48 C68 60 60 68.5 50 73.5 C40 68.5 32 60 32 48 L32 30 Z" fill={K.teal} />
      <G>
        <Path d="M36 44 C42 41 47 42 50 45 L50 60 C47 57 42 56 36 59 Z" fill="#ffffff" />
        <Path d="M64 44 C58 41 53 42 50 45 L50 60 C53 57 58 56 64 59 Z" fill="#f1e6c8" />
        <Line x1="50" y1="45" x2="50" y2="60" stroke={K.gold} strokeWidth="0.8" />
      </G>
      <Path d="M50 29 L52 34 L57 34 L53 37 L54.5 42 L50 39 L45.5 42 L47 37 L43 34 L48 34 Z" fill={K.gold} />
      <Rect x="30" y="80" width="40" height="10" rx="2" fill={K.gold} />
      <Text x="50" y="87.6" style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold" }} fill={K.navy} textAnchor="middle">{code.slice(0, 6)}</Text>
    </Svg>
  );
}

function Logo({ school, size }: { school: CardSchool; size: number }) {
  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
  return school.logoUrl ? <Image src={school.logoUrl} style={{ width: size, height: size, objectFit: "contain" }} /> : <Crest size={size} code={school.code} />;
}

type Head = { student: string; code: string; className: string; section: string; roll: string; year: string };

function Header({ school, exam }: { school: CardSchool; exam: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingBottom: 6, borderBottomWidth: 2, borderColor: K.navy }}>
      <Logo school={school} size={54} />
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ fontFamily: "Times-Bold", fontSize: 19, color: K.navy, letterSpacing: 0.4 }}>{school.name}</Text>
        <Text style={{ fontSize: 7.5, color: K.muted, marginTop: 1 }}>
          {school.address}{school.eiin ? `  ·  EIIN ${school.eiin}` : ""}
        </Text>
        <Text style={{ fontSize: 6.8, color: K.muted, marginTop: 1 }}>{[school.phone, school.email].filter(Boolean).join("  ·  ")}</Text>
        <View style={{ marginTop: 4, backgroundColor: K.navy, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 2.5 }}>
          <Text style={{ color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 7.5, letterSpacing: 2 }}>PROGRESS REPORT  ·  {exam.toUpperCase()}</Text>
        </View>
      </View>
      <View style={{ width: 54 }} />
    </View>
  );
}

function StudentStrip({ head }: { head: Head }) {
  const items: [string, string, number][] = [["Student name", head.student, 2.2], ["Student ID", head.code, 1.2], ["Class", head.className, 1], ["Section", head.section, 0.7], ["Roll", head.roll, 0.6], ["Academic year", head.year, 1]];
  return (
    <View style={{ flexDirection: "row", marginTop: 6, backgroundColor: K.tealSoft, borderRadius: 3, paddingVertical: 4, paddingHorizontal: 8 }}>
      {items.map(([l, v, f]) => (
        <View key={l} style={{ flex: f }}>
          <Text style={st.label}>{l}</Text>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: K.navy, marginTop: 1 }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

const W = { subject: 146, num: 38, pct: 36, gpa: 40, hi: 44 };
const val = (r: IResultRow, f: FieldKey) => ((r.max?.[f] ?? 0) > 0 ? fmt(r.absent ? null : r.values?.[f] ?? null) : "–");

function MainTable({ exam }: { exam: CardExam }) {
  const rows = (exam.rows ?? []).filter((r) => r.kind === "main");
  const top = (label: string, width: number) => (
    <View style={[st.cell, st.head, { width, height: 12 }]}><Text>{label}</Text></View>
  );
  const sub = (label: string, w: number, bg?: string) => (
    <View style={[st.cell, st.sub, { width: w, height: HEAD_H - 12 }, bg ? { backgroundColor: bg } : {}]}><Text>{label}</Text></View>
  );
  const tall = (label: string, w: number, bg: string = K.navy) => (
    <View style={[st.cell, st.head, { width: w, height: HEAD_H, backgroundColor: bg }]}><Text>{label}</Text></View>
  );
  const summW = W.num * 4 + W.pct, contW = W.num * 6 + W.pct;
  return (
    <View style={[st.box, { flexDirection: "row", marginTop: 7 }]}>
      <View>
        <View style={{ flexDirection: "row" }}>
          {tall("Subject", W.subject)}
          <View>
            {top("Summative Assessment", summW)}
            <View style={{ flexDirection: "row" }}>
              {sub("Written", W.num)}{sub("Objective", W.num)}{sub("Practical", W.num)}{sub("Convert", W.pct)}{sub("Converted (a)", W.num, "#0b5569")}
            </View>
          </View>
          <View>
            {top("Continuous Assessment", contW)}
            <View style={{ flexDirection: "row" }}>
              {sub("Oral", W.num)}{sub("Attendance", W.num)}{sub("Assignment", W.num)}{sub("C.T.", W.num)}{sub("Diary", W.num)}{sub("Convert", W.pct)}{sub("Converted (b)", W.num, "#0b5569")}
            </View>
          </View>
          {tall("Total\n(a + b)", W.num + 4, K.gold)}
          {tall("Letter Grade", W.num + 2)}
          {tall("Grade Point", W.num)}
        </View>
        {rows.map((r, i) => {
          const zebra = i % 2 ? { backgroundColor: K.zebra } : {};
          return (
            <View key={r.key} style={[{ flexDirection: "row" }, zebra]}>
              <Cell w={W.subject} style={{ alignItems: "flex-start", paddingLeft: 5 }}><Text style={{ fontSize: 7.3, fontFamily: "Helvetica-Bold", color: K.navy }}>{r.label}</Text></Cell>
              {SUMMATIVE_FIELDS.map((f) => <Cell key={f} w={W.num}>{val(r, f)}</Cell>)}
              <Cell w={W.pct}><Text style={{ color: K.muted }}>{`${r.summativePct}%`}</Text></Cell>
              <Cell w={W.num} style={{ backgroundColor: K.tealSoft }}>{fmt(r.summativeConverted)}</Cell>
              {CONTINUOUS_FIELDS.map((f) => <Cell key={f} w={W.num}>{val(r, f)}</Cell>)}
              <Cell w={W.pct}><Text style={{ color: K.muted }}>{`${r.continuousPct}%`}</Text></Cell>
              <Cell w={W.num} style={{ backgroundColor: K.tealSoft }}>{fmt(r.continuousConverted)}</Cell>
              <Cell w={W.num + 4} style={{ backgroundColor: K.goldSoft }}>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.3, color: r.gp === 0 ? K.red : K.navy }}>{r.absent ? "Abs" : fmt(r.total)}</Text>
                <Text style={{ fontSize: 5.5, color: K.muted }}>of {r.fullMarks}</Text>
              </Cell>
              <Cell w={W.num + 2}><GradeChip grade={r.grade} /></Cell>
              <Cell w={W.num}><Text style={{ fontFamily: "Helvetica-Bold" }}>{r.gp.toFixed(2)}</Text></Cell>
            </View>
          );
        })}
      </View>
      <View>
        {tall("GPA", W.gpa)}
        <View style={[st.cell, { width: W.gpa, height: ROW_H * rows.length, backgroundColor: K.navy }]}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13, color: "#ffffff" }}>{exam.gpa.toFixed(2)}</Text>
          <Text style={{ fontSize: 7, marginTop: 3, color: "#f1d58a", fontFamily: "Helvetica-Bold" }}>{exam.grade}</Text>
        </View>
      </View>
      <View>
        {tall("Highest Marks", W.hi)}
        {rows.map((r, i) => <Cell key={r.key} w={W.hi} style={i % 2 ? { backgroundColor: K.zebra } : {}}><Text style={{ color: K.muted }}>{fmt(r.highest)}</Text></Cell>)}
      </View>
    </View>
  );
}

function Panel({ title, children, style }: { title: string; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ borderWidth: 0.5, borderColor: K.line, borderRadius: 3, padding: 6 }, style ?? {}]}>
      <Text style={st.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ExtraTable({ rows }: { rows: IResultRow[] }) {
  if (!rows.length) return null;
  const labels: Record<string, string> = { cw: "CW", project: "Assignment / Project / Practical", ct: "C.T." };
  const w: Record<string, number> = { cw: 32, project: 84, ct: 32 };
  return (
    <Panel title="Additional subject">
      <View style={st.box}>
        <View style={{ flexDirection: "row" }}>
          <Cell w={110} h={14} style={st.sub}><Text>Subject</Text></Cell>
          {EXTRA_FIELDS.map((f) => <Cell key={f} w={w[f]} h={14} style={st.sub}><Text>{labels[f]}</Text></Cell>)}
          <Cell w={34} h={14} style={st.sub}><Text>Total</Text></Cell>
          <Cell w={34} h={14} style={st.sub}><Text>Grade</Text></Cell>
          <Cell w={30} h={14} style={st.sub}><Text>GP</Text></Cell>
          <Cell w={36} h={14} style={st.sub}><Text>Highest</Text></Cell>
        </View>
        {rows.map((r) => (
          <View key={r.key} style={{ flexDirection: "row" }}>
            <Cell w={110} style={{ alignItems: "flex-start", paddingLeft: 4 }}><Text style={{ fontFamily: "Helvetica-Bold", color: K.navy }}>{r.label}</Text></Cell>
            {EXTRA_FIELDS.map((f) => <Cell key={f} w={w[f]}>{val(r, f)}</Cell>)}
            <Cell w={34} style={{ backgroundColor: K.goldSoft }}><Text style={{ fontFamily: "Helvetica-Bold" }}>{r.absent ? "Abs" : fmt(r.total)}</Text></Cell>
            <Cell w={34}><GradeChip grade={r.grade} /></Cell>
            <Cell w={30}>{r.gp.toFixed(2)}</Cell>
            <Cell w={36}><Text style={{ color: K.muted }}>{fmt(r.highest)}</Text></Cell>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function Attendance({ exams }: { exams: CardExam[] }) {
  const sum = (k: "workingDays" | "present" | "absent" | "late") => {
    const vals = exams.map((e) => e.attendance?.[k]).filter((v): v is number => v != null);
    return vals.length ? String(vals.reduce((a, b) => a + b, 0)) : "";
  };
  const cols: [string, number][] = [["Examination", 142], ["Working days", 61], ["Present", 61], ["Absent", 61], ["Late present", 61]];
  const line = (cells: string[], bold = false) => (
    <View style={{ flexDirection: "row" }}>
      {cells.map((c, j) => <Cell key={j} w={cols[j][1]} h={14} style={j === 0 ? { alignItems: "flex-start", paddingLeft: 4 } : {}}><Text style={bold ? { fontFamily: "Helvetica-Bold" } : {}}>{c}</Text></Cell>)}
    </View>
  );
  return (
    <Panel title="Attendance" style={{ marginTop: 6 }}>
      <View style={st.box}>
        <View style={{ flexDirection: "row" }}>{cols.map(([l, w]) => <Cell key={l} w={w} h={14} style={st.sub}><Text>{l}</Text></Cell>)}</View>
        {exams.map((e, i) => <View key={i}>{line([e.name, fmt(e.attendance?.workingDays), fmt(e.attendance?.present), fmt(e.attendance?.absent), fmt(e.attendance?.late)])}</View>)}
        {exams.length > 1 && line(["Total", sum("workingDays"), sum("present"), sum("absent"), sum("late")], true)}
      </View>
    </Panel>
  );
}

function Summary({ exam }: { exam: CardExam }) {
  const stat = (label: string, value: string, hint?: string) => (
    <View style={{ width: "50%", paddingVertical: 3 }}>
      <Text style={st.label}>{label}</Text>
      <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: K.navy }}>{value}<Text style={{ fontSize: 7, color: K.muted, fontFamily: "Helvetica" }}>{hint ? `  ${hint}` : ""}</Text></Text>
    </View>
  );
  return (
    <Panel title="Result summary" style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: K.navy, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 15 }}>{exam.gpa.toFixed(2)}</Text>
          <Text style={{ color: "#f1d58a", fontSize: 6, letterSpacing: 1 }}>GPA</Text>
        </View>
        <View style={{ marginLeft: 8, alignItems: "flex-start" }}>
          <GradeChip grade={exam.grade} size={11} />
          <View style={{ marginTop: 5, backgroundColor: exam.failed ? "#fbe6e8" : "#e2f3e9", borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, color: exam.failed ? K.red : "#1a7f4b" }}>{exam.failed ? "FAILED" : "PASSED"}</Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {stat("Grand total", fmt(exam.grandTotal), `of ${fmt(exam.totalFull)}`)}
        {stat("Percentage", `${exam.percent.toFixed(1)}%`)}
        {stat("Position in section", exam.sectionRank ? String(exam.sectionRank) : "—", exam.sectionCount ? `of ${exam.sectionCount}` : "")}
        {stat("Position in class", exam.classRank ? String(exam.classRank) : "—", exam.classCount ? `of ${exam.classCount}` : "")}
      </View>
    </Panel>
  );
}

function Scale() {
  const bands = DEFAULT_GRADE_BANDS;
  return (
    <Panel title="Grading scale" style={{ width: 112, marginLeft: 6 }}>
      {bands.map((b, i) => {
        const hi = i === 0 ? 100 : bands[i - 1].minPercent - 1;
        return (
          <View key={b.grade} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 1.2 }}>
            <Text style={{ width: 38, color: K.muted }}>{b.minPercent}–{hi}</Text>
            <GradeChip grade={b.grade} size={6.3} />
            <Text style={{ width: 20, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{b.gpa.toFixed(1)}</Text>
          </View>
        );
      })}
    </Panel>
  );
}

function Signatures({ classTeacher, headTeacher }: { classTeacher?: string; headTeacher?: string }) {
  const sig = (title: string, name?: string) => (
    <View style={{ alignItems: "center", width: 170 }}>
      <Text style={{ fontSize: 7.5, color: K.navy, marginBottom: 2, fontFamily: "Helvetica-Bold" }}>{name ?? " "}</Text>
      <View style={{ width: 170, borderTopWidth: 0.7, borderColor: K.navy }} />
      <Text style={{ fontSize: 6.5, color: K.muted, marginTop: 2, letterSpacing: 0.6 }}>{title.toUpperCase()}</Text>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 30, paddingHorizontal: 24 }}>
      {sig("Class Teacher", classTeacher)}
      {sig("Co-ordinator")}
      {sig("Head Teacher", headTeacher)}
    </View>
  );
}

function Footer({ school }: { school: CardSchool }) {
  return (
    <View fixed style={{ position: "absolute", bottom: 10, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderColor: K.line, paddingTop: 3 }}>
      <Text style={{ fontSize: 6, color: K.muted }}>{school.name} · computer-generated report card · issued {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Text>
      <Text style={{ fontSize: 6, color: K.muted }}>Powered by <Text style={{ fontFamily: "Helvetica-Bold", color: K.teal }}>Seltiv SLMS</Text></Text>
    </View>
  );
}

function DetailedPage({ exam, allExams, head, school, classTeacher }: { exam: CardExam; allExams: CardExam[]; head: Head; school: CardSchool; classTeacher?: string }) {
  const extra = (exam.rows ?? []).filter((r) => r.kind === "extra");
  return (
    <Page size="A4" orientation="landscape" style={st.page}>
      <Header school={school} exam={exam.name} />
      <StudentStrip head={head} />
      <MainTable exam={exam} />
      <View style={{ flexDirection: "row", marginTop: 7 }}>
        <View style={{ width: 400 }}>
          <ExtraTable rows={extra} />
          <Attendance exams={allExams.filter((e) => e.rows)} />
        </View>
        <View style={{ flex: 1, flexDirection: "row", marginLeft: 6 }}>
          <Summary exam={exam} />
          <Scale />
        </View>
      </View>
      <View style={{ marginTop: 6, borderLeftWidth: 3, borderColor: K.gold, backgroundColor: K.goldSoft, paddingVertical: 5, paddingHorizontal: 8 }}>
        <Text style={st.label}>Class teacher&apos;s remarks</Text>
        <Text style={{ fontSize: 9.5, marginTop: 2, fontFamily: "Times-Italic", color: K.navy }}>{exam.remarks || " "}</Text>
      </View>
      <Signatures classTeacher={classTeacher} headTeacher={school.headTeacher} />
      <Footer school={school} />
    </Page>
  );
}

function SimplePage({ exam, head, school }: { exam: CardExam; head: Head; school: CardSchool }) {
  return (
    <Page size="A4" style={[st.page, { padding: 36 }]}>
      <Header school={school} exam={exam.name} />
      <StudentStrip head={head} />
      <Text style={{ fontSize: 10, marginVertical: 10 }}>GPA {exam.gpa.toFixed(2)} · {exam.grade} · Position {exam.sectionRank || "—"}</Text>
      {exam.subjects.map((s, j) => (
        <View key={j} style={{ flexDirection: "row", borderBottomWidth: 0.5, borderColor: K.line, paddingVertical: 4, fontSize: 9 }}>
          <Text style={{ flex: 3 }}>{s.name}</Text>
          <Text style={{ flex: 1, textAlign: "right" }}>{s.absent ? "Abs" : s.obtained ?? "—"}</Text>
          <Text style={{ flex: 1, textAlign: "right", color: K.muted }}>{s.fullMarks}</Text>
          <Text style={{ flex: 1, textAlign: "right" }}>{s.grade}</Text>
        </View>
      ))}
      <Footer school={school} />
    </Page>
  );
}

export function ReportCardPdf({
  school, student, studentCode, className, section, roll, year, classTeacher, exams,
}: {
  school: CardSchool; student: string; studentCode: string; className: string; section: string; roll: number | string; year: string; classTeacher?: string; exams: CardExam[];
}) {
  const head: Head = { student, code: studentCode, className, section, roll: String(roll), year };
  return (
    <Document title={`Report card — ${student}`} author={school.name}>
      {exams.length === 0 && (
        <Page size="A4" style={st.page}>
          <Header school={school} exam="Academic report" />
          <Text style={{ marginTop: 20 }}>No published results yet.</Text>
        </Page>
      )}
      {exams.map((e, i) => e.rows?.length
        ? <DetailedPage key={i} exam={e} allExams={exams} head={head} school={school} classTeacher={classTeacher} />
        : <SimplePage key={i} exam={e} head={head} school={school} />)}
    </Document>
  );
}
