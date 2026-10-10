import { LAB_REFERENCE_CATALOG } from "./lab-reference-catalog";
import {
  emptyTestReferenceRange,
  getTestReferenceRanges,
  type TestReferenceRange,
} from "./test-reference-ranges";

export type CatalogReferenceSeed = {
  name: string;
  type: "lab" | "imaging" | "examination" | "other";
  ranges: TestReferenceRange[];
  noNormalRange: boolean;
  note: string;
  sources: string[];
};

const numeric = (
  name: string,
  min: string,
  max: string,
  unit: string,
): TestReferenceRange => ({ name, min, max, unit, text: "" });
const textual = (
  name: string,
  text: string,
  unit = "",
): TestReferenceRange => ({ ...emptyTestReferenceRange(), name, text, unit });

const labDetails: Record<string, TestReferenceRange[]> = {
  CBC: [
    numeric("WBC — بالغون", "3.4", "9.6", "×10^9/L"),
    numeric("RBC — رجال بالغون", "4.35", "5.65", "×10^12/L"),
    numeric("RBC — سيدات بالغات", "3.92", "5.13", "×10^12/L"),
    numeric("Hemoglobin — رجال بالغون", "13.2", "16.6", "g/dL"),
    numeric("Hemoglobin — سيدات بالغات", "11.6", "15.0", "g/dL"),
    numeric("Hematocrit — رجال بالغون", "38.3", "48.6", "%"),
    numeric("Hematocrit — سيدات بالغات", "35.5", "44.9", "%"),
    numeric("MCV — رجال بالغون", "78.2", "97.9", "fL"),
    numeric("MCV — سيدات بالغات؛ كما نشره Mayo", "78.2", "97.93", "fL"),
    numeric("Platelets — رجال بالغون", "135", "317", "×10^9/L"),
    numeric("Platelets — سيدات بالغات", "157", "371", "×10^9/L"),
    numeric("RDW — رجال بالغون", "11.8", "14.5", "%"),
    numeric("RDW — سيدات بالغات", "12.2", "16.1", "%"),
    numeric("Neutrophils absolute — بالغون", "1.56", "6.45", "×10^9/L"),
    numeric("Lymphocytes absolute — بالغون", "0.95", "3.07", "×10^9/L"),
    numeric("Monocytes absolute — بالغون", "0.26", "0.81", "×10^9/L"),
    numeric("Eosinophils absolute — بالغون", "0.03", "0.48", "×10^9/L"),
    numeric("Basophils absolute — بالغون", "0.01", "0.08", "×10^9/L"),
    textual(
      "MCH — رجال؛ مثال UCSF غير مفصل بالعمر",
      "27–33؛ يُراجع العمر ومدى المعمل",
      "pg/cell",
    ),
    textual(
      "MCH — سيدات؛ مثال UCSF غير مفصل بالعمر",
      "26–33؛ يُراجع العمر ومدى المعمل",
      "pg/cell",
    ),
    textual(
      "MCHC — مثال UCSF غير مفصل بالعمر",
      "32–36؛ يُراجع العمر ومدى المعمل",
      "g/dL",
    ),
  ],
  "Lipid Profile": [
    textual("Total cholesterol — بالغون ≥18؛ مرغوب", "<200", "mg/dL"),
    textual("Triglycerides — بالغون ≥18؛ تصنيف المصدر", "<150", "mg/dL"),
    textual("HDL — رجال بالغون ≥18", "≥40", "mg/dL"),
    textual("HDL — سيدات بالغات ≥18", "≥50", "mg/dL"),
    textual(
      "LDL — بالغون ≥18؛ مرغوب لا هدف علاجي",
      "<100؛ الهدف الفردي حسب خطر القلب",
      "mg/dL",
    ),
    textual(
      "Non-HDL — بالغون ≥18؛ مرغوب",
      "<130؛ الهدف الفردي حسب خطر القلب",
      "mg/dL",
    ),
  ],
  Creatinine: [
    numeric("Creatinine — رجال بالغون", "0.74", "1.35", "mg/dL"),
    numeric("Creatinine — سيدات بالغات", "0.59", "1.04", "mg/dL"),
  ],
  "Serum Urea & Creatinine": [
    numeric("Urea — عمر ≥18", "2.5", "7.8", "mmol/L"),
    numeric("Creatinine — رجال بالغون", "0.74", "1.35", "mg/dL"),
    numeric("Creatinine — سيدات بالغات", "0.59", "1.04", "mg/dL"),
  ],
  TSH: [numeric("TSH — غير الحوامل بعمر ≥20", "0.3", "4.2", "mIU/L")],
  "PT/INR": [
    numeric("PT — غير المعالجين بمضادات التخثر", "9.4", "12.5", "s"),
    numeric("INR — مرجع وليس هدف وارفارين", "0.9", "1.1", "ratio"),
  ],
  "Prothrombine Time & Activity": [
    numeric("PT — غير المعالجين بمضادات التخثر", "9.4", "12.5", "s"),
    textual(
      "Prothrombin Activity",
      "حسب الكاشف والمعايرة ومدى المعمل؛ لا حد عام",
      "%",
    ),
  ],
  ESR: [
    numeric("ESR Alifax — رجال 18–44 سنة", "0", "15", "mm/h"),
    numeric("ESR Alifax — سيدات 18–44 سنة", "0", "20", "mm/h"),
    numeric("ESR Alifax — رجال 45–49 سنة", "0", "22", "mm/h"),
    numeric("ESR Alifax — سيدات 45–49 سنة", "1", "39", "mm/h"),
    numeric("ESR Alifax — رجال 50–54 سنة", "0", "25", "mm/h"),
    numeric("ESR Alifax — سيدات 50–54 سنة", "1", "41", "mm/h"),
    numeric("ESR Alifax — رجال 55–59 سنة", "0", "28", "mm/h"),
    numeric("ESR Alifax — سيدات 55–59 سنة", "1", "44", "mm/h"),
    numeric("ESR Alifax — رجال 60–64 سنة", "0", "33", "mm/h"),
    numeric("ESR Alifax — سيدات 60–64 سنة", "1", "47", "mm/h"),
    numeric("ESR Alifax — رجال 65–69 سنة", "0", "35", "mm/h"),
    numeric("ESR Alifax — سيدات 65–69 سنة", "1", "50", "mm/h"),
    numeric("ESR Alifax — رجال 70–79 سنة", "0", "38", "mm/h"),
    numeric("ESR Alifax — سيدات 70–79 سنة", "1", "53", "mm/h"),
  ],
};

