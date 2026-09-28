import { test, type Page } from "@playwright/test";
import fs from "node:fs";

const OUT = "walkthrough-assets";
fs.mkdirSync(OUT, { recursive: true });
test.use({ viewport: { width: 1440, height: 900 } });

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByLabel("Phone or email").fill(phone);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}
async function capture(page: Page, name: string, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

test("walkthrough screens", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const role of [
    { phone: "01700000030", screens: [["parent-overview", "/parent"], ["parent-notices", "/parent/notices"], ["parent-fees", "/parent/fees"]] },
    { phone: "01700000010", screens: [["teacher-overview", "/teacher"], ["teacher-attendance", "/teacher/attendance"], ["teacher-gradesheet", "/teacher/gradesheet"]] },
    { phone: "01700000001", screens: [["admin-timetable", "/admin/academics/timetable"], ["admin-subjects", "/admin/academics/subjects"], ["admin-notices", "/admin/notices"], ["admin-users", "/admin/users"], ["admin-audit", "/admin/audit-log"], ["admin-teacher-attendance", "/admin/attendance/teachers"], ["admin-student-attendance", "/admin/attendance"]] },
    { phone: "01700000020", screens: [["finance-overview", "/accounts"], ["finance-ledger", "/accounts/fees"], ["finance-invoices", "/accounts/fees/invoices"], ["finance-bkash", "/accounts/bkash"], ["finance-payroll", "/accounts/payroll"], ["finance-reports", "/accounts/reports"]] },
  ] as const) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, role.phone);
    for (const [name, path] of role.screens) await capture(page, name, path);
    await context.close();
  }
});
