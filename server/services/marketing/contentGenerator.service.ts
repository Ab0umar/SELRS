import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../../_core/env";
import type { PostDay } from "./topicRotation";
import { DAY_CATEGORY_LABELS } from "./topicRotation";
import {
  buildBrandAwareImagePrompt,
  type PartialBrandProfile,
} from "./brandStyleAnalyzer.service";

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
    instruction: `ابدأ بموقف واقعي بالعامية: "فيه واحد جه عندنا وكان بيشكي من..."، وضح إزاي التقنية غيرت حياته، واختم بتوجيه القارئ. متذكرش اسم المريض. أسلوب دافي وإنساني.`,
  },
  {
    name: "تصحيح خرافة شائعة",
    instruction: `ابدأ بكلام غلط بيقوله الناس فعلاً عن الموضوع ده، زي: "كتير بيقولوا إن..."، بعدين صحّح المعلومة بشكل طبي واضح. الأسلوب واثق بس مش متعالي.`,
  },
  {
    name: "نصائح عملية",
    instruction: `ادي 3 أو 4 نصايح عملية ومرقمة بالعامية تخص الموضوع ده. كل نصيحة جملة أو جملتين. اختم بجملة تشجيعية خفيفة.`,
  },
  {
    name: "حقيقة مفاجئة",
    instruction: `افتح بمعلومة طبية مفاجئة أو إحصائية غير متوقعة عن الموضوع ده بالعامية. بعدين فسّر ليه ده مهم للقارئ وإيه اللي المفروض يعمله. أسلوب يجيب الفضول.`,
  },
  {
    name: "مقارنة واضحة",
    instruction: `اعمل مقارنة بسيطة بالعامية بين خيارين أو حالتين مرتبطين بالموضوع (قبل وبعد، أو تقنيتين مختلفتين). الأسلوب بيساعد المريض يفهم ويختار.`,
  },
  {
    name: "تعليمي مباشر",
    instruction: `اشرح الموضوع بالعامية كأنك دكتور بيتكلم مع مريض: ابدأ بتعريف بسيط، بعدين أعراض أو علامات، بعدين ليه العلاج المبكر مهم. من غير مصطلحات تقيلة.`,
  },
  {
    name: "أسئلة وأجوبة",
    instruction: `اكتب البوست على شكل 2-3 سؤال بالعامية زي ما بيسأل المرضى فعلاً، مع إجابات طبية قصيرة وواضحة. أسلوب شبه محادثة مريحة.`,
  },
  {
    name: "تحفيزي وعاطفي",
    instruction: `ابدأ بجملة دافية بالعامية عن قيمة البصر في حياتنا، ربطها بالموضوع، واختم بدعوة قوية للاهتمام بالنفس. أسلوب حاسس ومُلهم.`,
  },
] as const;

function pickStyle(
  topic: string,
  postIndex: number,
): (typeof POST_STYLES)[number] {
  // Combine topic hash + postIndex for deterministic but varied selection
  let hash = postIndex;
  for (let i = 0; i < topic.length; i++) {
    hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
  }
  return POST_STYLES[hash % POST_STYLES.length]!;
}

// ─── Image prompt builder ─────────────────────────────────────────────────────

