import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { composeMarketingPageLogo } from "../server/services/marketing/pageBranding";

if (!process.env.XAI_API_KEY) throw new Error("XAI_API_KEY missing");
const directory = path.resolve("outputs/grok-marketing-combined-2026-10-30");
await fs.mkdir(directory, { recursive: true });
const headers = { Authorization: `Bearer ${process.env.XAI_API_KEY}`, "Content-Type": "application/json" };
const brief = `أنت كاتب محتوى ومصمم إعلانات متخصص في طب العيون، تعمل لصفحة مركز عيون الشروق.
جهّز منشورًا توعويًا متكاملًا عن تأثير السكري على شبكية العين: اكتب محتوى البوست وصمّم صورته معًا، بحيث تكون الفكرة والنص والرسوم جزءًا من تصميم واحد متناسق.
المحتوى بالعامية المصرية، بأسلوب طبي بسيط ومباشر. اختر زاوية جذابة ومفيدة بعيدًا عن الكلام التسويقي العام. الحقائق الطبية التي تعتمد عليها: السكري قد يؤثر على أوعية الشبكية، المراحل الأولى قد تكون دون أعراض، فحص قاع العين الموسّع يساعد على الاكتشاف المبكر، ومتابعة السكر والضغط ومواعيد الفحص مع الطبيب مهمة. لا تضف وصفات أو نسبًا أو ضمانات أو تشخيصًا شخصيًا. اختم بدعوة قصيرة وطبيعية للمتابعة مع طبيب العيون.
الصورة: منشور طبي متكامل، عنوان جذاب ومحتوى مختصر ورسوم مرتبطة بالمعلومة. اختر بنفسك أفضل تكوين وتوزيع للنص والرسوم؛ لا تلتزم بقالب بطاقات أو قائمة نقاط إذا كانت هناك معالجة أفضل. استخلص أهم محتوى البوست داخل الصورة ولا تحشر النص الطويل كله. العربي صحيح وواضح ومقروء على الموبايل وبدون تكرار. الهوية كحلي وأزرق وأبيض ولمسات برتقالية محسوبة. لا نساء أو بنات أو وجوه تجميلية أو مشاهد دموية أو أجهزة ونتائج فحوصات مختلقة. لا أسعار أو عروض أو أرقام تواصل أو عنوان مختلق. لا نشر أو أدوات أو أي إجراءات خارجية.
سيتم تنفيذ توجيهك البصري بموديل الصور بعد هذه الخطوة مباشرة. سلّم JSON فقط بهذه الحقول: content نص البوست النهائي؛ hashtags هاشتاجات قليلة؛ imagePrompt برومبت مفصل بالإنجليزية لموديل الصور يتضمن النصوص العربية المختصرة حرفيًا والتكوين الذي اخترته. الصورة مربعة. اترك منطقة صغيرة هادئة أعلى اليمين للشعار الأصلي الذي سيضيفه التطبيق كما هو؛ لا ترسم شعارًا أو اسم صفحة. ابدأ من الفكرة المشتركة للمحتوى والصورة، ولا تستنسخ قالبًا جاهزًا.`;
const schema = z.object({ content: z.string().min(30), hashtags: z.union([z.string(), z.array(z.string())]).transform(value => Array.isArray(value) ? value.join(" ") : value), imagePrompt: z.string().min(80) });
const planPath = path.join(directory, "creative-plan.json");
let plan: z.infer<typeof schema>;
try { plan = schema.parse(JSON.parse(await fs.readFile(planPath, "utf8"))); }
catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  const marker = await fs.open(path.join(directory, "text-request-v2.json"), "wx");
  await marker.writeFile(JSON.stringify({ model: "grok-4.7", startedAt: new Date().toISOString(), retries: 0 }));
  await marker.close();
  console.log("Grok: planning content and design together");
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST", headers,
    body: JSON.stringify({ model: "grok-4.7", messages: [{ role: "user", content: brief }], response_format: { type: "json_object" }, max_tokens: 5000 }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Grok text HTTP ${response.status}; no retry`);
  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  await fs.writeFile(path.join(directory, "text-response.json"), JSON.stringify(result, null, 2));
  plan = schema.parse(JSON.parse(result.choices?.[0]?.message?.content || "null"));
  await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
}
const output = path.join(directory, "combined.png");
try { await fs.access(output); console.log("Existing preview retained; no new image request"); process.exit(0); } catch {}
const marker = await fs.open(path.join(directory, "image-request.json"), "wx");
await marker.writeFile(JSON.stringify({ model: "grok-imagine-image-2.0", startedAt: new Date().toISOString(), retries: 0 }));
await marker.close();
console.log("Grok: generating its own content/design proposal");
const imageResponse = await fetch("https://api.x.ai/v1/images/generations", {
  method: "POST", headers,
  body: JSON.stringify({ model: "grok-imagine-image-2.0", prompt: plan.imagePrompt, n: 1, aspect_ratio: "1:1", resolution: "1k", response_format: "b64_json" }),
  signal: AbortSignal.timeout(180000),
});
if (!imageResponse.ok) throw new Error(`Grok image HTTP ${imageResponse.status}; no retry`);
const result = await imageResponse.json() as { data?: Array<{ b64_json?: string }> };
const encoded = result.data?.[0]?.b64_json;
if (!encoded || encoded.length > 30_000_000) throw new Error("No valid image returned");
const bytes = Buffer.from(encoded, "base64");
await fs.writeFile(path.join(directory, "combined-raw.png"), bytes);
const logo = await fs.readFile("client/public/center-logo.png");
await fs.writeFile(output, await composeMarketingPageLogo(bytes, logo));
console.log(`Saved ${output}; no publication`);
