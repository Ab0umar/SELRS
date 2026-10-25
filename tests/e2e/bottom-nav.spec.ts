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

// The bottom nav is md:hidden and only renders below the md breakpoint.
test.describe("bottom nav mobile labels", () => {
  test.skip(
    !username || !password,
    "Set SMOKE_USER/SMOKE_PASS (or ADMIN_USER/ADMIN_PASS)",
  );

  test.use({ viewport: { width: 360, height: 800 } });

  test("should_show_a_visible_label_on_every_bottom_nav_tab_at_360px", async ({
    request,
    browser,
  }) => {
    const context = await getAuthenticatedContext(request, browser);
    // The helper creates its own context, so the fixture viewport from
    // test.use above does not apply — pass the mobile viewport explicitly.
    const page = await context.newPage();
    await page.setViewportSize({ width: 360, height: 800 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    const nav = page.locator("[data-app-bottom-nav]");
    await expect(nav).toBeVisible();

    // Staff tab sets only render after permissions load, so wait until at
    // least one tab joined the always-present "المزيد" (More) button.
    const navButtons = nav.locator("button");
    await expect
      .poll(async () => navButtons.count(), {
        message: "nav should render at least one tab plus the More button",
      })
      .toBeGreaterThanOrEqual(2);
    const buttonCount = await navButtons.count();

    // (a) No icon-only tab: every button must show a visible label span
    // with non-whitespace text.
    for (let i = 0; i < buttonCount; i += 1) {
      const labelSpan = navButtons.nth(i).locator("span").first();
      await expect(
        labelSpan,
        `nav button ${i} should render a visible label span`,
      ).toBeVisible();
      const text = (await labelSpan.innerText()) ?? "";
      expect(
        text.trim().length,
        `nav button ${i} label should be non-empty (got ${JSON.stringify(text)})`,
      ).toBeGreaterThan(0);
    }

    // (b) Admin users have a dashboard tab; its visible span must spell out
    // the accessible name (staff tab sets have no "dashboard" key, so this
    // check is conditional).
    const dashboardButton = nav.getByRole("button", {
      name: "لوحة التحكم",
    });
    if ((await dashboardButton.count()) > 0) {
      const dashboardLabel = dashboardButton.first().locator("span").first();
      await expect(dashboardLabel).toBeVisible();
      await expect(dashboardLabel).toContainText("لوحة التحكم");
    }

    // (c) Overflow invariants: the bar fits the 360px viewport and stays a
    // single row (all buttons share the same bounding top).
    const viewportWidth = page.viewportSize()?.width ?? 360;
    const navBox = await nav.boundingBox();
    expect(navBox, "nav should have a bounding box").not.toBeNull();
    expect(navBox!.x, "nav should start inside the viewport").toBeGreaterThanOrEqual(0);
    expect(
      navBox!.x + navBox!.width,
      "nav should end inside the viewport width",
    ).toBeLessThanOrEqual(viewportWidth);

    const firstTop = (await navButtons.first().boundingBox())?.y;
    expect(firstTop, "first nav button should have a bounding box").toBeDefined();
    for (let i = 0; i < buttonCount; i += 1) {
      const box = await navButtons.nth(i).boundingBox();
      expect(box, `nav button ${i} should have a bounding box`).not.toBeNull();
      expect(
        Math.abs((box?.y ?? Number.NaN) - (firstTop ?? Number.NaN)),
        `nav button ${i} should sit on the same row as the first button (bar must not wrap)`,
      ).toBeLessThan(1);
    }

    await context.close();
  });
});
