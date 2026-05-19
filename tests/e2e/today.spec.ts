import { expect, test } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:4000";
const username = process.env.SMOKE_USER || process.env.ADMIN_USER || process.env.E2E_USER || "";
const password = process.env.SMOKE_PASS || process.env.ADMIN_PASS || process.env.E2E_PASS || "";

async function loginAsAdmin(request: any) {
  const candidates = Array.from(new Set([password, `${password}_e2e`])).filter(Boolean);
  let loggedIn = false;
  for (const candidate of candidates) {
    const res = await request.post(`${baseURL}/api/auth/login`, {
      data: { username, password: candidate },
    });
    if (res.status() === 200) {
      loggedIn = true;
      break;
    }
  }
  expect(loggedIn, `login should return 200 (tried: ${candidates.join(", ")})`).toBe(true);
}

test.describe("today operations board", () => {
  test.skip(!username || !password, "Set SMOKE_USER/SMOKE_PASS (or ADMIN_USER/ADMIN_PASS)");

  test("shows the queue-first board and secondary quick actions", async ({ request, browser }) => {
    await loginAsAdmin(request);
    const storageState = await request.storageState();
    const context = await browser.newContext({
      baseURL,
      storageState,
      viewport: { width: 1440, height: 1200 },
    });
    const page = await context.newPage();

    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "مرضى اليوم" })).toBeVisible();
    await expect(page.getByRole("button", { name: /تسجيل مريض/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /إجراءات سريعة/ })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole("button", { name: "تسجيل", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /معالج/ })).toBeVisible();
    await expect(page.getByText(/لا يوجد مرضى في هذه الفئة|لا توجد حجوزات لهذا التاريخ/)).toBeVisible();

    await context.close();
  });
});
