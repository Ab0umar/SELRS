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
    name: "أسباب وأعراض وعلاج",
    instruction: `اكتب بوست طبي تعليمي واضح بالعامية المصرية يشرح: (١) إيه هو الموضوع ده بجملة بسيطة، (٢) أسبابه الشائعة، (٣) علاماته وأعراضه اللي المريض يحس بيها، (٤) إزاي بيتعالج. استخدم رقم أو إيموجي قبل كل قسم. أسلوب دكتور بيشرح لمريضه بشكل مبسط ومحترم.`,
  },
  {
    name: "علامات التحذير والتشخيص المبكر",
    instruction: `اكتب عن العلامات التحذيرية المبكرة للموضوع ده بالعامية. ابدأ بـ "لو بتحس بـ..." أو "انتبه لو..."، واذكر 3-4 أعراض واضحة، واشرح ليه التشخيص المبكر بيفرق في نتيجة العلاج. اختم بدعوة للكشف.`,
  },
  {
    name: "خيارات العلاج المتاحة",
    instruction: `اشرح خيارات علاج الموضوع ده بالعامية المصرية: ابدأ بسؤال المريض عن نفسه، واذكر الخيارات العلاجية المتاحة (دواء، عملية، تقنية)، مع مميزات كل خيار. أسلوب يساعد المريض يفهم ويتخذ قرار صح.`,
  },
  {
    name: "تصحيح معلومة طبية غلط",
    instruction: `ابدأ بمعلومة غلط شائعة عن الموضوع ده زي: "ناس كتير بتعتقد إن..."، صحّح المعلومة بدليل طبي واضح، واشرح الحقيقة بالأسباب. أسلوب واثق وعلمي بدون تعقيد.`,
  },
  {
    name: "أسئلة المرضى الشائعة",
    instruction: `اكتب 3 أسئلة طبية حقيقية بيسألها المرضى عن الموضوع ده، مع إجابات طبية واضحة ومبسطة لكل سؤال. استخدم "س:" و"ج:" قبل كل سؤال وإجابة. أسلوب عملي ومباشر.`,
  },
  {
    name: "مقارنة بين تقنيتين أو حالتين",
    instruction: `قارن بالعامية بين تقنيتين أو خيارين علاجيين مرتبطين بالموضوع، أو بين حالة قبل وبعد العلاج. وضّح الفرق في المميزات، من يناسبه كل خيار، والنتيجة المتوقعة. يساعد المريض يفهم ويختار.`,
  },
  {
    name: "حقيقة طبية + تأثيرها على الحياة",
    instruction: `ابدأ بمعلومة طبية دقيقة أو إحصائية عن الموضوع ده، بعدين اشرح تأثيرها العملي على حياة المريض اليومية لو اتجاهلها، واختم بخطوة الحل. أسلوب علمي مبسط.`,
  },
  {
    name: "الوقاية والمتابعة الدورية",
    instruction: `اكتب عن طرق الوقاية من الموضوع ده أو الحفاظ على صحة العين بعد العلاج. ادي 3-4 نصايح وقاية عملية بالعامية، واشرح أهمية الكشف الدوري. أسلوب تعليمي محفّز.`,
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
  return `أنت طبيب عيون مصري ومتخصص في كتابة المحتوى الطبي التوعوي لصفحات الفيسبوك. مهمتك: اكتب بوست طبي تعليمي حقيقي — مش بوست تسويقي عام. [جلسة: ${seed}]

العميل: "${clinicName}" — طب العيون والليزك
الموضوع الطبي: "${topic}" (فئة: ${category})

⚠️ الأسلوب المطلوب هذه المرة تحديداً: **${style.name}** ⚠️
التزم بهذا الأسلوب حرفياً: ${style.instruction}

قواعد المحتوى الطبي — لازم تتحقق كلها:
- المحتوى طبي تعليمي فعلي: أسباب، أعراض، علامات، طرق تشخيص، أو علاج — حسب الأسلوب المطلوب
- اللغة: العامية المصرية المفهومة — زي دكتور بيتكلم مع مريضه، مش فصحى ومش إعلان
- الطول: 130-180 كلمة
- ابدأ بجملة افتتاحية شايلة انتباه ومرتبطة بالموضوع الطبي مباشرة
- إيموجي طبية مناسبة ومتفرقة (3-5 بس)
- ممنوع: كلام عاطفي فاضي، جمل تسويقية عامة، أو محتوى مش مرتبط بالموضوع الطبي
- ممنوع: ذكر أسعار أو عروض

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
