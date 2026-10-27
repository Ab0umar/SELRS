import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const built = await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{httpBatchLink}from'@trpc/client';import superjson from'superjson';import{trpc}from'./client/src/lib/trpc';import MedicalAssistant from'./client/src/features/admin/MedicalAssistant';const q=new QueryClient({defaultOptions:{queries:{retry:false}}});const c=trpc.createClient({links:[httpBatchLink({url:'/api/trpc',transformer:superjson})]});createRoot(document.getElementById('root')).render(<trpc.Provider client={c} queryClient={q}><QueryClientProvider client={q}><MedicalAssistant/></QueryClientProvider></trpc.Provider>);`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  alias: { "@": path.resolve("client/src"), "@shared": path.resolve("shared") },
  define: { "process.env.NODE_ENV": '"production"', __FAST_BUILD__: "false" },
  plugins: [
    {
      name: "synthetic-recorder",
      setup(builder) {
        builder.onLoad({ filter: /hooks[\\/]useAuth\.ts$/ }, () => ({
          loader: "ts",
          contents: "export function useAuth(){return {user:{role:new URLSearchParams(location.search).get('role') || 'admin'}}}",
        }));
        builder.onLoad({ filter: /FieldDictation\.tsx$/ }, () => ({
          loader: "tsx",
          contents: `export default function Recorder(p){return <div role="dialog" aria-label="Synthetic recorder"><output aria-label="Recorder provider">{p.speechProvider}</output><output aria-label="Recorder duration">{p.maxRecordingMinutes}</output><output aria-label="Recorder diagnostics">{String(p.showDiagnostics)}</output><button onClick={()=>p.onTranscript({kind:'conversation',mode:p.mode,transcript:'نص تجريبي'})}>Finish synthetic</button><button onClick={p.onClose}>Close synthetic</button></div>}`,
        }));
      },
    },
  ],
});
const server = createServer((req, res) => {
  res.setHeader(
    "Content-Type",
    req.url === "/bundle.js" ? "application/javascript" : "text/html",
  );
  res.end(
    req.url === "/bundle.js"
      ? built.outputFiles[0].text
      : '<html lang="ar" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/bundle.js"></script></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  const errors = [];
  let saved = {
    speechProvider: "azure",
    maxRecordingMinutes: 8,
    showDiagnostics: true,
    processingModel: "manus:standard",
  };
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const methods = url.pathname.split("/api/trpc/")[1].split(",");
    const raw = JSON.parse(route.request().postData() || "{}");
    const responses = methods.map((method, index) => {
      assert.ok(
        [
          "medicalAssistant.providerOptions",
          "medicalAssistant.speechOptions",
          "medicalAssistant.settings",
          "medicalAssistant.saveSettings",
        ].includes(method),
      );
      if (method.endsWith("saveSettings")) saved = (raw[index] ?? raw).json;
      const data =
        method.endsWith("settings") || method.endsWith("saveSettings")
          ? saved
          : method.endsWith("speechOptions")
            ? {
                azure: { configured: true },
                gemini: { configured: true, clinicalEnabled: true },
              }
            : {
                gemini: {
                  configured: true,
                  clinicalEnabled: true,
                  model: "gemini-test",
                  models: [],
                },
              };
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.has("batch") ? responses : responses[0],
      ),
    });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const provider = page.getByLabel("مزوّد تحويل الصوت إلى نص", { exact: true });
  const consent = page.getByRole("checkbox").last();
  await expect(
    page.getByRole("button", { name: "تسجيل صوتي عبر Azure", exact: true }),
  ).toBeDisabled();
  await consent.check();
  await provider.selectOption("gemini");
  await expect(consent).not.toBeChecked();
  await page
    .getByLabel("الحد الأقصى لمدة التسجيل", { exact: true })
    .selectOption("3");
  await page.getByLabel("إظهار معلومات الاتصال والتسجيل").uncheck();
  await page
    .getByRole("button", { name: "حفظ الإعدادات لكل المستخدمين", exact: true })
    .click();
  await expect(
    page.getByText(
      "تم حفظ الإعداد المركزي لكل المستخدمين. التسجيلات الشغّالة لم تتغيّر.",
    ),
  ).toBeVisible();
  await page.getByLabel("النص", { exact: true }).fill("نص سابق");
  await consent.check();
  await page
    .getByRole("button", { name: "تسجيل صوتي عبر Gemini Live", exact: true })
    .click();
  await expect(page.getByLabel("Recorder provider")).toHaveText("gemini");
  await expect(page.getByLabel("Recorder duration")).toHaveText("3");
  await expect(page.getByLabel("Recorder diagnostics")).toHaveText("false");
  await page.getByRole("button", { name: "Finish synthetic" }).click();
  await expect(page.getByLabel("النص", { exact: true })).toHaveValue(
    "نص سابق\nنص تجريبي",
  );
  await provider.selectOption("azure");
  await page
    .getByRole("button", { name: "حفظ الإعدادات لكل المستخدمين", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "حفظ الإعدادات لكل المستخدمين",
      exact: true,
    }),
  ).toBeDisabled();
  await consent.check();
  await page
    .getByRole("button", { name: "تسجيل صوتي عبر Azure", exact: true })
    .click();
  await expect(page.getByLabel("Recorder provider")).toHaveText("azure");
  await page.getByRole("button", {name:"Close synthetic"}).click();
  await page.goto(`http://127.0.0.1:${server.address().port}/?role=doctor`);
  await expect(page.getByLabel("مزوّد تحويل الصوت إلى نص", {exact:true})).toBeDisabled();
  await expect(page.getByLabel("مزوّد تحويل الصوت إلى نص", {exact:true})).toHaveValue("azure");
  await expect(page.getByRole("button", {name:"حفظ الإعدادات لكل المستخدمين",exact:true})).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Gemini/Azure routing, duration, diagnostics, consent reset and transcript preservation. Synthetic recorder only; no external audio requests.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
