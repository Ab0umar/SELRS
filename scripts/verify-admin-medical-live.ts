import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { chromium, expect } from "@playwright/test";
import { authService } from "../server/_core/auth";
import { revokeAuthSession } from "../server/db";
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
let sessionId: string | undefined;
try {
  const [users] = await connection.query<RowDataPacket[]>(
    "SELECT id,username,role,branch,authVersion FROM users WHERE role='admin' AND isActive=1 ORDER BY id LIMIT 1",
  );
  const user = users[0];
  assert.ok(user);
  const token = await authService.createSessionToken(
    user.id,
    user.username,
    user.role,
    user.branch,
    { expiresInMs: 300000, authVersion: user.authVersion },
  );
  sessionId = authService.verifyToken(token).jti;
  assert.ok(sessionId);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "app_session_id",
      value: token,
      url: "http://127.0.0.1:4000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  let blocked = 0;
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "GET") return route.continue();
    blocked++;
    await route.abort("blockedbyclient");
  });
  await page.goto("http://127.0.0.1:4000/admin-hub");
  await page.locator('a[href="/admin-hub/medical-assistant"]').click();
  const panel = page.getByRole("region", {
    name: "المساعد الطبي",
    exact: true,
  });
  await expect(
    panel.getByRole("heading", { name: "المساعد الطبي", exact: true }),
  ).toBeVisible();
  await panel
    .getByLabel("النص", { exact: true })
    .fill("نص خيالي لفحص الصفحة فقط");
  await panel.getByRole("button", { name: "تجهيز النص للمراجعة" }).click();
  await expect(
    panel.getByRole("button", { name: "إنشاء اقتراحات للمراجعة" }),
  ).toBeDisabled();
  assert.equal(blocked, 0);
  await mkdir("outputs/admin-medical-assistant", { recursive: true });
  await page.screenshot({
    path: "outputs/admin-medical-assistant/live-page.png",
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      success: true,
      route: "/admin-hub/medical-assistant",
      adminCard: true,
      consentRequired: true,
      noProviderRequest: true,
      noPatientSave: true,
    }),
  );
} finally {
  await browser.close();
  if (sessionId) await revokeAuthSession(sessionId);
  await connection.end();
}
process.exit(0);
