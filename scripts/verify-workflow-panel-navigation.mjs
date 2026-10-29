import assert from "node:assert/strict";
import {createServer} from "node:http";
import path from "node:path";
import {build} from "esbuild";
import {chromium,expect} from "@playwright/test";

const bundle=await build({
  stdin:{contents:`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{httpBatchLink}from'@trpc/client';import superjson from'superjson';import{trpc}from'./client/src/lib/trpc';import MedicalFilePanel from'./client/src/components/MedicalFilePanel';function Fixture(){const[mode,setMode]=useState(new URLSearchParams(window.location.search).get('initial')||'measurements');return <><nav>{['measurements','diagnosis','pentacam'].map(value=><button key={value} onClick={()=>setMode(value)}>{value}</button>)}</nav><MedicalFilePanel patientId={1} hubVisitId={11} hubVisitDate="2026-10-29" embedded initialMedicalTab={mode==='diagnosis'?'plan':'data'} initialMeasurementView={mode==='pentacam'?'pentacam':'autoref'} workflowPlanOnly={mode==='diagnosis'} workflowMeasurementsOnly={mode!=='diagnosis'} workflowMeasurementViews={mode==='pentacam'?['pentacam']:['autoref','after']} workflowStackMeasurementViews={mode==='measurements'}/></>};const q=new QueryClient({defaultOptions:{queries:{retry:false}}});const c=trpc.createClient({links:[httpBatchLink({url:'/api/trpc',transformer:superjson})]});createRoot(document.getElementById('root')).render(<trpc.Provider client={c} queryClient={q}><QueryClientProvider client={q}><Fixture/></QueryClientProvider></trpc.Provider>);`,loader:"tsx",resolveDir:process.cwd()},
  bundle:true,write:false,format:"esm",platform:"browser",jsx:"automatic",
  alias:{"@":path.resolve("client/src"),"@shared":path.resolve("shared")},
  loader:{".css":"empty",".png":"dataurl",".jpg":"dataurl",".svg":"dataurl"},
  define:{"process.env.NODE_ENV":'"production"',"import.meta.env":'{"DEV":false,"PROD":true}',__FAST_BUILD__:"false"},
});
const server=createServer((req,res)=>{
  res.setHeader("Content-Type",req.url==="/bundle.js"?"application/javascript":"text/html; charset=utf-8");
  res.end(req.url==="/bundle.js"?bundle.outputFiles[0].text:'<html><head><style>.hidden{display:none!important}</style></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const browser=await chromium.launch({channel:"msedge"});
try{
  for (const initial of ["measurements","diagnosis","pentacam"]) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  const writes=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/api/trpc/**",async route=>{
    const url=new URL(route.request().url());
    const fixtures={
      "auth.me":{id:123,role:"admin",name:"Synthetic administrator"},
      "patient.getPatient":{id:1,patientCode:"SYNTHETIC",fullName:"Synthetic patient"},
      "medical.getVisits":[{id:11,patientId:1,visitDate:"2026-10-29T12:00:00.000Z",visitType:"examination"}],
      "medical.getExaminationsByPatient":[{id:101,patientId:1,visitId:11}],
      "medical.getDoctorReportsByVisit":[{id:201,patientId:1,visitId:11,diagnosis:"Saved diagnosis",diseases:"[]"}],
      "medical.getReadyTemplateOverrides":{},
    };
    const responses=url.pathname.split("/api/trpc/")[1].split(",").map(method=>{
      if(route.request().method()!=="GET")writes.push(method);
      return {result:{data:{json:fixtures[method]??[]}}};
    });
    await route.fulfill({contentType:"application/json",body:JSON.stringify(url.searchParams.has("batch")?responses:responses[0])});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/?initial=${initial}`);
  await page.getByRole("button",{name:"diagnosis",exact:true}).click();
  const diagnosis=page.locator('[data-medical-proposals="diagnosis"]:visible').first();
  await expect(diagnosis).toHaveValue("Saved diagnosis");
  await diagnosis.fill("Unsaved diagnosis draft");
  for(const mode of ["pentacam","measurements","pentacam","diagnosis"]){
    await page.getByRole("button",{name:mode,exact:true}).click();
    if(mode==="diagnosis")await expect(diagnosis).toHaveValue("Unsaved diagnosis draft");
    else {
      await expect(page.locator('[data-medical-proposals="diagnosis"]:visible')).toHaveCount(0);
      if(mode==="pentacam")await expect(page.getByRole("combobox").filter({hasText:"Pentacam"})).toBeVisible();
      else await expect(page.getByText("After Refraction",{exact:true}).first()).toBeVisible();
    }
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(writes,[]);
  await page.close();
  }
  console.log("PASS: repeated measurements/diagnosis/Pentacam navigation displays the requested panel and retains the unsaved diagnosis. No writes or provider calls.");
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