const labSeeds: CatalogReferenceSeed[] = LAB_REFERENCE_CATALOG.map((entry) => ({
  name: entry.name,
  type: "lab",
  noNormalRange: false,
  ranges:
    labDetails[entry.name] ??
    getTestReferenceRanges(entry).map((range) => ({
      ...range,
      name: `${entry.name} — مرجع استرشادي للبالغين؛ راجع الوصف`,
    })),
  note:
    entry.note +
    (entry.name === "CBC"
      ? " مؤشرات MCH/MCHC أمثلة UCSF منفصلة عن Mayo وغير مفصلة حسب العمر؛ راجع مدى المعمل. قيمة MCV للإناث 97.93 منشورة حرفيًا بالمصدر وتحتاج مطابقة مدى المعمل المحلي."
      : entry.name === "ESR"
        ? " المديات المسماة حسب المصدر بطريقة Alifax وليست مرجع Westergren عامًا؛ لا يفترض مدى لعمر ≥80 أو للحمل."
        : ""),
  sources:
    entry.name === "CBC"
      ? [
          ...entry.sources,
          "https://www.ucsfhealth.org/care/medical-tests/rbc-indices",
        ]
      : entry.sources,
}));

const eyeSources = {
  pressure: "https://eyewiki.aao.org/IOP_and_Tonometry",
  pupils: "https://eyewiki.aao.org/Eye_in_numbers",
  dry: "https://eyewiki.aao.org/Diagnostic_Testing_for_Dry_Eye",
  refraction:
    "https://www.nei.nih.gov/about/education-and-outreach/outreach-materials/refractive-errors",
  biometry:
    "https://www.zeiss.com/meditec/en/products/optical-biometers/iolmaster-500.html",
  ultrasound: "https://eyewiki.aao.org/Echography_%28ultrasound%29",
  topography: "https://eyewiki.aao.org/Corneal_Topography",
  endothelium:
    "https://webeye.ophth.uiowa.edu/eyeforum/tutorials/corneal-imaging/index.htm",
  slit: "https://eyewiki.aao.org/Slit_Lamp_Examination",
  fundus:
    "https://eyewiki.aao.org/Color_Fundus_Photography_Interpretation_of_Ophthalmic_Findings",
  fields: "https://eyewiki.aao.org/Standard_Automated_Perimetry",
  acuity: "https://eyewiki.aao.org/Visual_Acuity_Testing_in_Adults",
};

