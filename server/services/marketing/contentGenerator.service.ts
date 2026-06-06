import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../../_core/env";
import type { PostDay } from "./topicRotation";
import { DAY_CATEGORY_LABELS } from "./topicRotation";
import { buildBrandAwareImagePrompt, type PartialBrandProfile } from "./brandStyleAnalyzer.service";

export interface GeneratedContent {
  title: string;
  idea: string;
  content: string;
  cta: string;
  hashtags: string;
  imagePrompt: string;
}

// ─── Writing style rotation ───────────────────────────────────────────────────

const POST_STYLES = [
  {
    name: "قصة نجاح",
    instruction: `اكتب المنشور على شكل قصة نجاح قصيرة: ابدأ بموقف واقعي لمريض كان يعاني، ثم كيف غيّرت التقنية حياته، ثم وجّه القارئ. لا تذكر اسم المريض. أسلوب دافئ وإنساني.`,
  },
  {
    name: "تصحيح خرافة شائعة",
    instruction: `ابدأ المنشور بخرافة أو معتقد خاطئ شائع يردده الناس عن هذا الموضوع، ثم صحّحه بمعلومة طبية موثوقة وواضحة. الأسلوب حازم لكن ودود.`,
  },
  {
    name: "نصائح عملية",
    instruction: `قدّم 3 إلى 4 نصائح عملية ومباشرة مرقّمة أو بنقاط واضحة تخص هذا الموضوع. كل نصيحة جملة أو جملتان. اختم بجملة تشجيعية.`,
  },
  {
    name: "حقيقة مفاجئة",
    instruction: `افتح المنشور بإحصائية أو حقيقة طبية مفاجئة أو غير متوقعة عن هذا الموضوع. بعدها اشرح سبب أهميتها للمريض وما يجب أن يفعله. أسلوب يُثير الفضول.`,
  },
  {
    name: "مقارنة واضحة",
    instruction: `اعمل مقارنة واضحة بين خيارَين أو حالتَين مرتبطتَين بالموضوع (مثلاً: قبل وبعد، أو تقنيتَين مختلفتَين). الأسلوب محايد وعلمي يساعد المريض على الفهم.`,
  },
  {
    name: "تعليمي مباشر",
    instruction: `اشرح الموضوع بأسلوب تعليمي مباشر كأنك طبيب يتحدث لمريضه. ابدأ بتعريف بسيط، ثم أعراض أو مؤشرات، ثم أهمية العلاج المبكر. لغة بسيطة بدون مصطلحات معقدة.`,
  },
  {
    name: "أسئلة وأجوبة",
    instruction: `اكتب المنشور على شكل 2-3 أسئلة يطرحها المرضى فعلاً عن هذا الموضوع مع إجابات طبية مختصرة وواضحة. أسلوب حواري مريح.`,
  },
  {
    name: "تحفيزي وعاطفي",
    instruction: `اكتب منشوراً يُحفّز المريض عاطفياً على الاهتمام بصحة عيونه. ابدأ بصورة بلاغية عن قيمة الإبصار، ثم اربطها بالموضوع، ثم اختم بدعوة قوية للعمل. أسلوب دافئ ومُلهِم.`,
  },
] as const;

function pickStyle(topic: string, postIndex: number): (typeof POST_STYLES)[number] {
  // Combine topic hash + postIndex for deterministic but varied selection
  let hash = postIndex;
  for (let i = 0; i < topic.length; i++) {
    hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
  }
  return POST_STYLES[hash % POST_STYLES.length]!;
}

// ─── Image prompt builder ─────────────────────────────────────────────────────

