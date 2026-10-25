import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });
const directory = "outputs/confirmation-log-ui";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const results = [];
try {
  for (const theme of ["light", "dark"])
    for (const width of [360, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.addInitScript(
        (theme) => localStorage.setItem("theme", theme),
        theme,
      );
      const page = await context.newPage();
      const errors = [],
        mutations = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let failure = false,
        empty = false,
        lastInput;
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (request.method() !== "GET") mutations.push(url.pathname);
        const methods = url.pathname.split("/api/trpc/")[1]?.split(",") || [];
        const inputs = JSON.parse(url.searchParams.get("input") || "{}");
        const responses = methods.map((method, index) => {
          let data = [];
          if (method === "auth.me")
            data = { id: 999999, role: "admin", name: "اختبار واجهة معزول" };
          if (method === "whatsappConfirmations.list") {
            lastInput = (inputs[index] ?? inputs).json;
            if (failure)
              return {
                error: {
                  json: {
                    message: "Synthetic unavailable log",
                    code: -32603,
                    data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                  },
                },
              };
            const states = ["accepted", "failed", "read"];
            let rows = states.map((state, i) => ({
              id: `00000000-0000-4000-8000-00000000000${i + 1}`,
              kind: i === 1 ? "operation_confirmed" : "booking_confirmed",
              patient_name: `حالة خيالية ${i + 1}`,
              recipient_phone: "201000000000",
              template_name: i === 1 ? "op_confirmation" : "exams_confirmation",
              language: "ar_EG",
              state,
              provider_message_id: `wamid.synthetic.${"x".repeat(130)}${i}`,
              error_code: i === 1 ? "131026" : null,
              error_details: i === 1 ? "مثال خيالي لعدم تسليم الرسالة" : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
            if (lastInput.kind)
              rows = rows.filter((r) => r.kind === lastInput.kind);
            if (lastInput.state)
              rows = rows.filter((r) => r.state === lastInput.state);
            data = {
              rows: empty ? [] : rows,
              total: empty ? 0 : 50,
              counts: empty
                ? []
                : states.map((state) => ({
                    state,
                    total: state === "read" ? 2 : 1,
                  })),
              unmatchedReceipts: empty
                ? []
                : [
                    {
                      provider_message_id: "wamid.earlier.synthetic",
                      recipient_phone: "201000000000",
                      state: "failed",
                      error_code: "131026",
                      error_details: "إشعار تدريبي سابق",
                      received_at: new Date().toISOString(),
                    },
                  ],
            };
          }
          return { result: { data: { json: data } } };
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.searchParams.has("batch") ? responses : responses[0],
          ),
        });
      });
      await page.goto("http://127.0.0.1:4000/admin-hub");
      await page.locator('a[href="/admin-hub/whatsapp-confirmations"]').click();
      const panel = page.getByRole("region", {
        name: "سجل رسائل التأكيد",
        exact: true,
      });
      await expect(
        panel.getByRole("heading", { name: "سجل رسائل التأكيد", exact: true }),
      ).toBeVisible();
      await expect(
        panel.getByRole("article").getByText("قبلتها Meta", { exact: true }),
      ).toBeVisible();
      await expect(
        panel.getByRole("article").getByText("تمت القراءة", { exact: true }),
      ).toBeVisible();
      await panel.getByRole("button", { name: "التالي", exact: true }).click();
      await expect.poll(() => lastInput.page).toBe(2);
      await panel.getByRole("button", { name: "السابق", exact: true }).click();
      await panel
        .getByLabel("نوع الرسالة", { exact: true })
        .selectOption("operation_confirmed");
      await panel
        .getByLabel("حالة الرسالة", { exact: true })
        .selectOption("failed");
      await expect(panel.getByRole("article")).toHaveCount(1);
      await panel.getByLabel("اسم أو رقم المريض", { exact: true }).fill("حالة");
      await panel.getByRole("button", { name: "بحث", exact: true }).click();
      await expect.poll(() => lastInput.search).toBe("حالة");
      await panel.getByText("معرّفات التتبع", { exact: true }).click();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: `${directory}/${theme}-${width}.png`,
        fullPage: true,
      });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      await panel
        .getByRole("button", { name: "مسح التصفية", exact: true })
        .click();
      failure = true;
      await panel
        .getByRole("button", { name: "تحديث السجل", exact: true })
        .click();
      await expect(panel.getByRole("alert")).toBeVisible();
      failure = false;
      empty = true;
      await panel
        .getByRole("button", { name: "إعادة المحاولة", exact: true })
        .click();
      await expect(panel.getByText(/لا توجد محاولات مطابقة/)).toBeVisible();
      assert.deepEqual(mutations, []);
      assert.deepEqual(errors, []);
      results.push({
        theme,
        width,
        adminNavigation: true,
        acceptedNotDelivered: true,
        filtersAndPagination: true,
        errorRecovery: true,
        emptyState: true,
        textResize200: true,
        noSendControls: true,
        network: "intercepted; synthetic log rows",
      });
      await context.close();
    }
  await writeFile(
    `${directory}/results.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