const TOPIC_IMAGE_HINTS: Record<string, string> = {
  LASIK:
    "close-up of a human eye with a laser beam, modern laser surgery equipment in background, cool blue lighting",
  "Femto LASIK":
    "advanced femtosecond laser device focused on an eye, clean surgical environment, blue-teal ambiance",
  PRK: "ophthalmologist with precision instruments examining an eye, bright clean clinical space",
  "ICL لتصحيح الإبصار":
    "tiny transparent intraocular lens held with tweezers by a gloved hand, macro photography",
  "الاستيغماتيزم (اللابؤرية)":
    "blurred city lights bokeh transitioning to sharp focus, representing vision correction",
  البنتاكام:
    "colorful topographic eye scan map displayed on screen, doctor reviewing results",
  "رسم خريطة القرنية":
    "corneal topography map with vivid color gradients on a clinical screen",
  "سماكة القرنية":
    "medical ultrasound pachymeter probe near an eye, close-up macro shot",
  "الفحص قبل الليزك":
    "optometrist using slit lamp to examine patient eye, warm clinical lighting",
  "تقنيات تصحيح الإبصار":
    "collage of modern eye surgery equipment and crystal clear vision, futuristic medical setting",
  "المياه البيضاء (الكتاراكت)":
    "cross-section illustration of an eye with cloudy lens vs clear lens, clean medical infographic style",
  "العدسات عالية الجودة":
    "premium intraocular lens in sterile packaging, pristine medical product photography",
  "القرنية المخروطية (Keratoconus)":
    "3D rendering of a cone-shaped cornea vs normal cornea, medical illustration style",
  "ربط ألياف القرنية (Cross Linking)":
    "UV light cross-linking procedure on eye, blue UV glow in dark clinical environment",
  "أمراض القرنية":
    "detailed macro photograph of a human cornea, medical close-up, clinical lighting",
  "زراعة القرنية":
    "surgeon's gloved hands performing delicate eye procedure under surgical microscope",
  "جفاف العين":
    "single tear drop on an eyelash macro shot, blue tones, symbolizing eye moisture",
  "الجلوكوما (المياه الزرقاء)":
    "optic nerve cross-section showing pressure damage, medical illustration, teal and blue tones",
  "السكري وصحة العين":
    "retina photograph showing blood vessels, warm red tones, clinical diagnostic imagery",
  "صحة الشبكية":
    "retinal scan fundus photography, detailed blood vessel pattern, dark background with orange-red tones",
  "مشاكل الإبصار عند الأطفال":
    "child wearing eyeglasses reading a book happily, warm natural light, soft focus background",
  "الفحص الدوري للعيون":
    "eye examination chart with ophthalmologist using equipment, professional clinic environment",
  "إجهاد العيون من الشاشات":
    "person with tired eyes rubbing them near a computer screen, soft office lighting, relatable scene",
};

function buildImagePrompt(
  topic: string,
  brandProfile: PartialBrandProfile | null,
): string {
  const hint =
    TOPIC_IMAGE_HINTS[topic] ??
    `professional ophthalmology clinic setting related to "${topic}", medical photography`;

  const brandPart = brandProfile
    ? `Brand colors: ${brandProfile.dominantColors ?? "professional blues and whites"}. Style: ${brandProfile.brandingStyle ?? "clean medical"}. Layout: ${brandProfile.imageComposition ?? "centered"}.`
    : "Color palette: deep blue, white, clean medical tones.";

  return `Professional medical marketing photograph for an Arabic ophthalmology center. Visual: ${hint}. ${brandPart} Ultra-high quality, no text, no Arabic writing, no words, no numbers on the image. Photorealistic, cinematic lighting. Medical center branding aesthetic.`;
}

// ─── Final image prompt builder (brand DNA + topic hint) ─────────────────────