const TOPIC_IMAGE_HINTS: Record<string, string> = {
  "LASIK": "close-up of a human eye with a laser beam, modern laser surgery equipment in background, cool blue lighting",
  "Femto LASIK": "advanced femtosecond laser device focused on an eye, clean surgical environment, blue-teal ambiance",
  "PRK": "ophthalmologist with precision instruments examining an eye, bright clean clinical space",
  "ICL لتصحيح الإبصار": "tiny transparent intraocular lens held with tweezers by a gloved hand, macro photography",
  "الاستيغماتيزم (اللابؤرية)": "blurred city lights bokeh transitioning to sharp focus, representing vision correction",
  "البنتاكام": "colorful topographic eye scan map displayed on screen, doctor reviewing results",
  "رسم خريطة القرنية": "corneal topography map with vivid color gradients on a clinical screen",
  "سماكة القرنية": "medical ultrasound pachymeter probe near an eye, close-up macro shot",
  "الفحص قبل الليزك": "optometrist using slit lamp to examine patient eye, warm clinical lighting",
  "تقنيات تصحيح الإبصار": "collage of modern eye surgery equipment and crystal clear vision, futuristic medical setting",
  "المياه البيضاء (الكتاراكت)": "cross-section illustration of an eye with cloudy lens vs clear lens, clean medical infographic style",
  "العدسات عالية الجودة": "premium intraocular lens in sterile packaging, pristine medical product photography",
  "القرنية المخروطية (Keratoconus)": "3D rendering of a cone-shaped cornea vs normal cornea, medical illustration style",
  "ربط ألياف القرنية (Cross Linking)": "UV light cross-linking procedure on eye, blue UV glow in dark clinical environment",
  "أمراض القرنية": "detailed macro photograph of a human cornea, medical close-up, clinical lighting",
  "زراعة القرنية": "surgeon's gloved hands performing delicate eye procedure under surgical microscope",
  "جفاف العين": "single tear drop on an eyelash macro shot, blue tones, symbolizing eye moisture",
  "الجلوكوما (المياه الزرقاء)": "optic nerve cross-section showing pressure damage, medical illustration, teal and blue tones",
  "السكري وصحة العين": "retina photograph showing blood vessels, warm red tones, clinical diagnostic imagery",
  "صحة الشبكية": "retinal scan fundus photography, detailed blood vessel pattern, dark background with orange-red tones",
  "مشاكل الإبصار عند الأطفال": "child wearing eyeglasses reading a book happily, warm natural light, soft focus background",
  "الفحص الدوري للعيون": "eye examination chart with ophthalmologist using equipment, professional clinic environment",
  "إجهاد العيون من الشاشات": "person with tired eyes rubbing them near a computer screen, soft office lighting, relatable scene",
};

