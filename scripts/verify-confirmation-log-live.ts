import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { chromium, expect } from "@playwright/test";
import { authService } from "../server/_core/auth";
import { revokeAuthSession } from "../server/db";
const base = "http://127.0.0.1:4000";
const endpoint = `${base}/api/trpc/whatsappConfirmations.list?input=${encodeURIComponent(JSON.stringify({ json: { page: 1, search: "" } }))}`;
assert.equal(
  (await fetch(endpoint)).status,
  401,
  "The confirmation log router is not loaded; restart SRV100 first",
);
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const sessions: string[] = [];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
try {
  async function session(role: string) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT id,username,role,branch,authVersion FROM users WHERE role=? AND isActive=1 ORDER BY id LIMIT 1",
      [role],
    );
    if (!rows[0]) return;
    const u = rows[0];
    const token = await authService.createSessionToken(
      u.id,
      u.username,
      u.role,
      u.branch,
      { expiresInMs: 300000, authVersion: u.authVersion },
    );
    const id = authService.verifyToken(token).jti;
    assert.ok(id);
    sessions.push(id);
    return token;
  }
  const token = await session("admin");
  assert.ok(token);
  const doctor = await session("doctor");
  if (doctor)
    assert.equal(
      (
        await fetch(endpoint, {
          headers: { Authorization: `Bearer ${doctor}` },
        })
      ).status,
      403,
    );
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const envelope = await response.json();
  const data = envelope.result.data.json;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "app_session_id",
      value: token,
      url: base,
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
  await page.goto(`${base}/admin-hub`);
  await page.locator('a[href="/admin-hub/whatsapp-confirmations"]').click();
  const panel = page.getByRole("region", {
    name: "سجل رسائل التأكيد",
    exact: true,
  });
  await expect(
    panel.getByRole("heading", { name: "سجل رسائل التأكيد", exact: true }),
  ).toBeVisible();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  assert.equal(blocked, 0);
  await mkdir("outputs/booking-whatsapp-diagnostic", { recursive: true });
  const result = {
    ok: true,
    adminPage: true,
    nonAdminRejected: Boolean(doctor),
    noMessagesSent: true,
    total: data.total,
    states: data.counts,
    failureCodes: [
      ...new Set(
        data.rows
          .filter((row: { state: string }) => row.state === "failed")
          .map((row: { error_code: string }) => row.error_code),
      ),
    ],
    unmatchedReceiptStates: data.unmatchedReceipts.map(
      (row: { state: string; error_code: string }) => ({
        state: row.state,
        errorCode: row.error_code,
      }),
    ),
  };
  await writeFile(
    "outputs/booking-whatsapp-diagnostic/live.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  for (const id of sessions) await revokeAuthSession(id);
  await connection.end();
}
process.exit(0);
