import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../../_core/env";
import type { PostDay } from "./topicRotation";
import { DAY_CATEGORY_LABELS } from "./topicRotation";

export interface GeneratedContent {
  title: string;
  idea: string;
  content: string;
  cta: string;
  hashtags: string;
  imagePrompt: string;
}

function buildPrompt(topic: string, day: PostDay): string {
  const category = DAY_CATEGORY_LABELS[day];
  return `أنت خبير تسويق رقمي متخصص في المراكز الطبية لطب وجراحة العيون.
اكتب منشور Facebook احترافي وجذاب لمركز "ساعدني" لطب العيون والليزك عن موضوع: "${topic}" (ضمن فئة: ${category}).

المتطلبات:
- اللغة العربية الفصحى البسيطة المناسبة لمنصات التواصل الاجتماعي
- أسلوب ودود ومطمئن للمريض
- طول المحتوى: 150-220 كلمة
- يتضمن معلومة طبية واحدة مفيدة وموثوقة

أعد الرد بتنسيق JSON فقط بدون أي نص إضافي، بالبنية التالية:
{
  "title": "عنوان قصير جذاب (أقل من 10 كلمات)",
  "idea": "الفكرة التسويقية في جملة واحدة",
  "content": "نص المنشور الكامل مع إيموجي مناسبة",
  "cta": "نداء للعمل قصير وواضح",
  "hashtags": "5-7 هاشتاقات متعلقة بالموضوع وطب العيون",
  "imagePrompt": "وصف بالإنجليزية لصورة احترافية مناسبة للمنشور (للذكاء الاصطناعي)"
}`;
}

function parseSafeJson(raw: string): GeneratedContent | null {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as GeneratedContent;
  } catch {
    // Try to extract JSON object from somewhere in the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as GeneratedContent;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function makeFallback(topic: string, day: PostDay): GeneratedContent {
  const category = DAY_CATEGORY_LABELS[day];
  return {
    title: `${topic} — مركز ساعدني لطب العيون`,
    idea: `نشر وعي بموضوع ${topic} ضمن فئة ${category}`,
    content: `✨ ${topic}\n\nهل تعلم أن ${topic} من أهم الموضوعات في مجال ${category}؟\n\nفي مركز ساعدني لطب وجراحة العيون، نقدم لك أحدث التقنيات والرعاية المتخصصة.\n\n🔬 فريق من أمهر الأطباء\n💡 تقنيات طبية حديثة\n❤️ رعاية شاملة لصحة عيونك\n\nلا تتردد في الاستفسار — صحة عيونك أولويتنا.`,
    cta: "احجز موعدك الآن عبر الاتصال أو الواتساب",
    hashtags: `#${topic.replace(/\s+/g, "_")} #طب_العيون #مركز_ساعدني #صحة_العيون #الليزك`,
    imagePrompt: `Professional ophthalmology clinic image about ${topic}, clean medical aesthetic, blue and white tones, arabic medical center`,
  };
}

export async function generateMarketingContent(
  topic: string,
  day: PostDay
): Promise<GeneratedContent> {
  const apiKey = ENV.geminiApiKey;

  if (!apiKey) {
    console.warn("[marketing] GEMINI_API_KEY not set — using fallback content");
    return makeFallback(topic, day);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });

  const prompt = buildPrompt(topic, day);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseSafeJson(text);

    if (!parsed || !parsed.title || !parsed.content) {
      console.warn("[marketing] Gemini returned unexpected structure, using fallback", text.slice(0, 200));
      return makeFallback(topic, day);
    }

    return parsed;
  } catch (err) {
    console.error("[marketing] Gemini API error:", err);
    return makeFallback(topic, day);
  }
}