function buildImagePrompt(topic: string, brandProfile: PartialBrandProfile | null): string {
  const hint = TOPIC_IMAGE_HINTS[topic] ?? `professional ophthalmology clinic setting related to "${topic}", medical photography`;

  const brandPart = brandProfile
    ? `Brand colors: ${brandProfile.dominantColors ?? "professional blues and whites"}. Style: ${brandProfile.brandingStyle ?? "clean medical"}. Layout: ${brandProfile.imageComposition ?? "centered"}.`
    : "Color palette: deep blue, white, clean medical tones.";

  return `Professional medical marketing photograph for an Arabic ophthalmology center. Visual: ${hint}. ${brandPart} Ultra-high quality, no text, no Arabic writing, no words, no numbers on the image. Photorealistic, cinematic lighting. Medical center branding aesthetic.`;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  topic: string,
  day: PostDay,
  brandProfile: PartialBrandProfile | null,
  clinicName: string,
  postIndex: number
): string {
  const category = DAY_CATEGORY_LABELS[day];
  const style = pickStyle(topic, postIndex);

  const imagePromptInstruction = brandProfile
    ? `"imagePrompt": "Professional medical marketing photograph. Visual: ${TOPIC_IMAGE_HINTS[topic] ?? `ophthalmology clinic, topic: ${topic}`}. Brand colors: ${brandProfile.dominantColors}, style: ${brandProfile.brandingStyle}. No text, no Arabic writing on image. Photorealistic."`
    : `"imagePrompt": "${buildImagePrompt(topic, null)}"`;

  return `أنت كاتب محتوى تسويقي طبي محترف. اكتب منشور Facebook مميز لمركز "${clinicName}" لطب العيون والليزك.

الموضوع: "${topic}" (ضمن فئة: ${category})
أسلوب الكتابة المطلوب: **${style.name}**
تعليمات الأسلوب: ${style.instruction}

متطلبات ثابتة:
- اللغة: العربية الفصحى البسيطة المناسبة لمنصات التواصل الاجتماعي
- الطول: 150-200 كلمة بالضبط
- لا تبدأ بـ "هل تعلم" أو "في عالم اليوم" أو عبارات مبتذلة
- ابدأ بجملة افتتاحية قوية تجذب القارئ فوراً
- أسلوب المركز: دافئ، متخصص، موثوق — كأن طبيباً يتحدث مباشرة
- إيموجي مناسبة ومتفرقة (لا تفرط فيها)
- لا تذكر أسعاراً أو عروضاً

أعد الرد بـ JSON فقط (بدون أي نص خارجه):
{
  "title": "عنوان جذاب قصير (أقل من 8 كلمات، لا يبدأ بـ 'مركز')",
  "idea": "الفكرة التسويقية الرئيسية في جملة واحدة",
  "content": "نص المنشور الكامل",
  "cta": "دعوة للعمل قصيرة ومباشرة (مختلفة عن الإصدارات السابقة)",
  "hashtags": "6-8 هاشتاقات باللغتين العربية والإنجليزية",
  ${imagePromptInstruction}
}`;
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

function parseSafeJson(raw: string): GeneratedContent | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as GeneratedContent;
  } catch {
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

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK_CTSS = [
  "احجز موعدك الآن عبر الاتصال أو الواتساب",
  "تواصل معنا اليوم واحجز فحصك المجاني",
  "لا تؤجل صحة عيونك — تواصل معنا الآن",
  "استشر طبيبنا المتخصص — الحجز مفتوح",
];

function makeFallback(topic: string, day: PostDay, brandProfile: PartialBrandProfile | null, clinicName: string, postIndex: number): GeneratedContent {
  const category = DAY_CATEGORY_LABELS[day];
  const tag = clinicName.replace(/\s+/g, "_");
  const cta = FALLBACK_CTSS[postIndex % FALLBACK_CTSS.length]!;
  return {
    title: `${topic} في ${clinicName}`,
    idea: `توعية المرضى بأهمية ${topic} ضمن فئة ${category}`,
    content: `✨ ${topic}\n\nصحة عيونك تستحق أفضل رعاية.\n\nفي ${clinicName}، نقدم خدمات متخصصة في ${category} بأحدث التقنيات وعلى يد نخبة من الأطباء.\n\n🔬 دقة تشخيصية عالية\n💡 تقنيات طبية متطورة\n❤️ رعاية متكاملة لصحة عيونك\n\nصحتك أمانة — لا تتردد في الاستشارة.`,
    cta,
    hashtags: `#${topic.replace(/\s+/g, "_")} #طب_العيون #${tag} #صحة_العيون #الليزك #ophthalmology`,
    imagePrompt: buildImagePrompt(topic, brandProfile),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateMarketingContent(
  topic: string,
  day: PostDay,
  brandProfile: PartialBrandProfile | null = null,
  clinicName: string = "مركزك لطب العيون",
  postIndex: number = Math.floor(Math.random() * 1000)
): Promise<GeneratedContent> {
  const apiKey = ENV.geminiApiKey;

  if (!apiKey) {
    console.warn("[marketing] GEMINI_API_KEY not set — using fallback content");
    return makeFallback(topic, day, brandProfile, clinicName, postIndex);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
    },
  });

  const prompt = buildPrompt(topic, day, brandProfile, clinicName, postIndex);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseSafeJson(text);

    if (!parsed || !parsed.title || !parsed.content) {
      console.warn("[marketing] Gemini returned unexpected structure, using fallback", text.slice(0, 200));
      return makeFallback(topic, day, brandProfile, clinicName, postIndex);
    }

    // Override imagePrompt with a stronger one if Gemini's is too short
    if (!parsed.imagePrompt || parsed.imagePrompt.length < 60) {
      parsed.imagePrompt = buildImagePrompt(topic, brandProfile);
    }

    return parsed;
  } catch (err) {
    console.error("[marketing] Gemini API error:", err);
    return makeFallback(topic, day, brandProfile, clinicName, postIndex);
  }
}
