export type IdCardOrientation = "portrait" | "landscape";

export type IdCardPerson = { fullName: string; jobTitle?: string | null };

const PRIMARY = "#0b4a8f";
const ACCENT = "#f7941d";
const INK = "#0b2a52";
const BORDER = "#d5dfeb";
const FONT = "Cairo, 'Segoe UI', Tahoma, sans-serif";
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&display=swap";
const LOGO_PATH = "/logos/full.png";
// full.png is 1558x1379.
const LOGO_RATIO = 1379 / 1558;

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// SVG text does not wrap, so long names shrink to fit the card width.
function fitFontSize(text: string, base: number, maxWidth: number) {
  const estimated = text.length * base * 0.52;
  if (estimated <= maxWidth) return base;
  return Math.max(12, Math.floor((maxWidth / (text.length * 0.52)) * 10) / 10);
}

export function buildIdCardSvg(
  person: IdCardPerson,
  orientation: IdCardOrientation,
  logoHref: string,
  options: { standalone?: boolean } = {},
) {
  const name = person.fullName.trim();
  const title = (person.jobTitle ?? "").trim();
  const portrait = orientation === "portrait";
  const w = portrait ? 360 : 570;
  const h = portrait ? 570 : 360;
  const sizeAttrs = portrait
    ? `width="54mm" height="85.6mm"`
    : `width="85.6mm" height="54mm"`;
  const fontImport = options.standalone
    ? `<style>@import url('${FONT_CSS_URL.replace(/&/g, "&amp;")}');</style>`
    : "";

  let body: string;
  if (portrait) {
    const logoW = 250;
    const nameSize = fitFontSize(name, 28, 312);
    const titleSize = fitFontSize(title, 18, 312);
    body = `
  <image href="${escapeXml(logoHref)}" x="${(w - logoW) / 2}" y="44" width="${logoW}" height="${Math.round(logoW * LOGO_RATIO)}" preserveAspectRatio="xMidYMid meet"/>
  <text x="${w / 2}" y="370" text-anchor="middle" direction="rtl" font-size="${nameSize}" font-weight="800" fill="${INK}">${escapeXml(name)}</text>
  <rect x="${w / 2 - 20}" y="392" width="40" height="3" rx="1.5" fill="${ACCENT}"/>
  <text x="${w / 2}" y="432" text-anchor="middle" direction="rtl" font-size="${titleSize}" font-weight="700" fill="${PRIMARY}">${escapeXml(title)}</text>
  <rect x="0" y="520" width="${w}" height="4" fill="${ACCENT}"/>
  <rect x="0" y="524" width="${w}" height="46" fill="${PRIMARY}"/>
  <text x="${w / 2}" y="553" text-anchor="middle" direction="rtl" font-size="14" font-weight="700" fill="#ffffff">بطاقة موظف</text>`;
  } else {
    const logoW = 210;
    const logoH = Math.round(logoW * LOGO_RATIO);
    const logoX = w - 32 - logoW;
    const dividerX = logoX - 28 - 3;
    const textX = dividerX - 28;
    const textWidth = textX - 32;
    const nameSize = fitFontSize(name, 28, textWidth);
    const titleSize = fitFontSize(title, 18, textWidth);
    body = `
  <image href="${escapeXml(logoHref)}" x="${logoX}" y="${Math.round(14 + (296 - logoH) / 2)}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>
  <rect x="${dividerX}" y="87" width="3" height="150" rx="1.5" fill="${ACCENT}"/>
  <text x="${textX}" y="152" text-anchor="start" direction="rtl" font-size="${nameSize}" font-weight="800" fill="${INK}">${escapeXml(name)}</text>
  <text x="${textX}" y="196" text-anchor="start" direction="rtl" font-size="${titleSize}" font-weight="700" fill="${PRIMARY}">${escapeXml(title)}</text>
  <rect x="0" y="310" width="${w}" height="4" fill="${ACCENT}"/>
  <rect x="0" y="314" width="${w}" height="46" fill="${PRIMARY}"/>
  <text x="${w / 2}" y="343" text-anchor="middle" direction="rtl" font-size="14" font-weight="700" fill="#ffffff">بطاقة موظف</text>`;
  }

  const clipId = `card-clip-${orientation}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${sizeAttrs} font-family="${FONT}">${fontImport}
  <title>${escapeXml(`بطاقة موظف - ${name}`)}</title>
  <defs><clipPath id="${clipId}"><rect width="${w}" height="${h}" rx="18"/></clipPath></defs>
  <g clip-path="url(#${clipId})">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect width="${w}" height="10" fill="${PRIMARY}"/>
  <rect y="10" width="${w}" height="4" fill="${ACCENT}"/>${body}
  </g>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="17.5" fill="none" stroke="${BORDER}"/>
</svg>`;
}

/** Opens one A4 print sheet of ID cards, sized at CR80 (85.6 x 54 mm). */
export function printEmployeeIdCards(
  people: IdCardPerson[],
  orientation: IdCardOrientation,
) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const logoHref = `${window.location.origin}${LOGO_PATH}`;
  const cards = people
    .map((person) => `<div class="card">${buildIdCardSvg(person, orientation, logoHref)}</div>`)
    .join("");
  const columns = orientation === "portrait" ? 3 : 2;
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
<title>بطاقات الموظفين</title>
<link rel="stylesheet" href="${FONT_CSS_URL}"/>
<style>
@page { size: A4; margin: 10mm; }
body { margin: 0; font-family: ${FONT}; }
.sheet { display: grid; grid-template-columns: repeat(${columns}, max-content); gap: 5mm; justify-content: center; }
.card { break-inside: avoid; page-break-inside: avoid; line-height: 0; }
.card svg { display: block; }
</style></head><body><div class="sheet">${cards}</div>
<script>
window.addEventListener("load", function () {
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () { window.focus(); window.print(); });
});
</script>
</body></html>`);
  win.document.close();
  return true;
}
