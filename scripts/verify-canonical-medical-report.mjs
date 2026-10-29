import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const bundle = await build({
  stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{httpBatchLink}from'@trpc/client';import superjson from'superjson';import{trpc}from'./client/src/lib/trpc';import Report from'./client/src/components/reports/PrintableMedicalReport';const q=new QueryClient({defaultOptions:{queries:{retry:false}}});const c=trpc.createClient({links:[httpBatchLink({url:'/api/trpc',transformer:superjson})]});createRoot(document.getElementById('root')).render(<trpc.Provider client={c} queryClient={q}><QueryClientProvider client={q}><Report initialPatientId={5} hideTopBarSearch/></QueryClientProvider></trpc.Provider>);`,loader:"tsx",resolveDir:process.cwd()},
  bundle:true,write:false,format:"esm",platform:"browser",jsx:"automatic",
  alias:{"@":path.resolve("client/src"),"@shared":path.resolve("shared")},
  define:{"process.env.NODE_ENV":'"production"',__FAST_BUILD__:"false"},
});
const server=createServer((req,res)=>{
  res.setHeader("Content-Type",req.url === "/bundle.js" ? "application/javascript" : "text/html");
  res.end(req.url === "/bundle.js" ? bundle.outputFiles[0].text : '<html><div id="root"></div><script type="module" src="/bundle.js"></script></html>');
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {headless:true,channel:"msedge"});
try {
  const page=await browser.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/api/trpc/**",async route=>{
    const methods=new URL(route.request().url()).pathname.split("/api/trpc/")[1].split(",");
    const responses=methods.map(method=>{
      let data;
      if(method === "patient.getPatient") data={id:5,fullName:"Synthetic Patient",gender:"male",serviceType:"lasik"};
      else if(method === "medical.getExaminationsByPatient") data=[{id:20,visitId:10,createdAt:"2026-03-15"}];
      else if(method === "medical.getMedicalReportsByPatient") data=[{id:30,visitId:10,diagnosis:"SYNTHETIC VERIFIED DIAGNOSIS",recommendations:"SYNTHETIC VERIFIED FOLLOWUP"}];
      else if(method === "medical.getGlassesRecordsByPatient") data=[{id:1,examinationId:99,sOD:"-9"},{id:2,examinationId:20,sOD:"-1"}];
      else if(method === "medical.getAutorefractometryByPatient") data=[];
      else if(method === "medical.getSurgeriesByPatient") data=[];
      else throw new Error(`Unexpected request: ${method}`);
      return {result:{data:{json:data}}};
    });
    await route.fulfill({contentType:"application/json",body:JSON.stringify(responses)});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await expect(page.locator('textarea').filter({hasText:"SYNTHETIC VERIFIED DIAGNOSIS"}).first()).toBeVisible();
  await page.getByRole("checkbox",{name:"إضافة كارت النظارة"}).check();
  const values=await page.locator("input,textarea").evaluateAll(fields=>fields.map(field=>field.value));
  assert(values.includes("-1.00"),`Report must use the selected examination's refraction: ${JSON.stringify(values)}`);
  assert(!values.includes("-9.00"),"Another examination must not leak into the report");
  const text=await page.locator("body").innerText();
  assert(!/Femto-LASIK was performed|Custom PRK was performed|Postoperative improvement|myopic astigmatism/.test(text+values.join("\n")),"Report must not invent clinical facts");
  assert.deepEqual(errors,[]);
  console.log("PASS: report uses canonical diagnosis and matching examination; no fabricated diagnosis, operation, or recovery. Synthetic data only.");
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
