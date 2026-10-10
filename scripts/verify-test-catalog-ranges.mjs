import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const test = {
  id: 999999,
  name: "فحص اختبار معزول",
  type: "imaging",
  category: "",
  description: "",
  isActive: true,
  normalRange: "40 - 47",
  unit: "D",
  referenceRanges: null,
  noNormalRange: false,
};
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    for (const [type, tab] of [
      ["lab", "تحاليل"],
      ["imaging", "أشعة"],
      ["examination", "فحوصات"],
      ["other", "أخرى"],
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      const saves = [];
      let stored = { ...test, type };
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
        if (request.method() !== "GET") {
          assert.deepEqual(
            methods,
            ["medical.updateTest"],
            "No actual data writes are allowed",
          );
          const body = request.postDataJSON();
          const payload = (url.searchParams.has("batch") ? body["0"] : body)
            .json;
          assert.equal(payload.testId, test.id);
          saves.push(payload.updates);
          stored = { ...stored, ...payload.updates, normalRange: "", unit: "" };
        }
        const responses = methods.map((method) => ({
          result: {
            data: {
              json:
                method === "auth.me"
                  ? { id: 999999, role: "admin", name: "اختبار معزول" }
                  : method === "medical.getAllTests"
                    ? [stored]
                    : request.method() !== "GET"
                      ? { success: true }
                      : [],
            },
          },
        }));
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.searchParams.has("batch") ? responses : responses[0],
          ),
        });
      });
      await page.goto("http://127.0.0.1:5193/examinations/catalog");
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page
        .getByRole("button", { name: "تعديل الفحص", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("أقل طبيعي", { exact: true }).inputValue(),
        "40",
      );
      assert.equal(
        await page.getByLabel("أعلى طبيعي", { exact: true }).inputValue(),
        "47",
      );
      await page.getByLabel("اسم القياس / الفئة", { exact: true }).fill("K1");
      await page
        .getByRole("button", { name: "إضافة مدى طبيعي", exact: true })
        .click();
      await page
        .getByLabel("اسم القياس / الفئة", { exact: true })
        .nth(1)
        .fill("CCT");
      await page.getByLabel("أقل طبيعي", { exact: true }).nth(1).fill("500");
      await page.getByLabel("أعلى طبيعي", { exact: true }).nth(1).fill("600");
      await page.getByLabel("الوحدة", { exact: true }).nth(1).fill("µm");
      await page.getByRole("button", { name: "حفظ", exact: true }).click();
      await page.getByText("تم تحديث الفحص بنجاح", { exact: true }).waitFor();
      assert.deepEqual(saves[0].referenceRanges, [
        { name: "K1", min: "40", max: "47", text: "", unit: "D" },
        { name: "CCT", min: "500", max: "600", text: "", unit: "µm" },
      ]);
      await page
        .getByRole("button", { name: "تعديل الفحص", exact: true })
        .click();
      assert.equal(
        await page
          .getByLabel("اسم القياس / الفئة", { exact: true })
          .nth(1)
          .inputValue(),
        "CCT",
      );
      await page
        .getByRole("checkbox", { name: "لا ينطبق عليه مدى طبيعي", exact: true })
        .check();
      assert.equal(
        await page
          .getByLabel("أقل طبيعي", { exact: true })
          .first()
          .isDisabled(),
        true,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "إضافة مدى طبيعي", exact: true })
          .isDisabled(),
        true,
      );
      await page.getByRole("button", { name: "حفظ", exact: true }).click();
      await page.waitForFunction(() =>
        document
          .querySelector("tbody")
          ?.textContent?.includes("لا ينطبق عليه مدى طبيعي"),
      );
      assert.equal(saves[1].noNormalRange, true);
      assert.deepEqual(saves[1].referenceRanges, []);
      await page
        .getByRole("button", { name: "تعديل الفحص", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("checkbox", {
            name: "لا ينطبق عليه مدى طبيعي",
            exact: true,
          })
          .isChecked(),
        true,
      );
      await mkdir("output/test-catalog-verification", { recursive: true });
      await page.screenshot({
        path: `output/test-catalog-verification/${viewport.width}-${type}.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      console.log(
        `${viewport.width}px ${type}: named ranges, save/reopen, and no-normal-range passed`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