function descriptiveExam(
  name: string,
  reference: { name: string; text: string; unit?: string },
  source: string,
): CatalogReferenceSeed {
  return {
    name,
    type: "examination",
    ranges: [textual(reference.name, reference.text, reference.unit)],
    noNormalRange: false,
    note: "مرجع وصفي/مرتبط بالطريقة، وليس حدودًا عددية معتمدة لكل المرضى. يفسر الطبيب النتيجة حسب العمر والجهاز وبروتوكول القياس.",
    sources: [source],
  };
}
function noIntervalExam(
  name: string,
  note: string,
  source: string,
): CatalogReferenceSeed {
  return {
    name,
    type: "examination",
    ranges: [],
    noNormalRange: true,
    note,
    sources: [source],
  };
}

const examSeeds: CatalogReferenceSeed[] = [
  descriptiveExam(
    "A-Scan Biometry",
    {
      name: "Axial Length / الطول المحوري",
      text: "يُفسر حسب العمر والانكسار وطريقة القياس؛ ليس لكل الأطوال مدى صحي موحد",
      unit: "mm",
    },
    eyeSources.ultrasound,
  ),
  descriptiveExam(
    "Amsler Grid",
    {
      name: "تقييم شبكة أمسلر — نوعي",
      text: "خطوط مستقيمة ومتواصلة بلا مناطق مفقودة أو تشوه؛ لا يستبعد كل أمراض الشبكية",
    },
    "https://aao.org/eye-health/diseases/amd-macular-degeneration",
  ),
  {
    name: "Applanation Tonometry",
    type: "examination",
    ranges: [numeric("IOP — مرجع شائع للبالغين", "10", "21", "mmHg")],
    noNormalRange: false,
    note: "مدى استرشادي لا هدف علاجي؛ يتأثر القياس بالقرنية والميكانيكا. وجود الضغط داخل المدى لا ينفي الجلوكوما.",
    sources: [
      eyeSources.pressure,
      "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma/glaucoma-and-eye-pressure",
    ],
  },
  noIntervalExam(
    "Autorefraction",
    "الانكسار الآلي يقيس Sphere/Cylinder/Axis للمريض ولا له مدى صحي ±4 D. يراجع طبيًا مع المطابقة والتصحيح الذاتي/شل المطابقة عند اللزوم.",
    eyeSources.refraction,
  ),
  descriptiveExam(
    "B-Scan Ultrasound",
    {
      name: "تقييم القطاع الخلفي — نوعي",
      text: "عدم وجود آفة مرضية ظاهرة وفق تقرير المختص؛ نتيجة تصوير وليست رقمًا واحدًا",
    },
    eyeSources.ultrasound,
  ),
  {
    name: "Biometry (IOL Master)",
    type: "examination",
    ranges: [
      textual("AL / الطول المحوري", "حسب العمر والانكسار ومرجع الجهاز", "mm"),
      textual("K / تقوس القرنية", "حسب الجهاز وطريقة القياس", "D"),
      textual(
        "ACD / عمق الحجرة الأمامية",
        "حسب العمر والتشريح ومرجع الجهاز",
        "mm",
      ),
    ],
    noNormalRange: false,
    note: "القياسات تُدخل في حساب العدسة؛ حدود قدرة الجهاز على القياس ليست مديات بيولوجية طبيعية. الملاحظات السابقة غير الموثقة أدناه لا تعد مرجعًا معتمدًا بهذا التحديث.",
    sources: [eyeSources.biometry],
  },
  descriptiveExam(
    "Color Vision",
    {
      name: "تمييز الألوان — حسب الاختبار",
      text: "إجابات صحيحة وفق إصدار Ishihara/HRR/Farnsworth المستخدم؛ لا عدد ألواح موحد",
    },
    "https://medlineplus.gov/ency/article/003387.htm",
  ),
  descriptiveExam(
    "Contrast Sensitivity",
    {
      name: "حساسية التباين",
      text: "مقارنة بمرجع الاختبار والعمر والإضاءة؛ يلزم تحديد Pelli–Robson أو Mars وغيره",
    },
    "https://eyewiki.aao.org/Preoperative_Evaluation_for_LASIK_Surgery",
  ),
  descriptiveExam(
    "Corneal Hysteresis",
    {
      name: "CH — حسب جهاز ORA",
      text: "حسب توزيع الجهاز المرجعي والسياق؛ لا يُخمن مدى من المتوسط السكاني",
      unit: "mmHg",
    },
    "https://www.reichert.com/en/products/discontinued-ocular-response-analyzer-2nd-gen",
  ),
  descriptiveExam(
    "Corneal Sensitivity",
    {
      name: "حساسية القرنية — Cochet–Bonnet فقط",
      text: "استجابة عند خيط بطول 60 mm كمرجع الطريقة؛ يلزم تحديد الموضع والبروتوكول",
      unit: "mm",
    },
    "https://eyewiki.aao.org/Corneal_Neurotization_for_Neurotrophic_Keratitis",
  ),
  descriptiveExam(
    "Corneal Staining (Fluorescein)",
    {
      name: "صبغة سطح القرنية — نوعي",
      text: "غياب صبغ مرضي أو عيب ظهاري؛ الدرجة الرقمية حسب مقياس Oxford/NEI المحدد",
    },
    eyeSources.dry,
  ),
  descriptiveExam(
    "Corneal Topography",
    {
      name: "خرائط القرنية",
      text: "نمط منتظم مع تفسير مؤشرات الجهاز؛ التقوس وحده لا يقرر سلامة القرنية",
    },
    eyeSources.topography,
  ),
  descriptiveExam(
    "Dilated Fundus Exam",
    {
      name: "قاع العين بعد التوسيع — نوعي",
      text: "عدم وجود تغير مرضي ظاهر بالشبكية أو العصب أو الجسم الزجاجي وفق فحص الطبيب",
    },
    eyeSources.fundus,
  ),
  noIntervalExam(
    "Dry Eye Questionnaire",
    "اسم الاستبيان غير محدد؛ يلزم تحديد OSDI أو DEQ-5 أو غيره قبل اعتماد حدود الدرجة. لا يعمم مدى استبيان على الآخر.",
    eyeSources.dry,
  ),
  descriptiveExam(
    "Endothelial Cell Count",
    {
      name: "ECD / كثافة الخلايا",
      text: "مقارنة بمرجع الجهاز والفئة العمرية مع تقييم شكل الخلايا؛ لا مدى موحد",
      unit: "cells/mm²",
    },
    eyeSources.endothelium,
  ),
  descriptiveExam(
    "Fluorescein Staining",
    {
      name: "صبغ سطح العين — نوعي",
      text: "غياب صبغ مرضي وفق بروتوكول الفحص؛ يؤكد أنه صبغ سطح وليس تصوير أوعية",
    },
    eyeSources.dry,
  ),
  descriptiveExam(
    "Gonioscopy",
    {
      name: "زاوية مفتوحة — Shaffer فقط",
      text: "الدرجتان 3–4 تدلان على زاوية مفتوحة في Shaffer؛ يفحص التصبغ والالتصاقات أيضًا",
      unit: "grade",
    },
    "https://eyewiki.aao.org/Gonioscopy",
  ),
  noIntervalExam(
    "Intraocular Lens Calculation",
    "قدرة العدسة محسوبة لكل مريض حسب المعادلة والثوابت والهدف الانكساري؛ لا توجد قدرة طبيعية عامة للعدسة.",
    "https://zcalc.meditec.zeiss.com/",
  ),
  {
    name: "Intraocular Pressure (IOP)",
    type: "examination",
    ranges: [numeric("IOP — مرجع شائع للبالغين", "10", "21", "mmHg")],
    noNormalRange: false,
    note: "ليس هدف علاج فرديًا ولا ينفي الجلوكوما داخل المدى. تراجع طريقة القياس وسمك القرنية والأعراض والعصب.",
    sources: [
      eyeSources.pressure,
      "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma/glaucoma-and-eye-pressure",
    ],
  },
  {
    name: "Keratometry (K1/K2)",
    type: "examination",
    ranges: [
      textual(
        "K1 / المحور المسطح",
        "مرجع الجهاز والسياق الانكساري؛ لا حد تشخيص عام",
        "D",
      ),
      textual(
        "K2 / المحور المحدب",
        "مرجع الجهاز والسياق الانكساري؛ يراجع مع K1 والخرائط",
        "D",
      ),
    ],
    noNormalRange: false,
    note: "لا يُعمم المدى السابق 40–47 D على كل الأجهزة والأعمار أو على تشخيص القرنية المخروطية.",
    sources: [eyeSources.topography],
  },
  descriptiveExam(
    "Lens Grading",
    {
      name: "تقييم العدسة — نوعي",
      text: "عدسة صافية بلا عتامة مرضية مهمة؛ لا درجة رقمية قبل تحديد نظام التصنيف",
    },
    eyeSources.slit,
  ),
  descriptiveExam(
    "Lid Margin Assessment",
    {
      name: "حافة الجفن — نوعي",
      text: "غياب التهاب أو آفة مرضية بحسب الفحص السريري",
    },
    "https://eyewiki.org/Blepharitis",
  ),
  descriptiveExam(
    "Macular Exam",
    {
      name: "تقييم البقعة — نوعي",
      text: "عدم وجود تغير مرضي ظاهر وفق فحص الطبيب؛ يراجع التصوير عند اللزوم",
    },
    eyeSources.fundus,
  ),
  descriptiveExam(
    "Meibomian Gland Evaluation",
    {
      name: "الغدد الميبومية — نوعي",
      text: "إفراز فسيولوجي وغدد سالكة دون فقد مرضي؛ درجات الإفراز والتصوير حسب الطريقة",
    },
    "https://eyewiki.aao.org/Meibomian_Gland_Dysfunction_%28MGD%29",
  ),
  descriptiveExam(
    "Optic Disc Evaluation",
    {
      name: "تقييم العصب والحافة — نوعي",
      text: "حافة عصبية سليمة بلا تغير مرضي؛ نسبة الكوب تفسر مع حجم القرص وليست مدى 0.4–0.5",
    },
    "https://eyewiki.aao.org/Examination_of_the_optic_nerve_at_the_slit-lamp_biomicroscope_with_a_handheld_lens",
  ),
  descriptiveExam(
    "Pachymetry (Corneal Thickness)",
    {
      name: "CCT / سمك القرنية المركزي",
      text: "حسب العمر والسكان والجهاز وموضع القياس؛ المتوسط السكاني ليس حدودًا عامة",
      unit: "µm",
    },
    eyeSources.topography,
  ),
  {
    name: "Pentacam (Corneal Tomography)",
    type: "examination",
    ranges: [
      textual(
        "السمك / CCT وThinnest",
        "حسب قاعدة الجهاز والعمر وموضع القياس",
        "µm",
      ),
      textual("الانحناء / K1 وK2", "حسب خرائط الجهاز والسياق السريري", "D"),
      textual(
        "الارتفاع / Elevation",
        "حسب سطح المرجع والخريطة والبروتوكول",
        "µm",
      ),
      textual(
        "BAD-D ومؤشرات الجهاز",
        "حسب إصدار البرنامج وقاعدة الجهاز؛ ليست حدودًا موحدة لكل المرضى",
      ),
    ],
    noNormalRange: false,
    note: "البنتاكام متعدد القياسات؛ لا يوضع له مدى واحد ولا ينقل حد BAD-D من إصدار أو فئة أخرى دون تحقق.",
    sources: [
      "https://www.oculus.de/en/products/pentacam/?rc=1",
      eyeSources.topography,
    ],
  },
  noIntervalExam(
    "Power PF IOL",
    "اسم الخدمة المختصر يحتاج تأكيد المقصود؛ إذا كان قدرة العدسة فهي حساب فردي حسب العدسة والمعادلة والهدف، وليست قيمة لها مدى طبيعي موحد.",
    "https://zcalc.meditec.zeiss.com/",
  ),
  {
    name: "Pupil Assessment",
    type: "examination",
    ranges: [
      numeric("قطر الحدقة في الضوء — بالغون", "2", "4", "mm"),
      numeric("قطر الحدقة في الظلام — بالغون", "4", "8", "mm"),
      textual(
        "التفاعل والتناظر — نوعي",
        "تراجع استجابة الضوء والاختلاف بين العينين ضمن الفحص العصبي",
      ),
    ],
    noNormalRange: false,
    note: "القيم وصفية للبالغين مشروطة بالإضاءة؛ تتأثر بالعمر والأدوية ولا تطبق على الأطفال أو على كل ظروف الفحص.",
    sources: [eyeSources.pupils],
  },
  noIntervalExam(
    "Refraction",
    "Sphere/Cylinder/Axis قياسات فردية لتحديد التصحيح وليست نطاقًا صحيًا ±4 D؛ يقيم الطبيب الأخطاء الانكسارية والتصحيح المناسب.",
    eyeSources.refraction,
  ),
  descriptiveExam(
    "Schirmer Test",
    {
      name: "إفراز الدموع — حسب البروتوكول",
      text: "يلزم تحديد التخدير والتحفيز الانعكاسي وزمن الاختبار قبل حدود التفسير؛ لا مدى 15–10",
      unit: "mm/5 min",
    },
    eyeSources.dry,
  ),
  descriptiveExam(
    "Slit Lamp Exam",
    {
      name: "القطاع الأمامي — نوعي",
      text: "عدم وجود تغير مرضي ظاهر؛ يوثق الجفن والملتحمة والقرنية والحجرة والعدسة منفصلة",
    },
    eyeSources.slit,
  ),
  {
    name: "Specular Microscopy",
    type: "examination",
    ranges: [
      textual("ECD / كثافة الخلايا", "حسب الفئة العمرية والجهاز", "cells/mm²"),
      textual(
        "Hexagonality / سداسية الخلايا",
        "حسب طريقة التحليل ومرجع الجهاز",
        "%",
      ),
      textual(
        "Coefficient of variation / اختلاف الأحجام",
        "حسب طريقة التحليل ومرجع الجهاز",
      ),
    ],
    noNormalRange: false,
    note: "الكثافة والشكل واختلاف الحجم مكونات مستقلة؛ لا يعمم مدى كثافة واحد لكل الأعمار.",
    sources: [eyeSources.endothelium],
  },
  descriptiveExam(
    "Stereopsis",
    {
      name: "الرؤية المجسمة",
      text: "موجودة حسب الاختبار؛ القدرة الرقمية تقارن بمرجع اللوحة والعمر والمحاذاة",
      unit: "arcsec",
    },
    "https://eyewiki.aao.org/Stereopsis_and_Tests_for_Stereopsis",
  ),
  descriptiveExam(
    "Tear Breakup Time (TBUT)",
    {
      name: "TBUT بالفلوريسين — معيار استرشادي",
      text: "نحو 10 ثوانٍ أو أكثر؛ لا حد أعلى عام؛ يراجع بروتوكول القياس",
      unit: "s",
    },
    eyeSources.dry,
  ),
  descriptiveExam(
    "Visual Acuity (BCVA)",
    {
      name: "أفضل حدة إبصار مصححة — بالغون",
      text: "20/20 أو 6/6 أو logMAR 0 معيار استرشادي؛ قد يكون الإبصار أفضل",
    },
    eyeSources.acuity,
  ),
  descriptiveExam(
    "Visual Acuity (UCVA)",
    {
      name: "حدة الإبصار بدون تصحيح",
      text: "تسجل لكل عين وتفسر مع الانكسار والعمر واللوحة؛ لا يفرض معيار BCVA على UCVA",
    },
    eyeSources.acuity,
  ),
  descriptiveExam(
    "Visual Field (Goldmann)",
    {
      name: "مجال حركي / Isopters",
      text: "غياب عيب مرضي للبقعة الضوئية والبروتوكول المختارين؛ ليس مرجع MD لهامفري",
    },
    eyeSources.fields,
  ),
  descriptiveExam(
    "Visual Field (Humphrey)",
    {
      name: "المجال الثابت — مرجع الجهاز",
      text: "ضمن حدود الجهاز الملائمة للعمر مع موثوقية جيدة؛ MD/PSD/VFI تفسر مع البرنامج والنمط",
    },
    eyeSources.fields,
  ),
];

