import { View, Text } from "@react-pdf/renderer";
import { Sheet, KeyVal, s, C } from "./base";
import { taka, formatDate } from "@/lib/utils";

/* ─────────────────────────── Fee receipt ─────────────────────────── */

export function ReceiptPdf({
  receiptNo,
  date,
  student,
  studentCode,
  className,
  invoiceTitle,
  method,
  reference,
  lines,
  amountPaid,
  invoiceTotal,
  balance,
  receivedBy,
}: {
  receiptNo: string;
  date: Date;
  student: string;
  studentCode: string;
  className: string;
  invoiceTitle: string;
  method: string;
  reference?: string;
  lines: { label: string; amount: number }[];
  amountPaid: number;
  invoiceTotal: number;
  balance: number;
  receivedBy?: string;
}) {
  return (
    <Sheet title="Fee Receipt" footerNote={`Receipt ${receiptNo} · this is a system-generated receipt`}>
      <View style={s.row}>
        <View>
          <KeyVal k="Receipt No." v={receiptNo} />
          <KeyVal k="Date" v={formatDate(date)} />
          <KeyVal k="Payment mode" v={method.toUpperCase()} />
          {reference && <KeyVal k="Reference" v={reference} />}
        </View>
        <View>
          <KeyVal k="Student" v={student} />
          <KeyVal k="Student ID" v={studentCode} />
          <KeyVal k="Class" v={className} />
        </View>
      </View>

      <Text style={s.h2}>{invoiceTitle}</Text>
      <View style={[s.row, s.trBorder, { paddingBottom: 4 }]}>
        <Text style={s.th}>Particulars</Text>
        <Text style={s.th}>Amount</Text>
      </View>
      {lines.map((l, i) => (
        <View key={i} style={[s.row, s.trBorder, { paddingVertical: 4 }]}>
          <Text>{l.label}</Text>
          <Text>{taka(l.amount)}</Text>
        </View>
      ))}
      <View style={[s.row, { paddingVertical: 4 }]}>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>Invoice total</Text>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>{taka(invoiceTotal)}</Text>
      </View>
      <View style={[s.row, { paddingVertical: 2 }]}>
        <Text>Amount received now</Text>
        <Text>{taka(amountPaid)}</Text>
      </View>
      <View style={[s.row, { paddingVertical: 2 }]}>
        <Text style={{ color: balance > 0 ? C.accent : C.muted }}>Balance</Text>
        <Text style={{ color: balance > 0 ? C.accent : C.muted }}>{taka(balance)}</Text>
      </View>

      <View style={{ marginTop: 48, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={s.small}>Received by: {receivedBy ?? "Online (bKash)"}</Text>
        <Text style={s.small}>Authorised signature</Text>
      </View>
    </Sheet>
  );
}

/* ─────────────────────────── Fee invoice ─────────────────────────── */

export function InvoicePdf({
  invoiceNo,
  title,
  issueDate,
  dueDate,
  student,
  studentCode,
  className,
  lines,
  discount,
  lateFee,
  netPayable,
  paid,
}: {
  invoiceNo: string;
  title: string;
  issueDate: Date;
  dueDate: Date;
  student: string;
  studentCode: string;
  className: string;
  lines: { label: string; amount: number }[];
  discount: number;
  lateFee: number;
  netPayable: number;
  paid: number;
}) {
  return (
    <Sheet title="Fee Invoice" footerNote={`Invoice ${invoiceNo}`}>
      <View style={s.row}>
        <View>
          <KeyVal k="Invoice No." v={invoiceNo} />
          <KeyVal k="Issued" v={formatDate(issueDate)} />
          <KeyVal k="Due date" v={formatDate(dueDate)} />
        </View>
        <View>
          <KeyVal k="Student" v={student} />
          <KeyVal k="Student ID" v={studentCode} />
          <KeyVal k="Class" v={className} />
        </View>
      </View>

      <Text style={s.h2}>{title}</Text>
      <View style={[s.row, s.trBorder, { paddingBottom: 4 }]}>
        <Text style={s.th}>Particulars</Text>
        <Text style={s.th}>Amount</Text>
      </View>
      {lines.map((l, i) => (
        <View key={i} style={[s.row, s.trBorder, { paddingVertical: 4 }]}>
          <Text>{l.label}</Text>
          <Text>{taka(l.amount)}</Text>
        </View>
      ))}
      {discount > 0 && (
        <View style={[s.row, { paddingVertical: 3 }]}>
          <Text>Discount</Text>
          <Text>- {taka(discount)}</Text>
        </View>
      )}
      {lateFee > 0 && (
        <View style={[s.row, { paddingVertical: 3 }]}>
          <Text>Late fee</Text>
          <Text>{taka(lateFee)}</Text>
        </View>
      )}
      <View style={[s.row, { paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.line, marginTop: 4 }]}>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>Net payable</Text>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>{taka(netPayable)}</Text>
      </View>
      <View style={[s.row, { paddingVertical: 2 }]}>
        <Text style={s.label}>Paid</Text>
        <Text style={s.label}>{taka(paid)}</Text>
      </View>
      <View style={[s.row, { paddingVertical: 2 }]}>
        <Text style={{ color: C.accent }}>Balance</Text>
        <Text style={{ color: C.accent }}>{taka(netPayable - paid)}</Text>
      </View>
    </Sheet>
  );
}

/* ─────────────────────────── Payslip ─────────────────────────── */

export function PayslipPdf({
  staff,
  staffCode,
  designation,
  month,
  basic,
  allowances,
  deductions,
  gross,
  net,
  daysPresent,
  daysInMonth,
}: {
  staff: string;
  staffCode: string;
  designation: string;
  month: string;
  basic: number;
  allowances: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  gross: number;
  net: number;
  daysPresent: number;
  daysInMonth: number;
}) {
  return (
    <Sheet title={`Payslip — ${month}`} footerNote="Confidential — staff payslip">
      <View style={s.row}>
        <View>
          <KeyVal k="Employee" v={staff} />
          <KeyVal k="Staff ID" v={staffCode} />
          <KeyVal k="Designation" v={designation} />
        </View>
        <View>
          <KeyVal k="Pay period" v={month} />
          <KeyVal k="Days worked" v={`${daysPresent} / ${daysInMonth}`} />
        </View>
      </View>

      <View style={{ flexDirection: "row", marginTop: 14 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={s.h2}>Earnings</Text>
          <Line k="Basic" v={basic} />
          {allowances.map((a, i) => <Line key={i} k={a.label} v={a.amount} />)}
          <Line k="Gross" v={gross} bold />
        </View>
        <View style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: C.line }}>
          <Text style={s.h2}>Deductions</Text>
          {deductions.map((d, i) => <Line key={i} k={d.label} v={d.amount} />)}
          <Line k="Total" v={deductions.reduce((x, d) => x + d.amount, 0)} bold />
        </View>
      </View>

      <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
        <View style={s.row}>
          <Text style={{ fontFamily: "Times-Bold", fontSize: 12 }}>Net pay</Text>
          <Text style={{ fontFamily: "Times-Bold", fontSize: 12 }}>{taka(net)}</Text>
        </View>
      </View>
    </Sheet>
  );
}

function Line({ k, v, bold }: { k: string; v: number; bold?: boolean }) {
  return (
    <View style={[s.row, s.trBorder, { paddingVertical: 3 }]}>
      <Text style={bold ? { fontFamily: "Helvetica-Bold" } : {}}>{k}</Text>
      <Text style={bold ? { fontFamily: "Helvetica-Bold" } : {}}>{taka(v)}</Text>
    </View>
  );
}

/* ─────────────────────────── Certificate ─────────────────────────── */

export function CertificatePdf({
  kind,
  refNo,
  body,
  student,
  issuedOn,
  headTeacher,
}: {
  kind: string;
  refNo: string;
  body: string;
  student: string;
  issuedOn: Date;
  headTeacher: string;
}) {
  return (
    <Sheet title={kind} footerNote={`Ref: ${refNo}`}>
      <View style={{ marginTop: 8 }}>
        <Text style={s.small}>Ref: {refNo}</Text>
        <Text style={s.small}>Date: {formatDate(issuedOn)}</Text>
      </View>
      <Text style={{ textAlign: "center", fontFamily: "Times-Bold", fontSize: 15, marginTop: 24, textDecoration: "underline" }}>
        {kind.toUpperCase()}
      </Text>
      <Text style={{ marginTop: 24, lineHeight: 1.8, textAlign: "justify" }}>{body}</Text>
      <View style={{ marginTop: 64, alignItems: "flex-end" }}>
        <Text>_____________________________</Text>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>{headTeacher}</Text>
        <Text style={s.small}>Head Teacher</Text>
      </View>
      <Text style={{ position: "absolute", bottom: 60, left: 40, ...s.small }}>Issued to the guardian of {student}.</Text>
    </Sheet>
  );
}
