import { marketingTopicIdentity } from "./topicIdentity";

type Visual = {
  medium: "medical-illustration" | "equipment-photograph";
  subject: string;
  guard: string;
  equipmentKind?: "pentacam" | "slit-lamp";
};
const illustration = (subject: string, guard: string): Visual => ({
  medium: "medical-illustration",
  subject,
  guard,
});
const equipment = (
  equipmentKind: "pentacam" | "slit-lamp",
  subject: string,
  guard: string,
): Visual => ({
  medium: "medical-illustration",
  equipmentKind,
  subject,
  guard,
});
const visuals: Record<string, Visual> = {
  LASIK: illustration(
    "A clear medical illustration of a corneal cross-section explaining laser refractive-correction context, with a thin hinged corneal flap and the reshaping area confined to the cornea.",
    "Do not show a visible laser beam travelling through the lens or retina; no surgery photograph, instruments or routine eye exam.",
  ),
  "Femto LASIK": illustration(
    "A precise corneal cross-section showing the thin hinged flap plane used in femtosecond-assisted LASIK, with the flap clearly distinguished from the deeper corneal tissue.",
    "Do not confuse a corneal flap with removing the whole cornea; no glowing laser spectacle or invented machine.",
  ),
  PRK: illustration(
    "An explanatory medical illustration of surface laser reshaping of the cornea, with no flap; show a small enlarged corneal surface detail.",
    "PRK has no LASIK flap. No slit-lamp examination, exposed surgical eye, instruments or dramatic laser beam.",
  ),
  "ICL لتصحيح الإبصار": illustration(
    "A simplified anterior-eye cutaway showing a thin implantable collamer lens behind the iris and in front of the natural crystalline lens, which remains present.",
    "Keep the implant distinct from the natural lens; do not put it on the corneal surface or depict cataract lens replacement.",
  ),
  "الاستيغماتيزم (اللابؤرية)": illustration(
    "A clear optical medical illustration comparing regular and unequal corneal curvature, using a small number of simple light-ray paths to explain distorted focus.",
    "No decorative city bokeh, cosmetic eye portrait or guaranteed before-and-after surgical result.",
  ),
  البنتاكام: equipment(
    "pentacam",
    "An educational medical illustration of a transparent three-dimensional corneal surface alongside schematic anterior/posterior surface and thickness maps, explaining what Pentacam imaging measures.",
    "A real device photo is inserted separately when assigned by the operator. Never generate a photographic imitation of a Pentacam, autorefractor or other machine. No fabricated map numbers, monitor interface or patient results.",
  ),
  "رسم خريطة القرنية": illustration(
    "A dominant three-dimensional corneal surface with a separate schematic curvature map, showing the shape being mapped rather than a monitor displaying a report.",
    "The map is an educational schematic, not a patient result: no fabricated numbers, units, diagnosis, screen interface or equipment wallpaper.",
  ),
  "سماكة القرنية": illustration(
    "An enlarged transparent corneal cross-section with two clearly separated anterior and posterior surfaces; a simple double-ended bracket spans the corneal tissue thickness.",
    "No pen, pachymeter probe, instrument touching an eye, bulging eyeball, fabricated measurement or lens-thickness diagram. The cornea is the thin clear front layer, not the crystalline lens.",
  ),
  "الفحص قبل الليزك": equipment(
    "pentacam",
    "A clear educational illustration of corneal curvature and corneal thickness as separate features checked before refractive surgery.",
    "An assigned real device photo is used separately. Never invent a machine, probe touching an eye, patient data or a suitability result.",
  ),
  "تقنيات تصحيح الإبصار": illustration(
    "One unified educational illustration focused on corneal optical reshaping, with a small separate implant-lens inset only if the final caption discusses lens implants.",
    "No futuristic equipment collage, laser spectacle or implication that one procedure suits everyone.",
  ),
  "المياه البيضاء (الكتاراكت)": illustration(
    "A clean side-view eye cutaway with an enlarged cloudy crystalline lens behind the iris; keep the transparent front cornea distinct and the lens opacity as the dominant subject.",
    "Cataract opacity is in the crystalline lens, not on the cornea. No white liquid, external white spot, blindfold, surgical scene or guaranteed cured-eye comparison.",
  ),
  "العدسات عالية الجودة": illustration(
    "A crisp medical product illustration of an intraocular lens with its optic and two support haptics, accompanied by a small anatomical placement inset.",
    "No contact lens on a fingertip, luxury jewellery, invented packaging, unsupported premium-performance claims or brand names.",
  ),
  "القرنية المخروطية (Keratoconus)": illustration(
    "A side-view medical comparison of a regular corneal contour and a thinner forward-conical corneal contour, with the cornea itself clearly isolated.",
    "Keep the deformation local to the front cornea; no entire cone-shaped eyeball, protruding crystalline lens or surgical tools.",
  ),
  "ربط ألياف القرنية (Cross Linking)": illustration(
    "An enlarged schematic of corneal stromal collagen fibres with the stabilising cross-links highlighted, clearly presented as an explanatory medical illustration.",
    "No glowing blue operating room, visible UV beam through the whole eye, gore, instruments or claims that the cornea instantly becomes normal.",
  ),
  "أمراض القرنية": illustration(
    "A precise anatomical anterior-eye cutaway emphasising the transparent curved cornea and its layers against the iris behind it.",
    "No generic iris macro, tear drop, invented lesions or confusion between cornea and crystalline lens.",
  ),
  "زراعة القرنية": illustration(
    "An educational anterior-eye illustration isolating a circular donor corneal graft at the front surface, with a small section showing its position.",
    "The transplant concerns corneal tissue, not replacing an eyeball or crystalline lens. No surgical hands, blood or fabricated procedure steps.",
  ),
  "جفاف العين": illustration(
    "A focused medical illustration of only the tear film and the smooth corneal epithelial surface underneath it. Two adjacent enlarged surface details compare an uninterrupted thin tear film with small gaps in that superficial film.",
    "Keep the epithelial cells and corneal tissue continuous and intact on both sides: gaps are in the superficial tear film only, never missing corneal cells or tissue wounds. No whole eyeball, iris, crystalline lens, face, decorative tear drop, crying eye or product bottle.",
  ),
  "الجلوكوما (المياه الزرقاء)": illustration(
    "A coherent side-view eye cutaway emphasising the optic nerve exit at the back, with a magnified optic-nerve-head inset.",
    "No blue fluid, swollen eyeball, glowing nerve, invented pressure reading or implication that every case has the same pressure.",
  ),
  "السكري وصحة العين": illustration(
    "An educational posterior-eye/retinal illustration with branching retinal vessels as the dominant medical subject; any change must be schematic and restrained.",
    "No glucose meter replacing the eye subject, fake patient fundus report, exaggerated blood, fabricated grading or diagnostic screen.",
  ),
  "صحة الشبكية": illustration(
    "A clean anatomical eye cutaway showing the retina lining the inner back wall, with a magnified retinal-vessel and macular-area inset.",
    "No generic monitor, slit lamp, gold abstract neural decoration, invented patient fundus photograph or medical report.",
  ),
  "مشاكل الإبصار عند الأطفال": illustration(
    "A child-eye-care educational composition centred on a recognisable trial spectacle frame and a simple vision-testing target, with no people.",
    "No generic smiling child stock photo, girls, faces, invented acuity numbers, diagnosis or guaranteed school performance.",
  ),
  "الفحص الدوري للعيون": equipment(
    "slit-lamp",
    "A clean ophthalmology educational illustration of the front structures of the eye and a small refractive testing lens, explaining routine eye assessment.",
    "An assigned original slit-lamp photograph is used separately. Never invent a biomicroscope or scanner; no surgery, fake UI or patient results.",
  ),
  "إجهاد العيون من الشاشات": illustration(
    "An educational side-view eye and tear-film inset beside a secondary computer screen silhouette, visually explaining the eye surface during screen use.",
    "The eye and tear film must dominate; no generic office stock photo, tear portrait, fabricated radiation beams or claims that screens burn the retina.",
  ),
  // Refraction and vision-correction education.
  "الفرق بين قصر النظر وطول النظر": illustration(
    "Two side-by-side side-view eye optical diagrams: in myopia parallel light rays focus in front of the retina, in hyperopia they focus behind it, using a few simple ray paths.",
    "No blurred city photo, spectacles as the only subject, fabricated prescription numbers or claim that one condition is worse.",
  ),
  "العدسات اللاصقة قبل فحوصات تصحيح الإبصار": illustration(
    "An anterior-eye cross-section with a soft contact lens resting on the cornea and an enlarged inset of the corneal surface beneath it, explaining why lenses can affect corneal measurements.",
    "No contact lens on a fingertip, brand or packaging, specific number of days, damaged cornea or invented machine.",
  ),
  "ما الذي يقيسه فحص انكسار العين؟": illustration(
    "An optical eye diagram showing light bending through the cornea and crystalline lens to a focal point near the retina, with a single trial lens in front showing how the focus is corrected.",
    "Never imitate an autorefractor or other machine; no monitor, fabricated readings or patient results.",
  ),
  "تغير مقاس النظارة وثبات النظر": illustration(
    "Two simple eye optical diagrams with slightly different focal points beside a plain spectacle frame, explaining that refraction can change over time.",
    "No calendar gimmick, fabricated prescription numbers or promise of stability or surgical suitability.",
  ),
  "ما الفرق بين النظارة والعدسات المزروعة؟": illustration(
    "A split illustration: a spectacle lens in front of the eye on one side and, on the other, an anterior-eye cutaway with an implantable lens behind the iris in front of the natural crystalline lens, which remains present.",
    "Keep the implant distinct from the natural lens; no surgery scene, brand names or claim that one option is better.",
  ),
  "أسئلة تسألها لطبيبك قبل تصحيح الإبصار": illustration(
    "A simplified eye cross-section with the cornea highlighted beside a blank consultation notepad marked only with question-mark icons.",
    "No faces or people, readable text, fake checklist, suitability result or guaranteed outcome.",
  ),
  "لماذا قد تظل نظارة القراءة مطلوبة مع التقدم في العمر؟": illustration(
    "A side-view comparison of a flexible younger crystalline lens focusing near light on the retina and a stiffer older lens focusing it behind the retina, with a small reading-glasses inset.",
    "Presbyopia concerns crystalline-lens flexibility, not the cornea; no elderly stock portrait or claim that any procedure removes the need for reading glasses.",
  ),
  "ماذا يعني قياس محور الاستيغماتيزم؟": illustration(
    "A front view of the cornea with its two principal meridians of different curvature drawn as perpendicular lines over a simple 0–180 degree protractor arc.",
    "The axis is an orientation, not a severity; no fabricated prescription values, distorted face or decorative bokeh.",
  ),
  "الفرق بين فحص النظر وفحص صحة العين": illustration(
    "A split illustration: an optical refraction diagram with a trial lens on one side and an anatomical eye cutaway highlighting cornea, lens, retina and optic nerve on the other.",
    "No invented devices, monitor, test results or diagnosis.",
  ),
  "لماذا تختلف خطة تصحيح الإبصار من شخص لآخر؟": illustration(
    "Three small schematic corneal cross-sections side by side with visibly different thickness and curvature.",
    "No ranking of people, patient data, fabricated measurements or guarantee of any procedure.",
  ),
  "ما المعلومات التي تخبر بها طبيبك قبل فحوصات النظر؟": illustration(
    "A simplified eye illustration beside neutral icons for spectacles, a contact lens, an unbranded eye-drop bottle and a clipboard without readable text.",
    "No readable text, brand names, faces, fake forms or patient records.",
  ),
  "كيف تقرأ رموز قصر وطول النظر في وصفة النظارة؟": illustration(
    "A lens schematic comparing a concave minus lens that spreads light rays with a convex plus lens that converges them, labelled only with plain minus and plus symbols.",
    "No realistic prescription sheet, fabricated patient values, brand names or spectacle advertising.",
  ),
  // Cataract, lens implants and cornea.
  "كيف تؤثر المياه البيضاء على وضوح الألوان؟": illustration(
    "An eye cutaway with a yellowish, cloudy crystalline lens and light passing through it, with a small inset colour band appearing muted after the lens.",
    "The opacity is in the crystalline lens, not the cornea; no psychedelic colours, surgery scene or promise of restored colour vision.",
  ),
  "ما الفرق بين المياه البيضاء والمياه الزرقاء؟": illustration(
    "A two-panel comparison: a cloudy crystalline lens behind the iris for cataract, and an optic-nerve-head inset at the back of the eye for glaucoma.",
    "No white or blue liquid, swapped anatomical locations, pressure numbers or diagnosis.",
  ),
  "لماذا تُقاس أبعاد العين قبل زراعة العدسة؟": illustration(
    "A side-view eye cross-section with a simple double-ended line for the length from cornea to retina and the corneal curvature highlighted, with a small intraocular-lens inset.",
    "Never imitate a biometry machine; no device touching the eye, fabricated numbers or patient results.",
  ),
  "الفرق بين العدسة الطبيعية والعدسة المزروعة": illustration(
    "A side-by-side cutaway: the natural crystalline lens in its capsule behind the iris, and an artificial intraocular lens with its optic and two haptics in the same capsular position.",
    "No contact lens, brand names, packaging or performance claims.",
  ),
  "فرك العين وصحة القرنية": illustration(
    "An anterior-eye cross-section focused on the cornea with an enlarged inset of its layered collagen structure and subtle curved arrows indicating outside mechanical pressure.",
    "No hands, injured or red eye, fear imagery or claim that rubbing alone causes a specific disease.",
  ),
  "ماذا يعني تغير شكل القرنية؟": illustration(
    "A side-view comparison of a regular smooth corneal dome and an irregular corneal contour, with a few light rays focusing cleanly versus scattering.",
    "Keep the change confined to the front cornea; no cone-shaped eyeball, fabricated topography map or diagnosis.",
  ),
  "المياه البيضاء وصعوبة القيادة ليلًا": illustration(
    "An eye cutaway with a cloudy crystalline lens scattering light from a single small point source, with an inset schematic of the resulting halo and glare.",
    "No car crash, dramatic road photograph, driving advice or guaranteed improvement.",
  ),
  "لماذا تختلف أنواع العدسات المزروعة؟": illustration(
    "A clean product-style illustration of three generic intraocular lens optic designs: plain, with toric alignment marks, and with concentric rings, each with two haptics.",
    "No brand names, packaging, prices or claims that one design is superior.",
  ),
  "ما الذي تتضمنه متابعة العين بعد جراحة المياه البيضاء؟": illustration(
    "An eye cutaway with a centred intraocular lens in the capsular bag and clear optical media, beside an unbranded eye-drop bottle icon and a calendar icon without text.",
    "No surgery scene, fabricated follow-up schedule, results or faces.",
  ),
  "الفرق بين عتامة العدسة وعتامة القرنية": illustration(
    "A two-panel cutaway contrasting opacity in the crystalline lens behind the iris with haze in the transparent front cornea.",
    "Keep the layers anatomically distinct; no lesions, gore or white spot photographed on an eye surface.",
  ),
  "لماذا يراجع الطبيب سطح العين قبل قياسات العدسة؟": illustration(
    "An enlarged detail of the tear film over the corneal surface, comparing an even light reflection on a smooth film with a broken reflection on an uneven film.",
    "No instruments touching the eye, fabricated readings, monitor or diagnosis.",
  ),
  "دور القرنية في تركيز الضوء داخل العين": illustration(
    "A side-view optical diagram with light rays bending most strongly at the highlighted cornea, then fine-tuned by the crystalline lens to focus on the retina.",
    "Keep the anatomy correct; no laser beam, decorative glow or surgery reference.",
  ),
  // General eye health.
  "الفرق بين حدة الإبصار ومجال الإبصار": illustration(
    "A split illustration: a simple acuity target of decreasing symbol sizes on one side, and a top-down schematic of the visual field spreading from the eye on the other.",
    "No readable letters, fabricated test results, faces or diagnosis.",
  ),
  "لماذا يفحص الطبيب قاع العين؟": illustration(
    "An eye cutaway with the back of the eye highlighted and a schematic inset of the retina, optic disc and macula.",
    "No fake patient fundus photograph, invented findings or diagnosis.",
  ),
  "صحة العين مع استخدام العدسات اللاصقة": illustration(
    "A cross-section of a contact lens on the cornea with the tear-film layer between them highlighted, and a small unbranded lens-case inset.",
    "No contact lens on a fingertip, brand names or infected-eye imagery.",
  ),
  "النظارة الشمسية وحماية العين من الأشعة فوق البنفسجية": illustration(
    "A sunglasses lens in front of an eye cutaway, with simple arrows showing ultraviolet light stopped at the lens while visible light passes through.",
    "No fashion model, beach stock photo, brand logos or fabricated protection percentages.",
  ),
  "لماذا تختلف مقاسات النظر بين العينين؟": illustration(
    "Two eye optical diagrams side by side under one plain spectacle frame, one focusing light in front of the retina and the other on it.",
    "No fabricated prescription values, faces or diagnosis.",
  ),
  "الرمش ودوره في توزيع الدموع": illustration(
    "A side-view schematic of the upper eyelid moving down over the cornea and spreading a thin tear film, shown with simple arrows.",
    "No crying portrait, decorative tear drops or makeup imagery.",
  ),
  "لماذا يقيس طبيب العيون ضغط العين؟": illustration(
    "An eye cutaway with arrows showing aqueous fluid flowing from behind the iris through the pupil to the drainage angle, with an optic-nerve-head inset.",
    "No device touching the eye, invented pressure readings, swollen eyeball or blue fluid.",
  ),
  "ما وظيفة العصب البصري؟": illustration(
    "An eye cutaway with the optic nerve leaving the back of the eye and a simplified clean pathway continuing toward the brain.",
    "No glowing neon brain, fake scan or invented findings.",
  ),
  "دور البقعة الصفراء في رؤية التفاصيل": illustration(
    "A retina illustration with the macula and its central fovea highlighted, where incoming light rays come to focus.",
    "The macula is not literally painted yellow; no fake patient fundus photograph or disease depiction.",
  ),
  "ما الفرق بين الرؤية المركزية والرؤية الطرفية؟": illustration(
    "A top-down schematic of the visual field with a narrow sharp central zone and a broad peripheral zone, with a matching inset of the macula versus the peripheral retina.",
    "No dramatic tunnel-vision photograph, fabricated test result or diagnosis.",
  ),
  "لماذا يسأل طبيب العيون عن التاريخ المرضي للعائلة؟": illustration(
    "A simple anatomical eye illustration beside an abstract family-tree diagram of connected plain circles.",
    "No faces or people, readable text, genetic-test claims or diagnosis.",
  ),
};
const canonical = new Map(
  Object.entries(visuals).map(([topic, visual]) => [
    marketingTopicIdentity(topic),
    visual,
  ]),
);
export function medicalVisualDirection(topic: string) {
  const key = marketingTopicIdentity(topic.replace(/^الـ?\s*(?=[a-z])/i, ""));
  const match =
    canonical.get(key) ??
    [...canonical.entries()]
      .sort((a, b) => b[0].length - a[0].length)
      .find(([name]) => key.includes(name))?.[1];
  return {
    knownTopic: Boolean(match),
    ...(match ??
      illustration(
        "One dominant anatomical structure or coherent clinical device that explains the exact topic and final caption; use an explanatory inset where needed.",
        "Do not substitute a generic eye portrait, empty clinic, decorative symbol, unrelated examination or invented procedure. If the anatomy or device is uncertain, use a simple educational schematic rather than inventing details.",
      )),
  };
}
