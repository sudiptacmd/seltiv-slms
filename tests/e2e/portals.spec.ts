import { test, expect, type Page } from "@playwright/test";

const PW = "password123";

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByLabel("Phone or email").fill(phone);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

test.describe("Admin portal", () => {
  test("dashboard shows the trust KPIs", async ({ page }) => {
    await login(page, "01700000001");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: "Trust Overview" })).toBeVisible();
    await expect(page.getByText("Students enrolled")).toBeVisible();
    await expect(page.getByText("Pass rate, last exam")).toBeVisible();
  });

  test("student directory opens a profile", async ({ page }) => {
    await login(page, "01700000001");
    await page.goto("/admin/students?q=Nabila+Rahman");
    await page.getByRole("link", { name: "Nabila Rahman" }).first().click();
    await page.waitForURL(/\/admin\/students\/[a-f0-9]{24}/);
    await expect(page.getByRole("heading", { name: "Nabila Rahman" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Academic progress" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attendance & fees" })).toBeVisible();
  });
});

test("Teacher can open the roll-call screen", async ({ page }) => {
  await login(page, "01700000010");
  await expect(page).toHaveURL(/\/teacher/);
  await page.goto("/teacher/attendance");
  await expect(page.getByRole("heading", { name: "Take roll call" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Roll Call" })).toBeVisible();
});

test("Accountant sees fee collection", async ({ page }) => {
  await login(page, "01700000020");
  await page.goto("/accounts/fees");
  await expect(page.getByRole("heading", { name: "Fee Collection" })).toBeVisible();
});

test.describe("Parent portal", () => {
  test("dashboard + gradesheet + fees", async ({ page }) => {
    await login(page, "01700000030");
    await expect(page).toHaveURL(/\/parent/);
    await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible();

    await page.goto("/parent/child/gradesheet");
    await expect(page.getByText(/Annual Examination|First Term/).first()).toBeVisible();

    await page.goto("/parent/fees");
    await expect(page.getByRole("heading", { name: "Fees & Payment" })).toBeVisible();
  });
});

test("Public admission application form loads", async ({ page }) => {
  await page.goto("/admissions/apply");
  await expect(page.getByRole("heading", { name: /Admission|closed/ })).toBeVisible();
});
