// Browser check of the main «المساعد الطبي» window, bound to fields the way
// MedicalFilePanel binds them. The API is intercepted: the AI result is a real
// Gemini output for a fictional visit. No server, database or provider calls.
// Usage: node scripts/verify-medical-assistant-flow.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const transcript =
  "اتفضل يا حاج خير مالك. والله يا دكتور عيني الشمال بقالها شهرين مزغللة ومش شايف بيها كويس خصوصا بالليل. " +
  "عندك سكر أو ضغط. عندي سكر من عشر سنين وباخد جلوكوفاج. فيه احمرار أو ألم. لأ مفيش ألم بس بتدمع شوية. " +
  "طيب بص قدامك. الضغط في العين طبيعي. عندك مياه بيضاء في العين الشمال. " +
  "هكتبلك قطرة فيجاموكس أربع مرات في اليوم لمدة أسبوع وسيستين عند اللزوم ومرهم تيرامايسين بالليل. " +
  "وعايزك تعمل تحليل CBC وسكر صائم وتعمل OCT. " +
  "القرار إننا نعمل عملية فاكو للعين الشمال بعد أسبوعين وتيجي متابعة بعد التحاليل.";
const aiResult = {
  proposals: [
    { field: "complaints", speaker: "patient", text: "زغللة وضعف نظر في العين اليسرى منذ شهرين، خاصة في الليل", sources: ["عيني الشمال بقالها شهرين مزغللة ومش شايف بيها كويس خصوصا بالليل"] },
    { field: "symptoms", speaker: "patient", text: "تدميع بسيط في العين مع نفي وجود ألم", sources: ["لأ مفيش ألم بس بتدمع شوية"] },
    { field: "history", speaker: "patient", text: "مرض السكري منذ 10 سنوات ويتناول علاج جلوكوفاج", sources: ["عندي سكر من عشر سنين وباخد جلوكوفاج"] },
    { field: "diagnosis", speaker: "doctor", text: "مياه بيضاء في العين الشمال", sources: ["عندك مياه بيضاء في العين الشمال"] },
    {
      // Medicines said in Arabic come back with their English catalog names
      // (real Gemini output); «سيستين» names no variant, so it stays "Systane".
      field: "treatment", speaker: "doctor",
      text: "VIGAMOX 0.5% EYE DROPS 5 ML أربع مرات في اليوم لمدة أسبوع\nSystane عند اللزوم\nTERRAMYCIN EYE OINT. 5 GM بالليل",
      sources: ["هكتبلك قطرة فيجاموكس أربع مرات في اليوم لمدة أسبوع وسيستين عند اللزوم ومرهم تيرامايسين بالليل"],
      medications: [
        { name: "VIGAMOX 0.5% EYE DROPS 5 ML", source: "قطرة فيجاموكس أربع مرات في اليوم لمدة أسبوع", dosage: "", frequency: "أربع مرات في اليوم", duration: "أسبوع", instructions: "قطرة" },
        { name: "Systane", source: "سيستين عند اللزوم", dosage: "", frequency: "عند اللزوم", duration: "", instructions: "" },
        { name: "TERRAMYCIN EYE OINT. 5 GM", source: "مرهم تيرامايسين بالليل", dosage: "", frequency: "بالليل", duration: "", instructions: "مرهم" },
      ],
    },
    { field: "imaging", speaker: "doctor", text: "OCT", sources: ["وتعمل OCT"] },
    { field: "labs", speaker: "doctor", text: "CBC\nسكر صائم", sources: ["تحليل CBC وسكر صائم"] },
    { field: "decision", speaker: "doctor", text: "إجراء عملية فاكو للعين الشمال بعد أسبوعين مع الحضور للمتابعة بعد التحاليل", sources: ["القرار إننا نعمل عملية فاكو للعين الشمال بعد أسبوعين وتيجي متابعة بعد التحاليل"] },
  ],
  warnings: ["طلب الفحص OCT ورد بشكل عام دون تحديد نوع مخصص ويجب على الطبيب تحديد النوع."],
};
const text = (field) => aiResult.proposals.find((item) => item.field === field).text;

