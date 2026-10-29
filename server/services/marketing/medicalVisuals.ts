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
