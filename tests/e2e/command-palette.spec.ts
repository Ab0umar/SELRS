import { expect, test } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:4000";
const username =
  process.env.SMOKE_USER ||
  process.env.ADMIN_USER ||
  process.env.E2E_USER ||
  "";
const password =
  process.env.SMOKE_PASS ||
  process.env.ADMIN_PASS ||
  process.env.E2E_PASS ||
  "";

async function getAuthenticatedContext(request: any, browser: any) {
  const candidates = Array.from(new Set([password, `${password}_e2e`])).filter(
    Boolean,
  );
  let activePassword = "";
  let res: any = null;
  for (const candidate of candidates) {
    const attempt = await request.post(`${baseURL}/api/auth/login`, {
      data: { username, password: candidate },
    });
    if (attempt.status() === 200) {
      activePassword = candidate;
      res = attempt;
      break;
    }
  }
  expect(
    Boolean(res),
    `login should return 200 (tried: ${candidates.join(", ")})`,
  ).toBe(true);
  const meRes = await request.get(`${baseURL}/api/auth/me`);
  if (meRes.status() === 200) {
    const me = await meRes.json();
    if (Boolean(me?.user?.mustChangePassword)) {
      const nextPassword =
        activePassword === password ? `${password}_e2e` : password;
      const changeRes = await request.post(
        `${baseURL}/api/trpc/auth.changePassword`,
        {
          data: {
            json: {
              currentPassword: activePassword,
              newPassword: nextPassword,
            },
          },
        },
      );
      expect(
        changeRes.status(),
        "forced changePassword should return 200",
      ).toBe(200);
      activePassword = nextPassword;
      res = await request.post(`${baseURL}/api/auth/login`, {
        data: { username, password: activePassword },
      });
      expect(
        res.status(),
        "login after forced password change should return 200",
      ).toBe(200);
    }
  }
  const storageState = await request.storageState();
  return await browser.newContext({
    baseURL,
    storageState,
  });
}

test.describe("command palette trigger", () => {
  test.skip(
    !username || !password,
    "Set SMOKE_USER/SMOKE_PASS (or ADMIN_USER/ADMIN_PASS)",
  );

  test("desktop header button shows the shortcut hint and opens the palette", async ({
    request,
    browser,
  }) => {
    const context = await getAuthenticatedContext(request, browser);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/patients");
    await expect(page).toHaveURL(/\/patients/);

    const trigger = page.getByRole("button", { name: "فتح لوحة البحث" });
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText("K");

    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByPlaceholder(/Search patients/),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await context.close();
  });

  test("mobile header button keeps a 44px touch target and opens the palette", async ({
    request,
    browser,
  }) => {
    const context = await getAuthenticatedContext(request, browser);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/patients");
    await expect(page).toHaveURL(/\/patients/);

    const trigger = page.getByRole("button", { name: "فتح لوحة البحث" });
    await expect(trigger).toBeVisible();
    const box = await trigger.boundingBox();
    expect(box, "trigger should report a bounding box").toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await trigger.click();
    await expect(
      page.getByRole("dialog").getByPlaceholder(/Search patients/),
    ).toBeVisible();
    await context.close();
  });

  test("Ctrl+K keyboard shortcut still opens the palette", async ({
    request,
    browser,
  }) => {
    const context = await getAuthenticatedContext(request, browser);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/patients");
    await expect(page).toHaveURL(/\/patients/);

    await page.keyboard.press("Control+k");
    await expect(
      page.getByRole("dialog").getByPlaceholder(/Search patients/),
    ).toBeVisible();
    await context.close();
  });
});
