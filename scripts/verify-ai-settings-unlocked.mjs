import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const bundle = await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{httpBatchLink}from'@trpc/client';import superjson from'superjson';import{trpc}from'./client/src/lib/trpc';import AiManagement from'./client/src/features/admin/AiManagement';const q=new QueryClient();const c=trpc.createClient({links:[httpBatchLink({url:'/api/trpc',transformer:superjson})]});createRoot(document.getElementById('root')).render(<trpc.Provider client={c} queryClient={q}><QueryClientProvider client={q}><AiManagement view='settings'/></QueryClientProvider></trpc.Provider>);`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  loader: { ".css": "empty" },
  alias: { "@": path.resolve("client/src"), "@shared": path.resolve("shared") },
  define: { "process.env.NODE_ENV": '"production"' },
});
const server = createServer((req, res) => {
  res.setHeader(
    "Content-Type",
    req.url === "/bundle.js" ? "application/javascript" : "text/html",
  );
  res.end(
    req.url === "/bundle.js"
      ? bundle.outputFiles[0].text
      : '<html lang="ar" dir="rtl"><div id="root"></div><script type="module" src="/bundle.js"></script></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requestId = "00000000-0000-4000-8000-000000000001";
  await page.addInitScript(
    (id) => sessionStorage.setItem("selrs.ai.pending-probe.v1", id),
    requestId,
  );
  let profile = {
    workload: "medical.documentation",
    provider: "gemini",
    model: "gemini-3.8-flash",
    enabled: true,
    dailyRequests: 20,
    dailyTokens: 100000,
    maxConcurrent: 2,
  };
  let saves = 0;
  await page.route("**/api/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const raw = JSON.parse(route.request().postData() || "{}");
    const responses = url.pathname
      .split("/api/trpc/")[1]
      .split(",")
      .map((method, index) => {
        let data;
        if (method === "aiManagement.status") data = { enabled: true };
        else if (method === "aiManagement.profiles") data = [profile];
        else if (method === "aiManagement.readProbe")
          data = { state: "uncertain" };
        else if (method === "aiManagement.updateProfile") {
          saves++;
          profile = (raw[index] ?? raw).json;
          data = null;
        } else throw new Error(`Unexpected request ${method}`);
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
  await page
    .getByLabel("المهمة", { exact: true })
    .selectOption("medical.documentation");
  const tokens = page.getByLabel("الحد اليومي لتوكنات Gemini", { exact: true });
  await expect(tokens).toBeEnabled();
  await tokens.fill("120000");
  await page
    .getByRole("button", { name: "حفظ إعدادات المهمة", exact: true })
    .click();
  await expect(
    page.getByText(
      "تم حفظ إعدادات المهمة. الحدود الجديدة تسري على الطلبات التالية، ولا تلغي حجوزات أو طلبات سابقة.",
    ),
  ).toBeVisible();
  assert.equal(saves, 1);
  assert.equal(
    await page.evaluate(() =>
      sessionStorage.getItem("selrs.ai.pending-probe.v1"),
    ),
    requestId,
  );
  assert.equal(profile.dailyTokens, 120000);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: stale uncertain probe does not lock profile editing; synthetic save succeeds without clearing the probe or calling a provider.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
