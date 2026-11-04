// Browser check of the real full-visit recorder: after «إيقاف» the captured
// text must go to review on its own, also when Gemini closes its socket right
// after the end of the audio. Speech and audio capture are faked; the API is
// intercepted. No server, database or provider calls.
// Usage: node scripts/verify-medical-recording-stop.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const fixture = `
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{httpBatchLink}from'@trpc/client';
import superjson from'superjson';import{trpc}from'./client/src/lib/trpc';
import FieldDictation from'./client/src/components/medical-assistant/FieldDictation';
function Fixture(){
  const[open,setOpen]=useState(false);const[sent,setSent]=useState([]);
  return <main dir='rtl'>
    <button onClick={()=>setOpen(true)}>ابدأ</button>
    {open&&<FieldDictation kind='conversation' mode='conversation' patientId={7} visitId={11} patientName='مريض تجريبي'
      onClose={()=>setOpen(false)} onTranscript={t=>{setSent(s=>[...s,t.transcript]);setOpen(false);}}/>}
    <output aria-label='Sent'>{JSON.stringify(sent)}</output>
  </main>;
}
const q=new QueryClient({defaultOptions:{queries:{retry:false}}});
const c=trpc.createClient({links:[httpBatchLink({url:'/api/trpc',transformer:superjson})]});
createRoot(document.getElementById('root')).render(<trpc.Provider client={c} queryClient={q}><QueryClientProvider client={q}><Fixture/></QueryClientProvider></trpc.Provider>);
`;
// Gemini sends the last words after the end of the audio and then, in the
// "close" scenario, closes the socket the way the live service can.
const fakeGemini = `export async function connectGeminiLive(_c,cb){let closed=false;
  setTimeout(()=>{if(!closed)cb.final('عيني الشمال مزغللة من شهرين');},200);
  return{write(){},finish(){setTimeout(()=>{if(closed)return;cb.final('القرار عملية فاكو');if(window.__scenario==='close')cb.error();},100);},close(){closed=true;}};}`;
const fakePcm = `export async function startPcmCapture(_x,_s,onBytes){const t=setInterval(()=>onBytes(new ArrayBuffer(320)),100);return()=>clearInterval(t);}`;
const fakes = {
  name: "fake-speech",
  setup(build) {
    build.onResolve({ filter: /\/(gemini-live|pcm-capture)$/ }, (args) => ({ path: path.basename(args.path), namespace: "fake" }));
    build.onLoad({ filter: /.*/, namespace: "fake" }, (args) => ({
      loader: "ts",
      contents: args.path === "gemini-live" ? fakeGemini : fakePcm,
    }));
  },
};
const bundle = await build({
  stdin: { contents: fixture, loader: "tsx", resolveDir: process.cwd() },
  plugins: [fakes],
  bundle: true, write: false, format: "esm", platform: "browser", jsx: "automatic",
  alias: { "@": path.resolve("client/src"), "@shared": path.resolve("shared") },
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"production"', __FAST_BUILD__: "false" },
});
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "application/javascript"); return res.end(bundle.outputFiles[0].text); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html lang="ar" dir="rtl"><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  channel: "msedge",
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
let failed = false;
try {
  for (const scenario of ["close", "open"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((value) => { window.__scenario = value; }, scenario);
    await page.route("**/api/trpc/**", async (route) => {
      const url = new URL(route.request().url());
      const methods = url.pathname.split("/api/trpc/")[1].split(",");
      const responses = methods.map((method) => {
        let data;
        if (method === "medicalAssistant.settings")
          data = { speechProvider: "gemini", maxRecordingMinutes: 8, showDiagnostics: false, processingModel: "gemini:gemini-3.8-flash" };
        else if (method === "medicalAssistant.geminiSpeechToken")
          data = { token: "fake", model: "fake", config: {} };
        else throw new Error(`Unexpected API ${method}`);
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    await page.goto(base);
    await page.getByRole("button", { name: "ابدأ" }).click();
    // Recording starts with no consent step.
    await expect(page.getByRole("button", { name: "إيقاف" })).toBeVisible();
    await expect(page.getByLabel("النص")).toHaveValue("عيني الشمال مزغللة من شهرين");
    await page.getByRole("button", { name: "إيقاف" }).click();
    try {
      await expect(page.getByLabel("Sent")).not.toHaveText("[]", { timeout: 5000 });
      const sent = JSON.parse(await page.getByLabel("Sent").textContent());
      assert.deepEqual(sent, ["عيني الشمال مزغللة من شهرين\nالقرار عملية فاكو"]);
      assert.deepEqual(errors, []);
      console.log(`PASS gemini ${scenario === "close" ? "closes the socket after the end of audio" : "keeps the socket open"}: text sent to review once, with the last words.`);
    } catch (cause) {
      failed = true;
      const alert = await page.getByRole("alert").textContent().catch(() => "");
      console.log(`FAIL gemini ${scenario}: ${cause.message.split("\n")[0]}${alert ? ` — alert: ${alert}` : ""}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) process.exitCode = 1;
