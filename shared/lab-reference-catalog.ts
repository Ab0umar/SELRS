export type LabReferenceEntry = {
  name: string;
  normalRange: string;
  unit: string;
  note: string;
  sources: string[];
  replaceKnownIncorrectRange?: string;
};

export const LAB_REFERENCE_REVIEW_DATE = "2026-10-07";
export const LAB_REFERENCE_CATALOG: LabReferenceEntry[] = [
  {
    name: "ESR",
    normalRange: "يختلف حسب العمر والجنس والطريقة؛ راجع الوصف",
    unit: "mm/h",
    note: "مرجع UChicago بطريقة Alifax: عمر 18–44 سنة، ذكور 0–15 وإناث 0–20 mm/h. من عمر 45 سنة تختلف الفئات والحدود حسب السن والجنس؛ لم يُفترض حد موحد لكبار السن. راجع مدى المعمل وطريقة القياس؛ لا يمثل المدى المذكور جميع الأعمار.",
    sources: ["https://uchicagomedlabs.testcatalog.org/show/ESR-1"],
  },
  {
    name: "CRP",
    normalRange: "<5",
    unit: "mg/L",
    note: "مرجع Mayo لفحص CRP القياسي أقل من 5 mg/L. ليس hs-CRP ولا تُطبق عليه فئات خطر القلب. يُراجع نوع الاختبار وطريقة المعمل؛ ارتفاعه غير نوعي ولا يشخّص مرضًا بمفرده.",
    sources: ["https://prd1.mayocliniclabs.com/test-catalog/Overview/800164"],
  },
  {
    name: "RF",
    normalRange: "<15",
    unit: "IU/mL",
    note: "مرجع Mayo RHUT بطريقة Turbidimetry: أقل من 15 IU/mL. لا يُطبّق على اختبارات RF-isotypes الأخرى، ويُراجع معمل القياس. النتيجة وحدها لا تشخّص الروماتويد.",
    sources: ["https://www.mayocliniclabs.com/test-catalog/overview/603415"],
  },
  {
    name: "TSH",
    normalRange: "لعمر ≥20 سنة وغير الحوامل: راجع الوصف",
    unit: "mIU/L",
    note: "مرجع Mayo STSH لمن بلغوا 20 سنة وغير الحوامل: 0.3–4.2 mIU/L. الأصغر من 20 سنة والحوامل لهم مديات منفصلة. يوضع المدى في الوصف لتجنب تطبيقه آليًا على عمر/فئة غير مناسبة؛ يُراجع مع Free T4 وطريقة المعمل.",
    sources: [
      "https://www.mayocliniclabs.com/api/sitecore/testcatalog/TestCatalogSetupPDF?testid=800096",
    ],
  },
  {
    name: "Creatinine",
    normalRange: "يختلف حسب الجنس والعمر؛ راجع الوصف",
    unit: "mg/dL",
    note: "مرجع Mayo للبالغين: ذكور 0.74–1.35 mg/dL، إناث 0.59–1.04 mg/dL. لا يُستبدل بالمدى الخاص بالأطفال أو بطريقة معمل مختلفة، ويُفسّر مع eGFR والعوامل السريرية. لا يجمع مدى الجنسين في حد رقمي واحد.",
    sources: ["https://www.mayocliniclabs.com/test-catalog/overview/48216"],
  },
  {
    name: "ANA",
    normalRange: "Negative / سلبي؛ الحد يعتمد على طريقة الفحص",
    unit: "",
    note: "المرجع النوعي سلبي. تختلف طريقة ELISA ووحداتها عن IFA وتخفيفاتها، لذلك لم يوضع حد رقمي موحد لتحليل ANA غير محدد الطريقة. النتيجة وحدها لا تؤكد أو تنفي مرضًا مناعيًا.",
    sources: [
      "https://prd1.mayocliniclabs.com/test-catalog/overview/9026",
      "https://prd1.mayocliniclabs.com/test-catalog/overview/65161",
    ],
  },
  {
    name: "HBsAg",
    normalRange: "Negative / Nonreactive",
    unit: "",
    note: "المرجع لفحص مستضد سطح التهاب الكبد B النوعي: سلبي/غير تفاعلي. ليس anti-HBs ولا HBsAg الكمي؛ تحتاج النتيجة التفاعلية إلى تأكيد مناسب، وقد لا ينفي الفحص السلبي عدوى حديثة.",
    sources: [
      "https://www.mayocliniclabs.com/test-catalog/download-setup?format=pdf&unit_code=610466",
    ],
  },
  {
    name: "HCV Ab",
    normalRange: "Negative / Nonreactive",
    unit: "",
    note: "المرجع النوعي للأجسام المضادة لـHCV: سلبي/غير تفاعلي. النتيجة التفاعلية تحتاج تقييم HCV RNA ولا تميّز وحدها العدوى النشطة من السابقة؛ السلبية لا تنفي عدوى حديثة جدًا.",
    sources: ["https://www.mayocliniclabs.com/test-catalog/Overview/113122"],
  },
  {
    name: "HIV",
    normalRange: "Negative / Nonreactive للفحص النوعي",
    unit: "",
    note: "مرجع استرشادي لفحص HIV Ag/Ab النوعي: سلبي/غير تفاعلي. اسم الطلب لا يحدد طريقة الفحص، لذا يجب التحقق منها؛ لا ينطبق على viral load الكمي. التفاعلي يحتاج خوارزمية تأكيد، والسلبي لا ينفي العدوى في فترة النافذة.",
    sources: ["https://prd1.mayocliniclabs.com/test-catalog/Overview/620858"],
  },
  {
    name: "PT/INR",
    normalRange: "اختباران بوحدتين مختلفتين؛ راجع الوصف",
    unit: "",
    note: "مثال Mayo PTTP لغير متناولي مضادات التخثر: PT 9.4–12.5 ثانية، INR 0.9–1.1 دون وحدة. حدود الطريقة قد تختلف. أهداف العلاج بالوارفارين ليست مدى الأشخاص الأصحاء؛ لا تُطبق هذه القيم على ضبط العلاج.",
    sources: ["https://prd1.mayocliniclabs.com/test-catalog/overview/40934"],
  },
  {
    name: "Prothrombine Time & Activity",
    normalRange: "الزمن والنشاط حسب طريقة المعمل؛ راجع الوصف",
    unit: "",
    note: "PT يُقاس بالثواني: مثال مرجع Mayo PTTP هو 9.4–12.5 ثانية لغير المعالجين بمضادات التخثر. Prothrombin Activity نسبة تعتمد على الكاشف والمعايرة؛ لم يُخمن لها مدى موحد. لا تُدمج الثانية والنسبة في وحدة أو مدى واحد.",
    sources: ["https://prd1.mayocliniclabs.com/test-catalog/overview/40934"],
  },
  {
    name: "Serum Urea & Creatinine",
    normalRange: "فحص مركب؛ مديات ووحدات منفصلة في الوصف",
    unit: "",
    note: "اليوريا بعمر ≥18 سنة حسب Oxford: 2.5–7.8 mmol/L. الكرياتينين للبالغين حسب Mayo: ذكور 0.74–1.35 وإناث 0.59–1.04 mg/dL. هما اختباران بوحدتين مختلفتين؛ لا يُجمعان في حد واحد ولا تُستبدل اليوريا بـBUN.",
    sources: [
      "https://www.ouh.nhs.uk/biochemistry/tests/tests-catalogue/urea/",
      "https://www.mayocliniclabs.com/test-catalog/overview/48216",
    ],
  },
  {
    name: "Culture & Sensitvity",
    normalRange: "التفسير حسب نوع العينة والميكروب؛ لا مدى رقمي موحد",
    unit: "",
    note: "المزرعة والحساسية ليستا قيمة رقمية واحدة. بعض العينات قد تظهر فلورا طبيعية، وأخرى يُتوقع فيها عدم النمو؛ لا يُعمم No growth على كل المزارع. الحساسية تفسّر لكل مضاد حسب الكائن والطريقة؛ يجب تحديد نوع العينة ومراجعة تقرير المعمل.",
    sources: [
      "https://www.testcatalog.org/show/URNS",
      "https://sjhnhlab.testcatalog.org/show/WDC",
    ],
  },
  {
    name: "HbA1c",
    normalRange: "4.0 - 5.6",
    unit: "%",
    replaceKnownIncorrectRange: "5.7% - 6.4%",
    note: "مرجع Mayo المنشور: 4.0–5.6%. التصنيف للبالغين: 5.7–6.4% زيادة خطر/ما قبل السكري، و≥6.5% حد تشخيص وليس هدف علاج؛ يُفسّر ويُؤكّد طبيًا. ليس مرجعًا مستقلًا للأطفال أو الحمل، وقد تتأثر النتيجة بأمراض الهيموجلوبين وعمر كريات الدم.",
    sources: [
      "https://www.mayocliniclabs.com/test-catalog/Overview/610441",
      "https://www.who.int/publications/i/item/use-of-glycated-haemoglobin-%28-hba1c%29-in-diagnosis-of-diabetes-mellitus",
    ],
  },
  {
    name: "Fasting Blood Sugar (FBS)",
    normalRange: "أقل من 100؛ حد تصنيف للصائم وليس مدى كاملًا",
    unit: "mg/dL",
    note: "للصائم غير الحامل: أقل من 100 mg/dL حد التصنيف الطبيعي حسب NIDDK، و100–125 ما قبل السكري، و≥126 حد تشخيص يستلزم تقييمًا/تأكيدًا طبيًا. الصيام ثماني ساعات على الأقل. الحد المذكور لا يعرّف الحد المنخفض الآمن ولا ينفي نقص السكر؛ يُراجع مدى المعمل عند القيم المنخفضة.",
    sources: [
      "https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis",
    ],
  },
  {
    name: "Randum Blood Sugar",
    normalRange: "70 - 140",
    unit: "mg/dL",
    note: "مرجع Mayo لسكر المصل العشوائي: 70–140 mg/dL. ليس معيارًا موحدًا لكل المعامل ولا اختبار تحمل الجلوكوز أو هدف علاج لمرضى السكري. لا تُستخدم النتيجة وحدها للتشخيص؛ يعتمد التفسير على الأعراض والوجبة وطريقة القياس والحمل.",
    sources: ["https://www.mayocliniclabs.com/test-catalog/overview/89115"],
  },
  {
    name: "Urea",
    normalRange: "2.5 - 7.8",
    unit: "mmol/L",
    note: "مرجع Oxford University Hospitals لليوريا في الدم بعمر 18 سنة فأكثر. الوحدة mmol/L؛ لا تقارن مباشرة بـmg/dL ولا تستخدم هذا المدى لـBUN أو للبول. تُراجع الوحدة وطريقة المعمل قبل التفسير.",
    sources: [
      "https://www.ouh.nhs.uk/biochemistry/tests/tests-catalogue/urea/",
    ],
  },
  {
    name: "CBC",
    normalRange: "فحص مركب؛ لكل مكوّن مدى حسب السن والجنس",
    unit: "",
    note: "CBC ليس قيمة واحدة: كريات الدم والهيموجلوبين والهيماتوكريت والصفائح ومؤشرات الكريات لها مديات ووحدات مستقلة. لا يُسند لهذا الطلب مدى رقمي واحد، ويُرجع إلى تقرير المعمل لكل مكوّن حسب العمر والجنس.",
    sources: [
      "https://www.mayocliniclabs.com/test-catalog/overview/9109/complete-blood-cell-count-cbc-with-differential-blood",
    ],
  },
  {
    name: "Lipid Profile",
    normalRange: "فحص مركب؛ أهداف كل مكوّن حسب خطر القلب",
    unit: "",
    note: "الكوليسترول الكلي وHDL وLDL والدهون الثلاثية تُفسّر منفصلة، وأهدافها العلاجية تعتمد على خطر القلب والعمر. لا يوجد مدى رقمي واحد للطلب، وحدود الخطر/الأهداف ليست مرادفة لمدى بيولوجي طبيعي.",
    sources: ["https://www.mayocliniclabs.com/test-catalog/Overview/616696"],
  },
];

