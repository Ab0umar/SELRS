import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { ENV } from "../../_core/env";
import { getMarketingPageTarget, type MarketingPageRole } from "./page.service";

export type MarketingPageBranding = {
  pageRole: MarketingPageRole;
  pageId: string;
  name: string;
  address: string;
  phone: string;
  logo: Buffer;
};
const cache = new Map<
  string,
  { until: number; value: MarketingPageBranding }
>();
export async function readMarketingPageBranding(
  pageRole: MarketingPageRole,
): Promise<MarketingPageBranding> {
  const target = await getMarketingPageTarget(pageRole);
  if (!target?.connected || !/^\d{1,32}$/.test(target.pageId))
    throw new Error("اربط صفحة النشر للحصول على شعارها وبياناتها الصحيحة");
  const key = `${pageRole}:${target.pageId}`;
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.value;
  const headers = { Authorization: `Bearer ${target.accessToken}` };
  const base = `https://graph.facebook.com/v25.0/${target.pageId}`;
  const read = async (suffix: string) => {
    const response = await fetch(base + suffix, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(
        "تعذر التحقق من شعار الصفحة وبيانات التواصل؛ لم يتم النشر",
      );
    return response.json();
  };
  const info = await read("?fields=name,phone,location");
  const logoPath =
    pageRole === "doctor" ? "marketing/doctor-logo.png" : "center-logo.png";
  let logo: Buffer;
  try {
    logo = await fs.readFile(path.resolve("client/public", logoPath));
  } catch {
    logo = await fs.readFile(path.resolve("dist/public", logoPath));
  }
  const value: MarketingPageBranding = {
    pageRole,
    pageId: target.pageId,
    name: String(info.name ?? target.contentName ?? target.pageName).slice(
      0,
      255,
    ),
    address:
      typeof info.location?.street === "string"
        ? info.location.street.trim().slice(0, 500)
        : "",
    phone:
      typeof info.phone === "string" ? info.phone.trim().slice(0, 120) : "",
    logo: await sharp(logo, { limitInputPixels: 16_000_000 })
      .flatten({ background: "white" })
      .resize(240, 240, { fit: "contain", background: "white" })
      .png()
      .toBuffer(),
  };
  if (!value.address || !value.phone)
    throw new Error("أضف عنوان الصفحة ورقم التواصل على Facebook قبل النشر");
  cache.set(key, { until: Date.now() + 6 * 60 * 60 * 1000, value });
  return value;
}
export function marketingContactFooter(
  branding: Pick<MarketingPageBranding, "name" | "address" | "phone">,
) {
  return `${branding.name}\nالعنوان: ${branding.address}\nللتواصل: ${branding.phone}`;
}
function brandingHeader(width: number) {
  const size = Math.max(40, Math.min(128, Math.round(width * 0.125)));
  const margin = Math.max(8, Math.round(width * 0.016));
  return { size, margin, height: size + margin * 2 };
}
export async function composeMarketingPageLogo(
  bytes: Buffer,
  logo: Buffer,
  _name = "",
  pageRole?: MarketingPageRole,
) {
  const normalised = await sharp(bytes, { limitInputPixels: 40_000_000 })
    .rotate()
    .toBuffer();
  const metadata = await sharp(normalised).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < 128 ||
    metadata.height < 128
  )
    throw new Error("أبعاد الصورة لا تسمح بإضافة هوية الصفحة");
  const size = Math.max(
    32,
    Math.round(Math.min(metadata.width, metadata.height) * 0.14),
  );
  const margin = Math.max(
    8,
    Math.round(Math.min(metadata.width, metadata.height) * 0.022),
  );
  const inset = Math.max(2, Math.round(size * 0.045));
  const mark = await sharp(logo, { limitInputPixels: 16_000_000 })
    .flatten({ background: "white" })
    .resize(size - inset * 2, size - inset * 2, {
      fit: "contain",
      background: "white",
    })
    .extend({
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      background: "white",
    })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
  const border =
    pageRole === "doctor"
      ? [
          {
            input: Buffer.from(
              `<svg width="${metadata.width}" height="${metadata.height}"><rect x="5" y="5" width="${metadata.width - 10}" height="${metadata.height - 10}" rx="24" fill="none" stroke="#bd9954" stroke-width="8"/><path d="M 5 160 V 29 Q 5 5 29 5 H 160" fill="none" stroke="#082b55" stroke-width="8"/></svg>`,
            ),
            top: 0,
            left: 0,
          },
        ]
      : [];
  return sharp(normalised)
    .composite([
      ...border,
      {
        input: mark,
        top: margin,
        left: metadata.width - size - margin,
      },
    ])
    .png()
    .toBuffer();
}
export async function brandMarketingImageUrl(
  imageUrl: string,
  pageRole: MarketingPageRole,
  knownBranding?: MarketingPageBranding,
) {
  const branding = knownBranding ?? (await readMarketingPageBranding(pageRole));
  if (branding.pageRole !== pageRole)
    throw new Error("هوية الصورة لا تطابق صفحة النشر");
  const origin = ENV.fbAppOrigin || "https://selrs.cc";
  const url = new URL(imageUrl, origin);
  if (
    url.origin !== new URL(origin).origin ||
    !url.pathname.startsWith("/uploads/marketing/")
  )
    throw new Error(
      "يجب حفظ صورة التسويق في مكتبة المركز قبل تركيب شعار الصفحة",
    );
  const directory = await fs.realpath(
    path.resolve(
      ENV.marketingImageDir || path.join(process.cwd(), "uploads", "marketing"),
    ),
  );
  const source = await fs.realpath(
    path.join(
      directory,
      decodeURIComponent(url.pathname.slice("/uploads/marketing/".length)),
    ),
  );
  const relative = path.relative(directory, source);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("مسار صورة التسويق غير صالح");
  const stat = await fs.stat(source);
  if (!stat.isFile() || stat.size > 20 * 1024 * 1024)
    throw new Error("ملف صورة التسويق غير صالح");
  const logoHash = createHash("sha256")
    .update(branding.logo)
    .digest("hex")
    .slice(0, 12);
  const prefix = `branded-v3-${pageRole}-${branding.pageId}-${logoHash}-`;
  if (path.basename(source).startsWith(prefix)) return imageUrl;
  let bytes = await fs.readFile(source);
  if (path.basename(source).startsWith("branded-v3-")) {
    const digest = path.basename(source).match(/-([a-f0-9]{20})\.png$/)?.[1];
    if (!digest) throw new Error("مصدر الصورة الأصلي غير صالح");
    bytes = await fs.readFile(
      path.join(directory, `branding-source-${digest}.png`),
    );
  }
  if (path.basename(source).startsWith("branded-v2-")) {
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height)
      throw new Error("الصورة المحفوظة غير صالحة");
    const height = brandingHeader(metadata.width).height;
    if (metadata.height <= height) throw new Error("إطار الصورة غير صالح");
    bytes = await sharp(bytes)
      .extract({
        left: 0,
        top: height,
        width: metadata.width,
        height: metadata.height - height,
      })
      .png()
      .toBuffer();
  }
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 20);
  await fs.writeFile(
    path.join(directory, `branding-source-${digest}.png`),
    bytes,
  );
  const filename = `${prefix}${digest}.png`;
  const output = path.join(directory, filename);
  try {
    await fs.access(output);
    return `/uploads/marketing/${filename}`;
  } catch {}
  const branded = await composeMarketingPageLogo(
    bytes,
    branding.logo,
    "",
    pageRole,
  );
  const temporary = `${output}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, branded, { flag: "wx" });
  await fs.rename(temporary, output);
  return `/uploads/marketing/${filename}`;
}
export async function prepareMarketingPublication(
  message: string,
  imageUrl: string | null,
  pageRole: MarketingPageRole,
  expectedPageId?: string,
) {
  const branding = await readMarketingPageBranding(pageRole);
  if (expectedPageId && branding.pageId !== expectedPageId)
    throw new Error(
      "تغيرت صفحة النشر أثناء تجهيز الهوية؛ راجع الربط قبل إعادة المحاولة",
    );
  return {
    message: message.endsWith(marketingContactFooter(branding))
      ? message
      : `${message}\n\n${marketingContactFooter(branding)}`,
    imageUrl: imageUrl
      ? await brandMarketingImageUrl(imageUrl, pageRole, branding)
      : null,
  };
}
