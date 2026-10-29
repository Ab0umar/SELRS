import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const output = "outputs/equipment-library-ui";
await fs.mkdir(output, { recursive: true });
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
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const assignments = {
        center: {
          pentacam: null as number | null,
          "slit-lamp": null as number | null,
        },
        doctor: {
          pentacam: null as number | null,
          "slit-lamp": null as number | null,
        },
      };
      const calls: Record<string, unknown>[] = [];
      await page.route("**/api/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (!url.pathname.includes("/api/trpc/"))
          return route.fulfill({ contentType: "application/json", body: "{}" });
        const methods = url.pathname.split("/api/trpc/")[1].split(",");
        const raw =
          request.method() === "GET"
            ? JSON.parse(url.searchParams.get("input") || "{}")
            : request.postDataJSON();
        const replies = methods.map((method, index) => {
          const input = raw?.[index]?.json ?? raw?.json ?? {};
          let data: unknown = [];
          if (method === "auth.me")
            data = { id: 99999, name: "اختبار مكتبة الأجهزة", role: "admin" };
          if (method === "aiManagement.status") data = { enabled: true };
          if (method === "marketing.getBrandProfile") data = null;
          if (method === "marketing.listReferenceDesigns") {
            const id = input.pageRole === "doctor" ? 202 : 101;
            data = [
              {
                id,
                fileUrl: "/center-logo.png",
                originalName: `device-photo-${id}-original-reference-very-long-file-name.jpg`,
                analysisStatus: "analyzed",
              },
            ];
          }
          if (method === "marketing.equipmentReferences")
            data = assignments[input.pageRole as keyof typeof assignments];
          if (request.method() !== "GET") {
            assert.equal(
              method,
              "marketing.setEquipmentReference",
              "Unexpected mutation",
            );
            calls.push(input);
            const role = input.pageRole as keyof typeof assignments;
            const kind = input.kind as "pentacam" | "slit-lamp";
            assignments[role][kind] = input.referenceId;
            data = assignments[role];
          }
          return { result: { data: { json: data } } };
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.searchParams.has("batch") ? replies : replies[0],
          ),
        });
      });
      await page.goto(
        `${process.env.AI_UI_BASE_URL || "http://127.0.0.1:5178"}/ai/marketing/brand`,
      );
      const section = page.getByRole("region", {
        name: "صور الأجهزة الحقيقية",
      });
      const photo = section.getByLabel("الصورة الأصلية");
      await expect(photo).toHaveValue("");
      await photo.selectOption("101");
      await section
        .getByRole("button", { name: "حفظ صورة الجهاز", exact: true })
        .click();
      await expect(section.getByRole("status")).toContainText("تم حفظ");
      await page
        .getByRole("button", { name: "هوية الدكتور", exact: true })
        .click();
      await expect(photo).toHaveValue("");
      await expect(photo.locator("option[value='101']")).toHaveCount(0);
      await photo.selectOption("202");
      await section
        .getByRole("button", { name: "حفظ صورة الجهاز", exact: true })
        .click();
      await expect(section.getByRole("status")).toContainText("تم حفظ");
      await page
        .getByRole("button", { name: "هوية المركز", exact: true })
        .click();
      await expect(photo).toHaveValue("101");
      assert.deepEqual(calls, [
        { pageRole: "center", kind: "pentacam", referenceId: 101 },
        { pageRole: "doctor", kind: "pentacam", referenceId: 202 },
      ]);
      assert.deepEqual(errors, []);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme}/${width}: overflow`,
      );
      await section.screenshot({ path: `${output}/${theme}-${width}.png` });
      results.push({
        theme,
        width,
        pageIsolation: true,
        saveAndRestore: true,
        noProviderRequests: true,
        errors,
      });
      await context.close();
    }
  await fs.writeFile(
    `${output}/results.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
