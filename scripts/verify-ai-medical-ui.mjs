import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });
const directory = "outputs/ai-medical-ui";
await mkdir(directory, { recursive: true });
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{httpBatchLink}from'@trpc/client';import superjson from'superjson';import{trpc}from'./client/src/lib/trpc';import ProposalReview from'./client/src/components/medical-assistant/ProposalReview';const q=new QueryClient({defaultOptions:{queries:{retry:false}}});const c=trpc.createClient({links:[httpBatchLink({url:'/api/trpc',transformer:superjson})]});createRoot(document.getElementById('root')).render(<trpc.Provider client={c} queryClient={q}><QueryClientProvider client={q}><main className='mx-auto max-w-2xl p-4'><p>Isolated synthetic component test</p><ProposalReview input={{kind:'field',label:'Complaints',transcript:'صداع من أسبوعين'}} onApplyField={text=>document.getElementById('applied').textContent=text??''}/><output id='applied' aria-label='Applied synthetic text'/></main></QueryClientProvider></trpc.Provider>);`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  alias: { "@": path.resolve("client/src"), "@shared": path.resolve("shared") },
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"production"', __FAST_BUILD__: "false" },
});
const assets = await readdir("dist/public/assets");
const css = (
  await Promise.all(
    assets
      .filter((name) =>
        /^(App-|web-|design-system-|spacing-scale-|app-surfaces-).*\.css$/.test(
          name,
        ),
      )
      .map((name) => readFile(path.join("dist/public/assets", name), "utf8")),
  )
).join("\n");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "application/javascript");
    return res.end(bundle.outputFiles[0].text);
  }
  if (req.url === "/style.css") {
    res.setHeader("Content-Type", "text/css");
    return res.end(css);
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html lang="ar" dir="rtl"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
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
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let starts = 0,
        reads = 0;
      let engine;
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        const methods = url.pathname.split("/api/trpc/")[1].split(",");
        const raw =
          request.method() === "GET"
            ? JSON.parse(url.searchParams.get("input") || "{}")
            : JSON.parse(request.postData() || "{}");
        const responses = methods.map((method, index) => {
          const input = (raw[index] ?? raw).json;
          let data;
          if (method === "medicalAssistant.providerOptions")
            data = {
              defaultProvider: "manus",
              central: { enabled: true, model: "lite" },
              gemini: { clinicalEnabled: false },
            };
          else if (method === "medicalAssistant.startProposals") {
            starts++;
            engine = input.engine;
            assert.equal(input.consentConfirmed, true);
            data = { jobId: "00000000-0000-4000-8000-000000000001" };
          } else if (method === "medicalAssistant.readProposals") {
            reads++;
            if (reads === 1)
              return {
                error: {
                  json: {
                    message: "Synthetic status connection failure",
                    code: -32603,
                    data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                  },
                },
              };
            data = {
              status: "complete",
              result: {
                proposals: [
                  {
                    field: "field",
                    text: "صداع من أسبوعين",
                    sources: ["صداع من أسبوعين"],
                    speaker: "uncertain",
                  },
                ],
                warnings: ["Synthetic doctor review required"],
              },
            };
          } else throw new Error(`Unexpected API ${method}`);
          return { result: { data: { json: data } } };
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.searchParams.has("batch") ? responses : responses[0],
          ),
        });
      });
      await page.goto(base);
      await page.evaluate(
        (theme) =>
          document.documentElement.classList.toggle("dark", theme === "dark"),
        theme,
      );
      const panel = page.getByRole("region", { name: "AI proposal review" });
      const selector = panel.getByLabel("المساعد والموديل");
      await expect(selector).toHaveValue("manus:lite");
      const consent = panel.getByRole("checkbox");
      const generate = panel.getByRole("button", {
        name: "Generate proposals",
        exact: true,
      });
      await expect(generate).toBeDisabled();
      await consent.check();
      await selector.selectOption("manus:max");
      await expect(consent).not.toBeChecked();
      await consent.check();
      await generate.click();
      await expect(
        panel.getByRole("button", { name: "Check same task again" }),
      ).toBeVisible();
      await panel
        .getByRole("button", { name: "Check same task again" })
        .click();
      await expect(panel.getByLabel("Proposal: field")).toBeVisible();
      assert.equal(starts, 1);
      assert.equal(engine, "central");
      await expect(page.getByLabel("Applied synthetic text")).toHaveText("");
      await panel.getByText("Transcript evidence", { exact: true }).click();
      await panel.getByLabel("Proposal: field").fill("نص خيالي راجعه الطبيب");
      await panel
        .getByRole("button", { name: "Approve proposal for this field" })
        .click();
      await expect(page.getByLabel("Applied synthetic text")).toHaveText(
        "نص خيالي راجعه الطبيب",
      );
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
      assert.deepEqual(errors, []);
      results.push({
        theme,
        width,
        currentDefault: true,
        consentReset: true,
        centralExplicit: true,
        readRetryWithoutCreate: true,
        manualApply: true,
        textResize200: true,
        overflow: false,
        network: "intercepted; synthetic component only",
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
  await new Promise((resolve) => server.close(resolve));
}