function imagingReference(
  name: string,
  reference: { name: string; text: string; unit?: string },
  source: string,
): CatalogReferenceSeed {
  return {
    name,
    type: "imaging",
    ranges: [textual(reference.name, reference.text, reference.unit)],
    noNormalRange: false,
    note: "تفسير وصفي/مقارنة بجهاز محدد وليس مدى WHO عدديًا عامًا. تعتمد القياسات على الجهاز والإصدار والعمر وجودة الصورة والتقسيم؛ النتيجة يراجعها المختص.",
    sources: [source],
  };
}
const imagingSeeds: CatalogReferenceSeed[] = [
  imagingReference(
    "Anterior Segment OCT",
    {
      name: "القرنية والحجرة والزاوية",
      text: "تقييم البنية والقياسات وفق بروتوكول الجهاز ومرجعه؛ لا مدى واحد للفحص",
    },
    "https://asset-downloads.zeiss.com/catalogs/download/med2/aeb1432f-1d2e-44d5-99f3-78c73fa6d1d9/CIRRUS-PathFinder-Brochure-en-OUS_31_020_0021VII.pdf",
  ),
  imagingReference(
    "Fluorescein Angiography (FA)",
    {
      name: "مراحل الامتلاء والتسرب",
      text: "تفسير الامتلاء ونمط الصبغة والتسرب ونقص التروية وفق التقرير؛ لا رقم واحد للفحص",
    },
    "https://eyewiki.aao.org/Fluorescein_Angiography",
  ),
  imagingReference(
    "Fundus Photography",
    {
      name: "صورة قاع العين",
      text: "مراجعة الشبكية والبقعة والعصب والأوعية مع التاريخ والفحص؛ لا قيمة رقمية واحدة للصورة",
    },
    eyeSources.fundus,
  ),
  imagingReference(
    "Indocyanine Green Angiography (ICGA)",
    {
      name: "أوعية المشيمية",
      text: "تفسير نمط الأوعية ومراحل التصوير حسب التقرير السريري",
    },
    "https://eyewiki.aao.org/Indocyanine_Green_Angiography",
  ),
  imagingReference(
    "MRI Orbit",
    {
      name: "الحجاج والعصب البصري",
      text: "تقييم تراكيب الحجاج والأنسجة والعصب حسب سبب الطلب والبروتوكول وتقرير الأشعة",
    },
    "https://www.radiologyinfo.org/en/info/acs-orbits-vision-visual-loss",
  ),
  imagingReference(
    "Occular Sonar",
    {
      name: "الموجات الصوتية للعين",
      text: "تفسير الصور حسب نوع الفحص والغرض منه؛ الاسم العام لا يحدد مدى طول محوري",
    },
    "https://moorfields.nhs.uk/for-patients/information-hub/ultrasound",
  ),
  imagingReference(
    "OCT Angiography (OCTA)",
    {
      name: "التروية وخرائط الأوعية",
      text: "حسب طبقة التقسيم ومقاس المسح والخوارزمية؛ لا تعمم كثافة وعائية بين الأجهزة",
    },
    "https://eyewiki.aao.org/Optical_Coherence_Tomography_Angiography",
  ),
  imagingReference(
    "OCT Macula",
    {
      name: "سمك وتركيب البقعة",
      text: "مقارنة بقاعدة الجهاز ومراجعة البنية والتقسيم؛ لا أرقام من جهاز مختلف",
      unit: "µm",
    },
    "https://www.zeiss.com/meditec/en/products/optical-coherence-tomography-devices/cirrus-6000-performance-oct.html",
  ),
  imagingReference(
    "OCT RNFL",
    {
      name: "سمك ألياف العصب",
      text: "ضمن قاعدة الجهاز الملائمة للعمر وحجم القرص عند انطباقها؛ لا مدى ثابت لكل الأعمار",
      unit: "µm",
    },
    "https://asset-downloads.zeiss.com/catalogs/download/med2/90f971a7-cbdd-422e-bb8e-bc97f48dcf8c/CIRRUS_OCT_Glaucoma_Essentials_Guide_EN.pdf",
  ),
  imagingReference(
    "Orbital CT",
    {
      name: "عظام وتراكيب الحجاج",
      text: "تقرير اختصاصي الأشعة للعظام والتكلسات والأجسام الغريبة حسب سبب الطلب",
    },
    "https://www.radiologyinfo.org/en/info/acs-orbits-vision-visual-loss",
  ),
  imagingReference(
    "Retinal Photography",
    {
      name: "صور الشبكية",
      text: "مراجعة بواسطة المختص مع المعلومات السريرية؛ النتيجة وصفية وليست مدى رقميًا موحدًا",
    },
    "https://www.gloshospitals.nhs.uk/your-visit/patient-information-leaflets/retina-eye-imaging-appointment/",
  ),
  imagingReference(
    "Ultrasound Biomicroscopy (UBM)",
    {
      name: "القطاع الأمامي بالموجات الصوتية",
      text: "البنية والزاوية والقياسات المحددة حسب البروتوكول والتقرير؛ لا مدى للفحص الكامل",
    },
    "https://eyewiki.aao.org/Ultrasound_Biomicroscopy",
  ),
];

