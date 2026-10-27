import { z } from "zod";
import { ENV } from "../../../_core/env";

const attachmentSchema = z.object({
  filename: z.string(),
  url: z.string().url(),
  content_type: z.string().optional(),
});
const messageSchema = z.object({
  assistant_message: z
    .object({
      delivery_kind: z.string().optional(),
      content: z.string().optional(),
      attachments: z.array(attachmentSchema).optional(),
    })
    .optional(),
  status_update: z
    .object({
      agent_status: z.string(),
      status_detail: z
        .object({ waiting_for_event_type: z.string().optional() })
        .optional(),
    })
    .optional(),
});
export const manusPostSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(20000),
  cta: z.string().trim().max(120),
  hashtags: z.string().trim().max(3000),
  idea: z.string().max(3000).optional().default(""),
  imagePrompt: z.string().max(10000).optional().default(""),
});

export class ManusRequestError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
    readonly outcomeUncertain = false,
  ) {
    super(message);
  }
}

async function request(endpoint: string, body?: unknown): Promise<unknown> {
  if (!ENV.manusApiKey)
    throw new ManusRequestError("أضف MANUS_API_KEY في إعدادات الخادم");
  let response: Response;
  try {
    response = await fetch(`https://api.manus.ai/v2/${endpoint}`, {
      method: body ? "POST" : "GET",
      headers: {
        "x-manus-api-key": ENV.manusApiKey,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new ManusRequestError(
      "تعذر الاتصال بـ Manus؛ ستتم إعادة متابعة المهمة",
      true,
      Boolean(body),
    );
  }
  const result = await response.json().catch(() => null);
  const envelope = z
    .object({
      ok: z.boolean(),
      error: z.object({ code: z.string().optional() }).optional(),
    })
    .safeParse(result);
  if (!response.ok || !envelope.success || !envelope.data.ok) {
    throw new ManusRequestError(
      `Manus: ${response.status} (${envelope.success ? (envelope.data.error?.code ?? "request_failed") : "invalid_response"})`,
      response.status === 429 || response.status >= 500,
      Boolean(body) &&
        (response.status === 408 ||
          response.status >= 500 ||
          !envelope.success),
    );
  }
  return result;
}

export async function createManusTask(
  prompt: string,
  options: { agentProfile?: "standard" | "lite" | "max" } = {},
) {
  return z.object({ task_id: z.string().min(1) }).parse(
    await request("task.create", {
      share_visibility: "private",
      interactive_mode: false,
      ...(options.agentProfile ? { agent_profile: options.agentProfile } : {}),
      message: { content: prompt, connectors: [] },
    }),
  );
}

export async function readManusTask(taskId: string) {
  const query = `task_id=${encodeURIComponent(taskId)}`;
  const detail = z
    .object({
      task: z.object({
        status: z.string(),
        has_running_background_jobs: z.boolean().optional(),
        credit_usage: z.number().optional(),
      }),
    })
    .parse(await request(`task.detail?${query}`));
  const history = z
    .object({
      messages: z.array(messageSchema),
      has_more: z.boolean().optional(),
    })
    .parse(await request(`task.listMessages?${query}&order=desc&limit=100`));
  const status = history.messages.find(
    (message) => message.status_update,
  )?.status_update;
  const result = history.messages.find(
    (message) => message.assistant_message?.delivery_kind === "result",
  )?.assistant_message;
  return {
    ...detail.task,
    statusEvent: status,
    attachments: result?.attachments ?? [],
  };
}

export function validateManusDownloadUrl(raw: string): URL {
  const url = new URL(raw);
  const allowed = ["manuscdn.com", "manus.im", "manus.ai"];
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !allowed.some(
      (domain) =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`),
    )
  ) {
    throw new Error("رابط ملف Manus غير مسموح");
  }
  return url;
}

export async function downloadManusFile(
  raw: string,
  limit = 20 * 1024 * 1024,
): Promise<Buffer> {
  let url = validateManusDownloadUrl(raw);
  for (let redirects = 0; redirects < 4; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    });
    if (response.status >= 300 && response.status < 400) {
      const target = response.headers.get("location");
      if (!target) throw new Error("تحويل رابط الملف غير صالح");
      await response.body?.cancel();
      url = validateManusDownloadUrl(new URL(target, url).href);
      continue;
    }
    if (!response.ok || !response.body)
      throw new ManusRequestError(
        "تعذر تنزيل ملف Manus",
        response.status >= 500 || response.status === 429,
      );
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.length;
        if (size > limit) throw new Error("ملف Manus أكبر من الحد المسموح");
        chunks.push(item.value);
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks);
  }
  throw new Error("تحويلات كثيرة في رابط ملف Manus");
}
