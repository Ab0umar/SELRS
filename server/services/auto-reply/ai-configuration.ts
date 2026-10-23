import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request } from "node:https";

const modelSchema = z.object({
  name: z.string(),
  displayName: z.string().optional(),
  outputTokenLimit: z.number().optional(),
  topK: z.number().optional(),
  supportedGenerationMethods: z.array(z.string()).default([]),
});
let modelCache:
  | { key: string; expires: number; rows: z.infer<typeof modelSchema>[] }
  | undefined;
export async function availableGeminiModels() {
  const key = process.env.AUTO_REPLY_GEMINI_KEY;
  if (!key)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "مفتاح Gemini غير مضبوط على السيرفر",
    });
  if (modelCache?.key === key && modelCache.expires > Date.now())
    return modelCache.rows;
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
    { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(15000) },
  ).catch(() => null);
  if (!response?.ok)
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "تعذر تحميل الموديلات من Gemini؛ راجع المفتاح أو حاول لاحقًا",
    });
  const payload = z
    .object({ models: z.array(modelSchema) })
    .safeParse(await response.json().catch(() => null));
  if (!payload.success)
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "استجابة قائمة الموديلات غير صالحة",
    });
  const rows = payload.data.models.filter(
    (model) =>
      /^models\/gemini-[\w.-]+$/.test(model.name) &&
      model.supportedGenerationMethods.includes("generateContent") &&
      !/image|tts|audio|live|robotics|computer-use/i.test(model.name),
  );
  modelCache = { key, expires: Date.now() + 300000, rows };
  return rows;
}
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");
const specialIPv6 = new BlockList();
specialIPv6.addSubnet("2001::", 23, "ipv6");
specialIPv6.addSubnet("2001:db8::", 32, "ipv6");
specialIPv6.addSubnet("2002::", 16, "ipv6");
export function isPublicWebsiteAddress(address: string) {
  return isIP(address) === 4
    ? !blocked.check(address, "ipv4")
    : isIP(address) === 6 &&
        globalIPv6.check(address, "ipv6") &&
        !specialIPv6.check(address, "ipv6");
}
export function publicWebsiteUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "أدخل رابط HTTPS صحيحًا",
    });
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.href.length > 2048 ||
    /(?:^|[/?&])(access_token|token|password|secret|api_key|key)=/i.test(
      url.href,
    )
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "استخدم رابط HTTPS عامًا بدون بيانات دخول أو مفاتيح",
    });
  url.hash = "";
  return url;
}
async function loadPublicHtml(url: URL) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
  if (
    !addresses.length ||
    addresses.some((entry) => !isPublicWebsiteAddress(entry.address))
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "المصدر يجب أن يكون موقعًا عامًا، وليس عنوانًا محليًا أو خاصًا",
    });
  const selected = addresses[0];
  return new Promise<{ html: string; redirect?: string }>((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        agent: false,
        family: selected.family,
        headers: {
          "User-Agent": "SELRS-TeachAI/1.0",
          Accept: "text/html,text/plain",
        },
        signal: AbortSignal.timeout(12000),
        lookup: (_hostname, _options, callback) =>
          callback(null, selected.address, selected.family),
      },
      (response) => {
        if (
          [301, 302, 303, 307, 308].includes(response.statusCode ?? 0) &&
          response.headers.location
        ) {
          response.resume();
          resolve({ html: "", redirect: response.headers.location });
          return;
        }
        if (
          response.statusCode !== 200 ||
          !/^(text\/html|text\/plain|application\/xhtml\+xml)/i.test(
            response.headers["content-type"] ?? "",
          )
        ) {
          response.resume();
          reject(new Error("WEBSITE_NOT_READABLE"));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 1000000) {
            req.destroy(new Error("WEBSITE_TOO_LARGE"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({ html: Buffer.concat(chunks).toString("utf8") }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}
export function websiteText(html: string) {
  return html
    .replace(
      /<(script|style|svg|template|noscript|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      " ",
    )
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const n =
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : parseInt(code, 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : " ";
    })
    .replace(
      /&(nbsp|amp|lt|gt|quot|apos);/gi,
      (_, name: string) =>
        ({ nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[
          name.toLowerCase()
        ] ?? " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}
export async function previewWebsite(value: string) {
  let url = publicWebsiteUrl(value);
  try {
    for (let hop = 0; hop < 4; hop++) {
      const result = await loadPublicHtml(url);
      if (result.redirect) {
        url = publicWebsiteUrl(new URL(result.redirect, url).href);
        continue;
      }
      if (/<input[^>]*type\s*=\s*["']?password/i.test(result.html))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "صفحات تسجيل الدخول لا تصلح مصدرًا؛ استخدم صفحة معلومات عامة",
        });
      const content = websiteText(result.html);
      if (content.length < 160)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "لم نجد نصًا عامًا كافيًا؛ انسخ المعلومات في Teach AI بدلًا من صفحة فارغة أو محتوى يحتاج تسجيل دخول",
        });
      return {
        url: url.href,
        title: websiteText(
          result.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
            url.hostname,
        ).slice(0, 255),
        content: content.slice(0, 30000),
        truncated: content.length > 30000,
      };
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "الرابط يحتوي على تحويلات كثيرة؛ استخدم رابط الصفحة النهائي",
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "تعذر قراءة الموقع العام؛ أضف المعلومات نصيًا في Teach AI",
    });
  }
}