export type LabCatalogRow = {
  id: number;
  name: string;
  type: string;
  normalRange: string | null;
  unit: string | null;
  description: string | null;
};

export function planLabReferenceUpdate(
  row: LabCatalogRow,
  references = LAB_REFERENCE_CATALOG,
) {
  if (row.type !== "lab") return null;
  const reference = references.find((entry) => entry.name === row.name);
  if (!reference) return null;
  const oldRange = String(row.normalRange ?? "").trim();
  if (oldRange && oldRange !== reference.replaceKnownIncorrectRange)
    return null;
  if (String(row.unit ?? "").trim() && row.unit !== reference.unit) return null;
  const description = [
    row.description?.trim(),
    `مرجع استرشادي منشور — ${LAB_REFERENCE_REVIEW_DATE}. لم يُتحقق من مطابقته لطريقة المعمل المحلي، وليس اعتمادًا طبيًا أو بديلًا عن تقرير المعمل. للبالغين غير الحوامل ما لم يذكر خلاف ذلك؛ لا يُطبّق تلقائيًا على الأطفال أو الحمل.`,
    reference.note,
    `المصادر: ${reference.sources.join(" | ")}`,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id: row.id,
    name: row.name,
    normalRange: reference.normalRange,
    unit: reference.unit,
    description,
  };
}