// Field names and destinations mirror MedicalFilePanel's AssistantFieldsProvider.
const fixture = `
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{httpBatchLink}from'@trpc/client';
import superjson from'superjson';import{Router}from'wouter';import{trpc}from'./client/src/lib/trpc';
import MedicalAssistantPreview from'./client/src/components/medical-assistant/MedicalAssistantPreview';
import{AssistantFieldsProvider}from'./client/src/components/medical-assistant/AssistantFields';
const catalogTests=[{id:20,name:'OCT Macula',type:'examination'},{id:23,name:'OCT Nerve',type:'examination'},{id:21,name:'CBC',type:'lab'}];
const medications=[{id:10,name:'VIGAMOX 0.5% EYE DROPS 5 ML',description:'فيجاموكس 0.5% إيي | Route: UNKNOWN'},{id:96,name:'SYSTANE ULTRA EYE DROPS 10 ML',description:'سيستاني أولترا إيي | Route: EYE'},{id:67,name:'TERRAMYCIN EYE OINT. 5 GM',description:'تيرراميسين إيي | Route: EYE'},{id:5,name:'AVAZIR 0.3% EYE OINT. 5 GM',description:'أفازير 0.3% إيي | Route: EYE'}];
function Fixture(){
  const[formData,setFormData]=useState({historyNotes:'',treatmentPlan:'',symptoms:'',medicalHistory:'',diagnosis:'',recommendations:'',tests:[],manualTests:[],treatment:[],manualMedications:[]});
  const[details,setDetails]=useState({});const[saved,setSaved]=useState(null);
  return <AssistantFieldsProvider patientId={7} patientName='مريض تجريبي' visitId={11} visitDate='2026-11-04'
    onSaveDraft={async()=>setSaved({chiefComplaint:formData.medicalHistory,symptoms:formData.symptoms,historyNotes:formData.historyNotes,treatmentPlan:formData.treatmentPlan,diagnosis:formData.diagnosis,recommendations:formData.recommendations,treatment:[...formData.treatment.map(medicationId=>({medicationId,...(details[medicationId]??{})})),...formData.manualMedications],tests:[...formData.tests,...formData.manualTests]})}
    draftBinding={{values:{history:formData.historyNotes,treatment:formData.treatmentPlan,symptoms:formData.symptoms,complaints:formData.medicalHistory,diagnosis:formData.diagnosis,decision:formData.recommendations},
      destinations:{history:'history',treatment:'treatment',complaints:'complaints',symptoms:'symptoms',diagnosis:'diagnosis',decision:'decision'},
      change:v=>setFormData(p=>({...p,...('history' in v?{historyNotes:v.history}:{}),...('treatment' in v?{treatmentPlan:v.treatment}:{}),...('complaints' in v?{medicalHistory:v.complaints}:{}),...('symptoms' in v?{symptoms:v.symptoms}:{}),...('diagnosis' in v?{diagnosis:v.diagnosis}:{}),...('decision' in v?{recommendations:v.decision}:{})}))}}
    testsDraft={{manualItems:formData.manualTests,appendManual:item=>setFormData(p=>({...p,manualTests:[...p.manualTests.filter(e=>e.testName!==item.testName),item]})),removeManual:name=>setFormData(p=>({...p,manualTests:p.manualTests.filter(e=>e.testName!==name)})),catalog:catalogTests,ids:formData.tests,disabled:false,append:ids=>setFormData(p=>({...p,tests:[...new Set([...p.tests,...ids])]})),remove:ids=>setFormData(p=>({...p,tests:p.tests.filter(id=>!ids.includes(id))}))}}
    prescriptionDraft={{templates:[],medications,draft:{manualItems:formData.manualMedications,ids:formData.treatment,details},disabled:false,change:d=>{setFormData(p=>({...p,treatment:d.ids,manualMedications:d.manualItems??[]}));setDetails(d.details);}}}>
    <main dir='rtl' style={{padding:16}}>
      <MedicalAssistantPreview patientId={7} patientName='مريض تجريبي' visitId={11} visitDate='2026-11-04'/>
      <label>التوصيات<textarea aria-label='التوصيات' value={formData.recommendations} readOnly/></label>
      <output aria-label='Form data'>{JSON.stringify(formData)}</output>
      <output aria-label='Saved visit'>{JSON.stringify(saved)}</output>
    </main>
  </AssistantFieldsProvider>;
}
const q=new QueryClient({defaultOptions:{queries:{retry:false}}});
const c=trpc.createClient({links:[httpBatchLink({url:'/api/trpc',transformer:superjson})]});
createRoot(document.getElementById('root')).render(<Router><trpc.Provider client={c} queryClient={q}><QueryClientProvider client={q}><Fixture/></QueryClientProvider></trpc.Provider></Router>);
`;
const fakeRecorder = {
  name: "fake-recorder",
  setup(build) {
    build.onResolve({ filter: /\/FieldDictation$/ }, () => ({ path: "fake-recorder", namespace: "fake" }));
    build.onLoad({ filter: /.*/, namespace: "fake" }, () => ({
      loader: "tsx",
      resolveDir: process.cwd(),
      contents: `import{useEffect}from'react';export default function FakeRecorder(props){useEffect(()=>{props.onTranscript({kind:'conversation',mode:props.mode,transcript:${JSON.stringify(transcript)}});},[]);return null;}`,
    }));
  },
};
const bundle = await build({
  stdin: { contents: fixture, loader: "tsx", resolveDir: process.cwd() },
  plugins: [fakeRecorder],
  bundle: true, write: false, format: "esm", platform: "browser", jsx: "automatic",
  alias: { "@": path.resolve("client/src"), "@shared": path.resolve("shared") },
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"production"', __FAST_BUILD__: "false" },
});
// Built app styles, when present, so screenshots look like the product.
const assets = await readdir("dist/public/assets").catch(() => []);
const css = (await Promise.all(
  assets.filter((name) => /^(App-|web-|design-system-|spacing-scale-|app-surfaces-).*\.css$/.test(name))
    .map((name) => readFile(path.join("dist/public/assets", name), "utf8")),
)).join("\n");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "application/javascript"); return res.end(bundle.outputFiles[0].text); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html lang="ar" dir="rtl"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const directory = "outputs/medical-assistant-flow";
await mkdir(directory, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    const sent = [];
    let reads = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/trpc/**", async (route) => {
      const url = new URL(route.request().url());
      const methods = url.pathname.split("/api/trpc/")[1].split(",");
      const body = route.request().method() === "GET"
        ? JSON.parse(url.searchParams.get("input") || "{}")
        : JSON.parse(route.request().postData() || "{}");
      const responses = methods.map((method, index) => {
        const input = (body[index] ?? body).json;
        let data;
        if (method === "auth.me") data = { id: 3, role: "doctor", name: "طبيب" };
        else if (method === "medicalAssistant.settings")
          data = { speechProvider: "gemini", maxRecordingMinutes: 8, showDiagnostics: false, processingModel: "gemini:gemini-3.8-flash" };
        else if (method === "medicalAssistant.providerOptions")
          data = { managementEnabled: true, defaultProvider: "gemini", gemini: { configured: true, clinicalEnabled: true, models: [] }, central: { enabled: true, provider: "gemini", model: "gemini-3.8-flash" } };
        else if (method === "medical.getAllDiseases") data = [{ name: "Glaucoma", abbrev: null }];
        else if (method === "medicalAssistant.startProposals") { sent.push(input); data = { jobId: "00000000-0000-4000-8000-000000000001" }; }
        // The first check reports the job as still running.
        else if (method === "medicalAssistant.readProposals")
          data = ++reads === 1 ? { status: "running" } : { status: "complete", result: aiResult };
        else throw new Error(`Unexpected API ${method}`);
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    await page.goto(base);
    await page.getByRole("button", { name: "المساعد الطبي", exact: true }).click();
    const review = page.getByRole("region", { name: "AI proposal review" });
    if (width === 1280) {
      // Recording path: the review starts and fills the fields with no clicks.
      await page.getByRole("button", { name: "تسجيل", exact: true }).click();
      // While the job runs, a new recording or text cannot orphan it.
      await expect(page.getByText("انتظر انتهاء المراجعة الحالية قبل تسجيل أو نص جديد.")).toBeVisible();
      await expect(page.getByRole("button", { name: "تسجيل جديد", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "نص جديد", exact: true })).toBeDisabled();
    } else {
      // Typed or pasted text still asks for consent before it is sent.
      await page.getByPlaceholder("اكتب أو الصق كلام الزيارة هنا، أو اضغط «تسجيل».").fill(transcript);
      await page.getByRole("button", { name: "معالجة النص" }).click();
      await review.getByRole("checkbox").check();
      await review.getByRole("button", { name: "إنشاء اقتراحات للمراجعة", exact: true }).click();
    }

    // Diagnosis is filled even though it is not in the catalog, with a review note.
    await expect(review.getByText("التشخيص غير مطابق للكتالوج، وأُضيف للحقل كنص. راجعه قبل الحفظ.")).toBeVisible();
    // VIGAMOX and TERRAMYCIN (exact) and Systane (sole catalog match) are added on their own.
    await expect(review.getByText("موجود في المسودة؛ تفاصيل الدواء الموجود سابقًا لم تُستبدل.")).toHaveCount(3);
    // An uncatalogued test name and the OCT subtype remain the doctor's call.
    await review.getByRole("button", { name: "تأكيد «سكر صائم» وإضافته للطلب بدون إضافته للكتالوج" }).click();
    await review.getByLabel("اختيار فحص: OCT").selectOption("20");

    const form = JSON.parse(await page.getByLabel("Form data").textContent());
    assert.equal(form.medicalHistory, text("complaints"), "الشكوى");
    assert.equal(form.symptoms, text("symptoms"), "الأعراض");
    assert.equal(form.historyNotes, text("history"), "التاريخ المرضي");
    assert.equal(form.diagnosis, text("diagnosis"), "التشخيص");
    assert.equal(form.treatmentPlan, text("treatment"), "الخطة العلاجية");
    assert.equal(form.recommendations, text("decision"), "التوصيات");
    assert.ok(form.recommendations.length < transcript.length / 2, "التوصيات لا تحتوي المحادثة كاملة");
    assert.deepEqual(form.treatment, [10, 96, 67], "English catalog medicines");
    assert.deepEqual(form.manualMedications, [], "nothing saved as uncatalogued text");
    assert.deepEqual([...form.tests].sort(), [20, 21], "CBC + OCT Macula");
    assert.deepEqual(form.manualTests.map((item) => [item.testName, item.testType]), [["سكر صائم", "lab"]]);
    assert.equal(sent.length, 1, "one AI request");
    assert.equal(sent[0].recording.transcript, transcript);
    assert.equal(sent[0].patientId, 7);
    assert.equal(sent[0].consentConfirmed, true);

    await page.screenshot({ path: `${directory}/review-${width}.png`, fullPage: true });
    await review.getByRole("button", { name: "حفظ الزيارة بعد المراجعة" }).click();
    await expect(review.getByText("تم حفظ الزيارة والحقول المعبأة بنجاح.")).toBeVisible();
    const saved = JSON.parse(await page.getByLabel("Saved visit").textContent());
    assert.equal(saved.recommendations, text("decision"));
    assert.equal(saved.chiefComplaint, text("complaints"));
    assert.deepEqual(saved.tests.length, 3);
    assert.deepEqual(saved.treatment.map((item) => item.medicationId), [10, 96, 67]);
    assert.equal(saved.treatment[0].frequency, "أربع مرات في اليوم", "dictated frequency kept");
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no horizontal overflow");
    console.log(`PASS ${width}px (${width === 1280 ? "recording, no clicks" : "typed text"}): 6 fields, 3 medicines said in Arabic saved by English catalog name, 3 tests filled correctly and saved; recommendations = decision only.`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