function buildFinalImagePrompt(
  topic: string,
  brandProfile: PartialBrandProfile | null,
): string {
  const topicHint =
    TOPIC_IMAGE_HINTS[topic] ??
    `professional ophthalmology clinic setting related to "${topic}", medical photography`;

  if (!brandProfile) {
    return `Professional medical marketing photograph for Arabic ophthalmology center. Visual: ${topicHint}. Color palette: deep blue, white, clean medical tones. No text, no Arabic writing, photorealistic, cinematic lighting.`;
  }

  return `Create a professional marketing image for an Arabic ophthalmology center.

Visual subject: ${topicHint}

STRICTLY match this brand's visual identity — do NOT produce generic medical stock imagery:
- Color palette: ${brandProfile.dominantColors ?? "professional blues and whites"}
- Layout & composition: ${brandProfile.imageComposition ?? "centered, professional"}
- Branding personality: ${brandProfile.brandingStyle ?? "trustworthy, clinical"}
- Medical visual style: ${brandProfile.medicalVisualStyle ?? "real clinical photography"}
- Overall brand aesthetic: ${brandProfile.overallAesthetic ?? "clean, modern ophthalmology center"}

The result must look like it belongs to this brand's design family. Fresh composition — do not copy any existing design. No text, no Arabic writing, no overlaid words. Photorealistic, cinematic lighting, ultra high quality.`.trim();
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  topic: string,
  day: PostDay,
  brandProfile: PartialBrandProfile | null,
  clinicName: string,
  postIndex: number,
): string {
  const category = DAY_CATEGORY_LABELS[day];
  const style = pickStyle(topic, postIndex);

  // imagePrompt is intentionally excluded — we generate it from brand DNA after parsing
  const seed = Math.random().toString(36).slice(2, 10);
  return `أنت كاتب محتوى إبداعي متخصص في السوشيال ميديا الطبية المصرية. مهمتك: اكتب بوست Facebook مختلف تماماً عن أي بوست كتبته قبل كده. [جلسة: ${seed}]

العميل: "${clinicName}" — طب العيون والليزك
الموضوع: "${topic}" (فئة: ${category})

⚠️ الأسلوب المطلوب هذه المرة تحديداً: **${style.name}** ⚠️
التزم بهذا الأسلوب حرفياً: ${style.instruction}

لو الأسلوب ده بيطلب منك تبدأ بموقف معين، ابدأ بيه فعلاً. لو بيطلب أسئلة وأجوبة، اعملها. لا تكتب أسلوب عام أو تتجاهل التعليمات.

متطلبات ثابتة:
- اللغة: العامية المصرية الدارجة — زي ما بتتكلم مع صاحبك في الشارع، مش فصحى رسمية
- الأسلوب: دافي ومريح زي كلام دكتور قريب، مش إعلان تجاري
- الطول: 120-170 كلمة
- ابدأ بجملة افتتاحية شايلة انتباه — مش "هل تعلم" ومش "في عالمنا اليوم"
- إيموجي مناسبة ومتفرقة (3-5 بس، مش أكتر)
- متذكرش أسعار أو عروض
- الكلام يكون طبيعي ومحترم في نفس الوقت

أعد الرد بـ JSON فقط (بدون أي نص خارجه):
{
  "title": "عنوان قصير جذاب بالعامية (أقل من 8 كلمات، مش بتبدأ بـ 'مركز')",
  "idea": "الفكرة التسويقية الرئيسية في جملة واحدة",
  "content": "نص البوست كامل بالعامية المصرية",
  "cta": "كول تو أكشن قصير وطبيعي بالعامية",
  "hashtags": "6-8 هاشتاقات عربي وإنجليزي"
}`;
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

function parseSafeJson(raw: string): GeneratedContent | null {
  // Extract JSON object directly — works regardless of markdown fences or preamble text
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as GeneratedContent;
  } catch {
    return null;
  }
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK_CTSS = [
  "احجزلك موعد دلوقتي عن طريق الاتصال أو الواتساب",
  "تواصل معانا النهارده واحجز كشفك",
  "متأخرش على صحة عيونك — كلمنا دلوقتي",
  "استشر دكتورنا المتخصص — الحجز متاح",
];

function makeFallback(
  topic: string,
  day: PostDay,
  brandProfile: PartialBrandProfile | null,
  clinicName: string,
  postIndex: number,
): GeneratedContent {
  const category = DAY_CATEGORY_LABELS[day];
  const tag = clinicName.replace(/\s+/g, "_");
  const cta = FALLBACK_CTSS[postIndex % FALLBACK_CTSS.length]!;
  return {
    title: `${topic} في ${clinicName}`,
    idea: `توعية المرضى بأهمية ${topic} ضمن فئة ${category}`,
    content: `✨ ${topic}\n\nعيونك أغلى حاجة عندك، متهملهاش! 👁️\n\nفي ${clinicName} عندنا فريق متخصص في ${category} بأحدث التقنيات وخبرة طويلة.\n\n🔬 تشخيص دقيق\n💡 تقنيات حديثة\n❤️ رعاية كاملة لعيونك\n\nصحتك أمانة — اتصل بينا دلوقتي.`,
    cta,
    hashtags: `#${topic.replace(/\s+/g, "_")} #طب_العيون #${tag} #صحة_العيون #الليزك #ophthalmology`,
    imagePrompt: buildFinalImagePrompt(topic, brandProfile),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateMarketingContent(
  topic: string,
  day: PostDay,
  brandProfile: PartialBrandProfile | null = null,
  clinicName: string = "مركزك لطب العيون",
  postIndex: number = Math.floor(Math.random() * 1000),
): Promise<GeneratedContent> {
  const apiKey = ENV.geminiApiKey;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 1.4,
      maxOutputTokens: 8192,
      // thinkingBudget: 0 — disable internal thinking so all tokens go to output
      thinkingConfig: { thinkingBudget: 0 },
    } as any,
  });

  const prompt = buildPrompt(topic, day, brandProfile, clinicName, postIndex);

  let text: string;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini API error: ${msg}`);
  }

  const parsed = parseSafeJson(text);
  if (!parsed || !parsed.title || !parsed.content) {
    throw new Error(`Gemini returned unparseable response: ${text.slice(0, 300)}`);
  }

  // Always build imagePrompt from brand profile + topic hint — never rely on
  // what Gemini text-generated since it lacks the full visual identity data
  parsed.imagePrompt = buildFinalImagePrompt(topic, brandProfile);

  return parsed;
}
