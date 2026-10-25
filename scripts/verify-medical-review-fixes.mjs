import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import superjson from "superjson";

const baseUrl = process.env.MEDICAL_REVIEW_UI_URL ?? "http://127.0.0.1:4179";
const browser = await chromium.launch({ channel: "msedge" });
const releaseFollowupRefreshes = [];
let holdFollowupRefresh = false;
let syntheticFollowups = [];
try {
  const page = await browser.newPage();
  const errors = [];
  const saves = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Every API request is fulfilled locally; the running backend receives no writes.
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    if (methods.length === 0) return route.fulfill({ json: {} });
    const inputs = JSON.parse(
      url.searchParams.get("input") || request.postData() || "{}",
    );
    if (holdFollowupRefresh && methods.includes("medical.getFollowupSheets")) {
      await new Promise((resolve) => releaseFollowupRefreshes.push(resolve));
    }
    const responses = methods.map((method, index) => {
      const input = superjson.deserialize(inputs[index] ?? inputs);
      let data = request.method() === "POST" ? { success: true } : [];
      if (method === "auth.me")
        data = {
          id: 99,
          username: "test",
          name: "Synthetic admin",
          role: "admin",
          isActive: true,
        };
      if (method === "patient.getPatient" || method === "medical.getPatient") {
        const id = Number(input?.patientId ?? input ?? 100);
        data = {
          id,
          fullName: `Synthetic patient ${id}`,
          patientCode: `UI-${id}`,
          age: 40,
        };
      }
      if (
        [
          "medical.getSystemSetting",
          "medical.getPatientPageState",
          "medical.getMedicalHistoryByPatient",
          "medical.getExaminationChecklist",
        ].includes(method)
      )
        data = null;
      if (method === "medical.getNextMssqlPatientCode")
        data = { code: "UI-NEXT" };
      if (method === "medical.getSheetEntry") data = null;
      if (method === "medical.getVisitsByPatient")
        data = [
          { id: 1, patientId: 100, visitDate: "2026-01-01T12:00:00Z" },
          { id: 2, patientId: 100, visitDate: "2026-10-20T12:00:00Z" },
        ];
      if (method === "medical.getFollowupSheets")
        data =
          Number(input?.patientId) === 100
            ? [
                {
                  id: 1,
                  version: 1,
                  items: [
                    {
                      id: 101,
                      tableIndex: 0,
                      followupDate: "2026-03-15T12:00:00Z",
                      vaOD: "6/24",
                      notes: "SYNTHETIC-OLD",
                    },
                  ],
                },
              ]
            : [];
      if (method === "medical.getFollowupSheets" && input?.patientId === 300) {
        data = syntheticFollowups.length
          ? [{ id: 2, version: 1, items: syntheticFollowups }]
          : [];
      }
      if (method === "medical.createPatientFromExamination")
        data = { id: 100, patientCode: "UI-100" };
      if (method === "medical.saveExaminationForm")
        data = { success: true, examinationId: 55, visitId: 3 };
      if (method === "medical.saveFollowupSheet") {
        data = { success: true, sheetId: 1, version: 1 };
        if (input.patientId === 300) {
          for (const item of input.followupItems) {
            const existing = syntheticFollowups.find(
              (row) => row.id === item.itemId,
            );
            if (existing) Object.assign(existing, item);
            else
              syntheticFollowups.push({
                ...item,
                id: 900 + syntheticFollowups.length,
              });
          }
        }
      }
      if (request.method() === "POST") saves.push({ method, input });
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.has("batch") ? responses : responses[0],
      ),
    });
  });

  for (const sheetType of ["consultant", "specialist", "lasik"]) {
    await page.goto(`${baseUrl}/sheets/${sheetType}/100/followup`);
    await expect(
      page.locator('input[value="SYNTHETIC-OLD"]').first(),
    ).toBeVisible({ timeout: 60_000 });
    saves.length = 0;
    await page.getByRole("button", { name: "حفظ", exact: true }).click();
    await expect
      .poll(() =>
        saves.find((save) => save.method === "medical.saveFollowupSheet"),
      )
      .toBeTruthy();
    const saved = saves.find(
      (save) => save.method === "medical.saveFollowupSheet",
    );
    assert.equal(saved.input.patientId, 100);
    assert.equal(saved.input.followupItems[0].itemId, 101);
    await page.evaluate((nextPath) => {
      history.pushState(null, "", nextPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, `/sheets/${sheetType}/200/followup`);
    await expect(
      page.locator('input[value="Synthetic patient 200"]').first(),
    ).toBeVisible();
    assert.ok(
      !(
        await page
          .locator("input")
          .evaluateAll((inputs) => inputs.map((input) => input.value))
      ).includes("SYNTHETIC-OLD"),
    );
    console.log(
      `${sheetType}: saved item identity and patient-switch reset passed`,
    );
  }

  await page.goto(`${baseUrl}/examination/100`);
  await expect(page.locator("#visit-date-top")).toHaveValue("20/10/2026", {
    timeout: 60_000,
  });
  await page.locator("#visit-date-top").fill("03/10/2026");
  await page.locator("#visit-date-top").blur();
  await page
    .getByRole("tab", { name: "الأوتوريفراكشن / الإيرباف", exact: true })
    .click();
  await page.locator("#nurse-signature").fill("Synthetic nurse");
  saves.length = 0;
  await page.getByRole("button", { name: "حفظ البيانات", exact: true }).click();
  try {
    await expect
      .poll(() =>
        saves.find((save) => save.method === "medical.saveExaminationForm"),
      )
      .toBeTruthy();
  } catch (error) {
    console.error(
      JSON.stringify({
        methods: saves.map((save) => save.method),
        invalid: await page.locator("form :invalid").evaluateAll((inputs) =>
          inputs.map((input) => ({
            name: input.name,
            message: input.validationMessage,
          })),
        ),
        tail: (await page.locator("body").innerText()).slice(-1200),
        errors,
      }),
    );
    throw error;
  }
  for (const method of [
    "medical.createPatientFromExamination",
    "medical.saveExaminationForm",
  ]) {
    assert.equal(
      saves.find((save) => save.method === method)?.input.visitDate,
      "2026-10-03",
      method,
    );
  }
  console.log(
    "Examination: selected date reaches both patient registration and examination save",
  );
  for (const scoped of [true, false]) {
    await page.goto(
      `${baseUrl}/prescription/100${scoped ? "?visitDate=2026-10-20" : ""}`,
    );
    await expect(
      page.getByRole("button", { name: "إضافة دواء", exact: true }),
    ).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept("Synthetic medication"));
    await page.getByRole("button", { name: "إضافة دواء", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Medication name", exact: true }),
    ).toHaveValue("Synthetic medication");
    saves.length = 0;
    await page
      .getByRole("button", { name: "حفظ الروشتة", exact: true })
      .click();
    await expect
      .poll(() =>
        saves.find(
          (save) => save.method === "medical.createPrescriptionWithItems",
        ),
      )
      .toBeTruthy();
    assert.equal(
      saves.find(
        (save) => save.method === "medical.createPrescriptionWithItems",
      ).input.visitId,
      scoped ? 2 : undefined,
    );
  }
  console.log(
    "Prescription: explicit visit links correctly and standalone prescriptions stay supported",
  );
  for (const sheetType of ["consultant", "lasik"]) {
    syntheticFollowups = [];
    await page.goto(`${baseUrl}/sheets/${sheetType}/300/followup`);
    const saveButton = page.getByRole("button", {
      name: /^(حفظ|جاري الحفظ…)$/,
    });
    await expect(saveButton).toBeEnabled();
    const dateField = page.locator(".followup-record-title input").nth(1);
    await dateField.fill("25/10/2026");
    await dateField.blur();
    saves.length = 0;
    holdFollowupRefresh = true;
    await saveButton.click();
    try {
      await expect
        .poll(() => releaseFollowupRefreshes.length)
        .toBeGreaterThan(0);
      await expect(saveButton).toBeDisabled();
      assert.equal(
        saves.filter((save) => save.method === "medical.saveFollowupSheet")
          .length,
        1,
      );
    } finally {
      holdFollowupRefresh = false;
      for (const release of releaseFollowupRefreshes.splice(0)) release();
    }
    await expect(saveButton).toBeEnabled();
    saves.length = 0;
    await saveButton.click();
    await expect
      .poll(() =>
        saves.find((save) => save.method === "medical.saveFollowupSheet"),
      )
      .toBeTruthy();
    assert.equal(
      saves.find((save) => save.method === "medical.saveFollowupSheet").input
        .followupItems[0].itemId,
      900,
    );
    assert.equal(syntheticFollowups.length, 1);
    console.log(
      `${sheetType}: save stays locked until new followup IDs are loaded`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  for (const release of releaseFollowupRefreshes) release();
  await browser.close();
}
