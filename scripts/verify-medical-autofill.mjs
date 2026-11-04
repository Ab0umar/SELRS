import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
const bundle = await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{httpBatchLink}from'@trpc/client';import superjson from'superjson';import{trpc}from'./client/src/lib/trpc';import ProposalReview from'./client/src/components/medical-assistant/ProposalReview';import{AssistantFieldsProvider}from'./client/src/components/medical-assistant/AssistantFields';function Fixture(){const[values,setValues]=useState({complaint:'موجود',symptoms:'',diagnosis:'',history:'',plan:'',decision:''});const[rx,setRx]=useState({ids:[],details:{}});const[testIds,setTestIds]=useState([]);const[manualTests,setManualTests]=useState([]);const[saved,setSaved]=useState(null);return <AssistantFieldsProvider patientId={1} onSaveDraft={async()=>{setSaved({values,rx,testIds,manualTests})}} testsDraft={{manualItems:manualTests,appendManual:item=>setManualTests(old=>[...old,item]),removeManual:name=>setManualTests(old=>old.filter(item=>item.testName!==name)),catalog:[{id:20,name:'OCT Macula',type:'examination'},{id:21,name:'CBC',type:'lab'},{id:22,name:'Alternative lab',type:'lab'},{id:23,name:'OCT Nerve',type:'examination'}],ids:testIds,disabled:false,append:ids=>setTestIds(old=>[...new Set([...old,...ids])]),remove:ids=>setTestIds(old=>old.filter(id=>!ids.includes(id)))}} draftBinding={{values,destinations:{complaints:'complaint',symptoms:'symptoms',diagnosis:'diagnosis',history:'history',treatment:'plan',decision:'decision'},change:patch=>setValues(old=>({...old,...patch}))}} prescriptionDraft={{templates:[],medications:[{id:10,name:'TOBRIN 0.3% EYE DROPS 5 ML'}],draft:rx,disabled:false,change:setRx}}><ProposalReview input={{kind:'conversation',mode:'dictation',transcript:'صداع وزغللة الدكتور قال Cataract وضيف TOBRIN قطرة مرتين'}}/><output aria-label='Draft values'>{JSON.stringify(values)}</output><output aria-label='Draft prescription'>{JSON.stringify(rx)}</output><output aria-label='Saved visit'>{JSON.stringify(saved)}</output><output aria-label='Manual tests'>{JSON.stringify(manualTests)}</output><output aria-label='Tests'>{JSON.stringify(testIds)}</output></AssistantFieldsProvider>}const q=new QueryClient();const c=trpc.createClient({links:[httpBatchLink({url:'/api/trpc',transformer:superjson})]});createRoot(document.getElementById('root')).render(<trpc.Provider client={c} queryClient={q}><QueryClientProvider client={q}><Fixture/></QueryClientProvider></trpc.Provider>);`,
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
});
const server = createServer((req, res) => {
  res.setHeader(
    "Content-Type",
    req.url === "/bundle.js" ? "application/javascript" : "text/html",
  );
  res.end(
    req.url === "/bundle.js"
      ? bundle.outputFiles[0].text
      : '<html lang="ar"><div id="root"></div><script type="module" src="/bundle.js"></script></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  const errors = [];
  let failExtraction = false;
  let unknownDiagnosis = false;
  let starts = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const responses = url.pathname
      .split("/api/trpc/")[1]
      .split(",")
      .map((method) => {
        let data;
        if (method.endsWith("providerOptions"))
          data = {
            gemini: { clinicalEnabled: true, configured: true },
            managementEnabled: false,
          };
        else if (method.endsWith("getAllDiseases"))
          data = unknownDiagnosis ? [] : [{ name: "Cataract" }];
        else if (method.endsWith("settings"))
          data = { processingModel: "manus:standard" };
        else if (method.endsWith("startProposals")) {
          starts++;
          data = { jobId: "00000000-0000-4000-8000-000000000001" };
        } else if (method.endsWith("readProposals"))
          data = failExtraction
            ? {
                status: "failed",
                message: "Synthetic timeout; transcript preserved.",
              }
            : {
                status: "complete",
                result: {
                  warnings: [],
                  proposals: [
                    {
                      field: "history",
                      text: "Diabetes for ten years",
                      speaker: "patient",
                      sources: ["Synthetic history"],
                    },
                    {
                      field: "imaging",
                      text: "OCT\nOCT Macula",
                      speaker: "doctor",
                      sources: ["Synthetic imaging"],
                    },
                    {
                      field: "labs",
                      text: "CBC\nUnresolved test\nUncatalogued scan",
                      speaker: "doctor",
                      sources: ["Synthetic labs"],
                    },
                    {
                      field: "decision",
                      text: "Review in one week",
                      speaker: "doctor",
                      sources: ["Synthetic decision"],
                    },
                    {
                      field: "complaints",
                      text: "صداع",
                      speaker: "patient",
                      sources: ["صداع"],
                    },
                    {
                      field: "symptoms",
                      text: "زغللة",
                      speaker: "patient",
                      sources: ["زغللة"],
                    },
                    {
                      field: "diagnosis",
                      text: "Cataract",
                      speaker: "doctor",
                      sources: ["Cataract"],
                    },
                    {
                      field: "treatment",
                      text: "TOBRIN قطرة مرتين",
                      speaker: "doctor",
                      sources: ["TOBRIN قطرة مرتين"],
                      medications: [
                        {
                          name: "Rare drops",
                          source: "Rare drops",
                          dosage: "",
                          frequency: "",
                          duration: "",
                          instructions: "",
                        },
                        {
                          name: "TOBRIN",
                          source: "TOBRIN قطرة مرتين",
                          dosage: "قطرة",
                          frequency: "مرتين",
                          duration: "",
                          instructions: "",
                        },
                      ],
                    },
                  ],
                },
              };
        else throw new Error(`Unexpected API ${method}`);
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
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Generate proposals", exact: true })
    .click();
  await expect(page.getByLabel("Draft values")).toContainText("موجود\\nصداع");
  await expect(page.getByLabel("Draft values")).toContainText("Cataract");
  assert.equal(
    await page.locator("textarea[data-medical-proposals]").count(),
    0,
  );
  await expect(
    page.getByRole("button", { name: "Append to open form" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "اختيار TOBRIN 0.3% EYE DROPS 5 ML",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "اختيار TOBRIN 0.3% EYE DROPS 5 ML",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Draft prescription")).toContainText(
    '"ids":[10]',
  );
  await expect(page.getByLabel("Draft prescription")).toContainText(
    '"frequency":"مرتين"',
  );
  await expect(page.getByLabel("Draft values")).toContainText(
    "Diabetes for ten years",
  );
  await expect(page.getByLabel("Draft values")).toContainText(
    "Review in one week",
  );
  await expect(page.getByLabel("Tests", { exact: true })).toContainText("20");
  await expect(page.getByLabel("Tests", { exact: true })).toContainText("21");
  await expect(page.getByLabel("Tests", { exact: true })).not.toContainText(
    "22",
  );
  await page
    .getByLabel("اختيار فحص: Unresolved test", { exact: true })
    .selectOption("22");
  await expect(page.getByLabel("Tests", { exact: true })).toContainText("22");

  await expect(page.getByLabel("اختيار فحص: OCT", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Tests", { exact: true })).not.toContainText(
    "23",
  );
  await page.getByLabel("اختيار فحص: OCT", { exact: true }).selectOption("23");
  await expect(page.getByLabel("Manual tests")).toHaveText("[]");
  await page
    .getByRole("button", {
      name: "تأكيد «Uncatalogued scan» وإضافته للطلب بدون إضافته للكتالوج",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Manual tests")).toContainText(
    '"testName":"Uncatalogued scan"',
  );
  await expect(page.getByLabel("Draft prescription")).not.toContainText(
    "Rare drops",
  );
  await page
    .getByRole("button", {
      name: "تأكيد «Rare drops» وإضافته للروشتة بدون إضافته للكتالوج",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Draft prescription")).toContainText(
    '"medicationName":"Rare drops"',
  );
  await expect(page.getByLabel("Draft prescription")).toContainText(
    '"catalogConfirmed":true',
  );
  await expect(page.getByLabel("Saved visit")).toHaveText("null");
  await page
    .getByRole("button", { name: "حفظ الزيارة بعد المراجعة", exact: true })
    .click();
  await expect(page.getByLabel("Saved visit")).toContainText(
    "Diabetes for ten years",
  );
  await expect(page.getByLabel("Saved visit")).toContainText('"ids":[10]');
  await expect(page.getByLabel("Saved visit")).toContainText(
    '"testIds":[20,21,22,23]',
  );
  await page
    .getByLabel("Proposal: diagnosis", { exact: true })
    .fill("Cataract reviewed");
  await expect(
    page.getByRole("button", { name: "حفظ الزيارة بعد المراجعة", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "تأكيد التشخيص وإضافته للمسودة بدون إضافته للكتالوج",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Draft values")).toContainText(
    "Cataract reviewed",
  );
  await page
    .getByRole("button", { name: "حفظ الزيارة بعد المراجعة", exact: true })
    .click();
  await expect(page.getByLabel("Saved visit")).toContainText(
    "Cataract reviewed",
  );
  await page
    .getByRole("button", { name: "تراجع عن تعبئة الحقول", exact: true })
    .click();
  await expect(page.getByLabel("Draft values")).toHaveText(
    '{"complaint":"موجود","symptoms":"","diagnosis":"","history":"","plan":"","decision":""}',
  );
  assert.deepEqual(errors, []);
  failExtraction = true;
  await page.reload();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Generate proposals", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Synthetic timeout");
  assert.equal(starts, 2);
  await page
    .getByRole("button", {
      name: "تجهيز محاولة جديدة (قد تُحتسب تكلفة جديدة)",
      exact: true,
    })
    .click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Generate proposals", exact: true }),
  ).toBeDisabled();
  assert.equal(starts, 2);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Generate proposals", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Synthetic timeout");
  assert.equal(starts, 3);
  failExtraction = false;
  unknownDiagnosis = true;
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    await page.reload();
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Generate proposals", exact: true })
      .click();
    const confirm = page.getByRole("button", {
      name: "تأكيد التشخيص وإضافته للمسودة بدون إضافته للكتالوج",
      exact: true,
    });
    await expect(confirm).toBeEnabled();
    await expect(page.getByLabel("Draft values")).not.toContainText("Cataract");
    await expect(
      page.getByRole("button", {
        name: "حفظ الزيارة بعد المراجعة",
        exact: true,
      }),
    ).toBeDisabled();
    await confirm.click();
    await expect(page.getByLabel("Draft values")).toContainText("Cataract");
    await expect(page.getByLabel("Saved visit")).toHaveText("null");
  }
  console.log(
    "PASS: full narrative, medication and investigation draft transfer, explicit save, edited proposals and undo; terminal failure requires explicit fresh consent before resubmission. No clinical save or provider calls.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