const otherSeeds: CatalogReferenceSeed[] = [
  {
    name: "رسم قلب",
    type: "other",
    ranges: [
      numeric("معدل القلب أثناء الراحة — بالغون", "60", "100", "bpm"),
      numeric("PR — بالغون", "120", "200", "ms"),
      textual(
        "QTc — رجال بالغون؛ حد الإطالة",
        "أطول من 450 يُعد حدًا عمليًا للإطالة؛ القصير ≤390 يحتاج تقييمًا",
        "ms",
      ),
      textual(
        "QTc — سيدات بالغات؛ حد الإطالة",
        "460 أو أكثر حد عملي للإطالة؛ القصير ≤390 يحتاج تقييمًا",
        "ms",
      ),
    ],
    noNormalRange: false,
    note: "مراجع قياسات وليست حكمًا على سلامة التخطيط أو تصريح FIT. QTc حسب معادلة التصحيح والنبض والأدوية والكهارل؛ PR والنبض حسب السياق، ولا تطبق قيم البالغين على الأطفال.",
    sources: [
      "https://www.nhs.uk/conditions/supraventricular-tachycardia-svt/",
      "https://doi.org/10.1136/bmjopen-2021-054238",
      "https://www.jacc.org/doi/10.1016/j.jacc.2008.12.014",
    ],
  },
  ...["عـرض باطنـه", "عـرض قلب", "عرض اسنان", "عرض انف و اذن و حنجره"].map(
    (name): CatalogReferenceSeed => ({
      name,
      type: "other",
      ranges: [],
      noNormalRange: true,
      note: "تصنيف من اسم الكتالوج: استشارة تخصصية وليست قياسًا له مدى طبيعي. النتيجة والقرار في تقرير المختص؛ لا يسند FIT أو تصريح طبي تلقائيًا.",
      sources: [],
    }),
  ),
];

export const CATALOG_REFERENCE_SEED: CatalogReferenceSeed[] = [
  ...labSeeds,
  ...examSeeds,
  ...imagingSeeds,
  ...otherSeeds,
];
