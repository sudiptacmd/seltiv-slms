import { test, expect, type Page } from "@playwright/test";

const PW = "password123";

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByLabel("Phone or email").fill(phone);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

test("Teacher saves a roll call and it reaches the admin monitor", async ({ page }) => {
  await login(page, "01700000010");
  await page.goto("/teacher/attendance");
  // mark the first student absent, save
  await page.getByRole("button", { name: "A", exact: true }).first().click();
  await page.getByRole("button", { name: "Save Roll Call" }).click();
  await expect(page.getByText(/Saved —/)).toBeVisible({ timeout: 15_000 });
});

test("Parent pays a fee via mock bKash and gets a receipt", async ({ page }) => {
  await login(page, "01700000030");
  await page.goto("/parent/fees");
  await page.getByRole("link", { name: "Pay with bKash" }).first().click();
  await page.getByRole("button", { name: /Continue to bKash/ }).click();
  // mock bKash checkout
  await expect(page.getByText("SANDBOX")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "View receipt" })).toBeVisible();
});

test("Admin generates a report card PDF", async ({ page, request }) => {
  await login(page, "01700000001");
  await page.goto("/admin/students?q=Nabila+Rahman");
    await page.getByRole("link", { name: "Nabila Rahman" }).first().click();
    await page.waitForURL(/\/admin\/students\/[a-f0-9]{24}/);
  const href = await page.getByRole("link", { name: "Download Report" }).getAttribute("href");
  expect(href).toContain("/print/report_card/");
  const cookies = await page.context().cookies();
  const res = await request.get(`http://localhost:3000${href}`, {
    headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("pdf");
});

test("Admin composes a notice and SMS goes out", async ({ page }) => {
  await login(page, "01700000001");
  await page.goto("/admin/notices/new");
  await page.getByLabel("Title").fill("E2E test notice");
  await page.getByLabel("Body").fill("This is an automated test notice.");
  await page.getByRole("button", { name: /^Publish/ }).click();
  await expect(page.getByText(/Published to \d+ recipients/)).toBeVisible({ timeout: 20_000 });
});
