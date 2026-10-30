import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { composeMarketingPageLogo } from "../server/services/marketing/pageBranding";

if (!process.env.XAI_API_KEY) throw new Error("XAI_API_KEY missing");
const directory = path.resolve("outputs/grok-poster-trial-2026-10-30");
await fs.mkdir(directory, { recursive: true });
const marker = await fs.open(path.join(directory, "request.json"), "wx");
await marker.writeFile(JSON.stringify({ model: "grok-imagine-image-2.0", startedAt: new Date().toISOString(), count: 1, published: false }));
await marker.close();
const prompt = `صمّم بوسترًا طبيًا إعلانيًا متكاملًا لمركز عيون الشروق عن ربط ألياف القرنية Cross Linking. المطلوب صورة نهائية واحدة مربعة غنية بصريًا، مثل بوسترات المراكز الطبية الاحترافية: صورة فوتوغرافية توضيحية كبيرة مدمجة مع نص عربي كافٍ داخل التصميم، وليس رسمة تشريحية بسيطة أو مجرد عنوان أو شبكة بطاقات.
التكوين: جزء علوي أبيض نظيف يحتضن عنوانًا كبيرًا وشرحًا واضحًا، ينساب بمنحنى إلى جزء سفلي كحلي عميق فيه صورة طبية كبيرة بتفاصيل فوتوغرافية وإضاءة سريرية زرقاء واقعية. لمسات برتقالية محسوبة. مظهر مصقول وتباين قوي، والنص مقروء على الموبايل. لك حرية توزيع العناصر داخل هذا الاتجاه. اترك أعلى اليمين مربعًا هادئًا فارغًا بحجم 18% للشعار الأصلي الذي سنركبه بعد التوليد. لا تخترع شعارًا أو اسم الصفحة أو هاشتاجات أو بيانات تواصل.
المشهد: مريض رجل بالغ مستلقٍ، لقطة سريرية محترمة تُظهر عينًا سليمة الشكل وسطح القرنية خلال إضاءة UVA غير تلامسية، بدون دم أو أدوات تخترق العين. المشهد توضيحي مولّد وليس تصويرًا لجهاز حقيقي أو نتيجة علاج. لا قبضة قلم تلمس القرنية ولا شعاع ليزر خيالي ولا مخروط ضوء نافذ للشبكية ولا أجهزة تحمل علامات تجارية. ممنوع تمامًا نساء أو بنات أو مكياج أو رموش تجميلية. لا وجه طبيب مولّد على أنه طبيب المركز.
النص العربي داخل التصميم حرفيًا:
العنوان: ربط ألياف القرنية
العنوان الثانوي: Cross Linking
الشرح، موزع على فقرتين واضحتين:
إجراء يستخدم قطرات الريبوفلافين «فيتامين B2» مع الأشعة فوق البنفسجية UVA لتقوية الروابط داخل نسيج القرنية.
يساعد على إبطاء أو إيقاف تدهور بعض حالات القرنية المخروطية. ويحدد الطبيب مناسبته بعد الفحص وقياسات القرنية.
الخاتمة في شريط متداخل مع التصميم: تابع قرنيتك بانتظام.. وخلي قرار العلاج مع طبيبك
لا تكتب أمانًا مطلقًا أو شفاءً مضمونًا أو وعدًا بالتخلص من النظارة. لا تضف نصوصًا أخرى. دقق كتابة كل كلمة عربية وتجنب تكرارها. سلّم البوستر فقط؛ لا تنشر أو تنفذ أي إجراء خارجي.`;
await fs.writeFile(path.join(directory, "prompt.txt"), prompt);
console.log("Requesting one Grok medical poster; no publication");
const response = await fetch("https://api.x.ai/v1/images/generations", {
  method: "POST", headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "grok-imagine-image-2.0", prompt, n: 1, aspect_ratio: "1:1", resolution: "1k", response_format: "b64_json" }),
  signal: AbortSignal.timeout(180000),
});
if (!response.ok) throw new Error(`Grok HTTP ${response.status}; no automatic retry`);
const result = await response.json() as { data?: Array<{ b64_json?: string }> };
const encoded = result.data?.[0]?.b64_json;
if (!encoded || encoded.length > 30_000_000) throw new Error("No valid image returned");
const raw = Buffer.from(encoded, "base64");
await fs.writeFile(path.join(directory, "poster-raw.png"), raw);
const logo = await fs.readFile("client/public/center-logo.png");
await fs.writeFile(path.join(directory, "poster.png"), await composeMarketingPageLogo(raw, logo));
console.log(`Saved ${directory}/poster.png; not published`);
