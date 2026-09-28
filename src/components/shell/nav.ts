import type { Role } from "@/models/types";

export type NavItem = { label: string; href: string; exact?: boolean };
export type NavGroup = { heading?: string; items: NavItem[] };

export const PORTAL_META: Record<Role, { name: string; base: string }> = {
  admin: { name: "Seltiv SLMS", base: "/admin" },
  teacher: { name: "Teacher Portal", base: "/teacher" },
  parent: { name: "Parent Portal", base: "/parent" },
  accountant: { name: "Accounts Portal", base: "/accounts" },
};

export const ADMIN_NAV: NavGroup[] = [
  { items: [{ label: "Dashboard", href: "/admin", exact: true }] },
  {
    heading: "Admissions",
    items: [
      { label: "Applications", href: "/admin/admissions" },
      { label: "Entrance Tests", href: "/admin/admissions/tests" },
      { label: "Session Settings", href: "/admin/admissions/settings" },
    ],
  },
  {
    heading: "Students",
    items: [
      { label: "Directory", href: "/admin/students", exact: true },
      { label: "Promotion", href: "/admin/students/promote" },
      { label: "Import", href: "/admin/students/import" },
    ],
  },
  {
    heading: "Academics",
    items: [
      { label: "Years", href: "/admin/academics/years" },
      { label: "Classes & Sections", href: "/admin/academics/classes" },
      { label: "Subjects", href: "/admin/academics/subjects" },
      { label: "Assignments", href: "/admin/academics/assignments" },
      { label: "Timetable", href: "/admin/academics/timetable" },
    ],
  },
  {
    heading: "Attendance",
    items: [
      { label: "Monitor", href: "/admin/attendance", exact: true },
      { label: "Teacher Attendance", href: "/admin/attendance/teachers" },
      { label: "Calendar & Settings", href: "/admin/attendance/settings" },
    ],
  },
  {
    heading: "Exams & Grades",
    items: [
      { label: "Exams", href: "/admin/exams", exact: true },
      { label: "Grading Scale", href: "/admin/exams/grading-scale" },
      { label: "Report Cards", href: "/admin/exams/report-cards" },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Overview", href: "/admin/finance", exact: true },
      { label: "Fee Structure", href: "/admin/finance/structure" },
      { label: "Invoice Runs", href: "/admin/finance/invoices" },
    ],
  },
  {
    heading: "Communication",
    items: [
      { label: "Notices", href: "/admin/notices", exact: true },
      { label: "Templates", href: "/admin/notices/templates" },
      { label: "Service Requests", href: "/admin/service-requests", exact: true },
      { label: "Request Types", href: "/admin/service-requests/types" },
    ],
  },
  {
    heading: "People & Access",
    items: [
      { label: "Staff", href: "/admin/staff" },
      { label: "Users", href: "/admin/users" },
      { label: "Roles", href: "/admin/roles" },
      { label: "Audit Log", href: "/admin/audit-log" },
    ],
  },
  {
    heading: "Settings",
    items: [
      { label: "School", href: "/admin/settings/school" },
      { label: "Integrations", href: "/admin/settings/integrations" },
      { label: "Academic Calendar", href: "/admin/settings/academic-calendar" },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/teacher", exact: true },
      { label: "My Classes", href: "/teacher/classes", exact: true },
      { label: "Attendance", href: "/teacher/attendance", exact: true },
      { label: "Attendance History", href: "/teacher/attendance/history" },
      { label: "Gradesheet", href: "/teacher/gradesheet", exact: true },
      { label: "Class Schedule", href: "/teacher/timetable" },
      { label: "Notices", href: "/teacher/notices" },
      { label: "My Payslips", href: "/teacher/profile" },
    ],
  },
];

export const PARENT_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/parent", exact: true },
      { label: "My Child", href: "/parent/child", exact: true },
      { label: "Gradesheet", href: "/parent/child/gradesheet" },
      { label: "Attendance", href: "/parent/child/attendance" },
      { label: "Fees & Payment", href: "/parent/fees", exact: true },
      { label: "Notices", href: "/parent/notices", exact: true },
      { label: "Certificates", href: "/parent/certificates" },
      { label: "Service Requests", href: "/parent/service-requests", exact: true },
      { label: "My Children", href: "/parent/children" },
    ],
  },
];

export const ACCOUNTS_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/accounts", exact: true },
      { label: "Fee Collection", href: "/accounts/fees", exact: true },
      { label: "Invoice Runs", href: "/accounts/fees/invoices" },
      { label: "Dues & Reminders", href: "/accounts/fees/reminders" },
      { label: "Instalment Plans", href: "/accounts/fees/instalments" },
      { label: "Payroll", href: "/accounts/payroll", exact: true },
      { label: "Salary Structure", href: "/accounts/payroll/structure" },
      { label: "bKash Reconciliation", href: "/accounts/bkash" },
      { label: "Reports", href: "/accounts/reports" },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  switch (role) {
    case "admin":
      return ADMIN_NAV;
    case "teacher":
      return TEACHER_NAV;
    case "parent":
      return PARENT_NAV;
    case "accountant":
      return ACCOUNTS_NAV;
  }
}
