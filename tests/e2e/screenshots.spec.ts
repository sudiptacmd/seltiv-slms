import { test, type Page } from "@playwright/test";
import fs from "node:fs";

const PW = "password123";
const OUT = "screenshots";
fs.mkdirSync(OUT, { recursive: true });

test.use({ viewport: { width: 1440, height: 900 } });

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByLabel("Phone or email").fill(phone);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

async function shots(page: Page, entries: [string, string][]) {
  for (const [name, path] of entries) {
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  }
}

test("public", async ({ page }) => {
  await shots(page, [
    ["00-login", "/login"],
    ["09-admissions-apply", "/admissions/apply"],
  ]);
});

test("admin screens", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, "01700000001");
  await shots(page, [
    ["01-admin-dashboard", "/admin"],
    ["02-admin-students", "/admin/students"],
    ["04-admin-admissions", "/admin/admissions"],
    ["05-admin-exams", "/admin/exams"],
    ["06-admin-finance", "/admin/finance"],
    ["07-admin-notices", "/admin/notices"],
    ["08-admin-attendance", "/admin/attendance"],
    ["0a-admin-timetable", "/admin/academics/timetable"],
    ["0b-admin-audit", "/admin/audit-log"],
  ]);
  await page.goto("/admin/students?q=Nabila+Rahman");
  await page.getByRole("link", { name: "Nabila Rahman" }).first().click();
  await page.waitForURL(/\/admin\/students\/[a-f0-9]{24}/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-admin-student-profile.png`, fullPage: true });
});

test("teacher screens", async ({ page }) => {
  await login(page, "01700000010");
  await shots(page, [
    ["10-teacher-dashboard", "/teacher"],
    ["11-teacher-rollcall", "/teacher/attendance"],
    ["12-teacher-gradesheet", "/teacher/gradesheet"],
    ["13-teacher-timetable", "/teacher/timetable"],
  ]);
});

test("parent screens", async ({ page }) => {
  await login(page, "01700000030");
  await shots(page, [
    ["20-parent-dashboard", "/parent"],
    ["21-parent-child", "/parent/child"],
    ["22-parent-gradesheet", "/parent/child/gradesheet"],
    ["23-parent-attendance", "/parent/child/attendance"],
    ["24-parent-fees", "/parent/fees"],
    ["25-parent-service-requests", "/parent/service-requests"],
  ]);
});

test("accounts screens", async ({ page }) => {
  await login(page, "01700000020");
  await shots(page, [
    ["30-accounts-dashboard", "/accounts"],
    ["31-accounts-fees", "/accounts/fees"],
    ["32-accounts-payroll", "/accounts/payroll"],
    ["33-accounts-bkash", "/accounts/bkash"],
    ["34-accounts-reports", "/accounts/reports"],
  ]);
});
