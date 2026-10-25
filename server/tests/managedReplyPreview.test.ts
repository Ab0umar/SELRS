import { afterEach, describe, expect, it, vi } from "vitest";
import { autoReplySettingsSchema } from "../../shared/auto-reply";
import {
  proposeReply,
  type ReplyGenerator,
} from "../services/auto-reply/providers";
import { managedReplyPreview } from "../services/ai/replyPreview";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const settings = autoReplySettingsSchema.parse({});
const request = {
  channel: "facebook_comment" as const,
  accountId: "456",
  text: "عنوان المركز",
  context: [],
  settings,
  knowledge: [
    {
      id: 1,
      kind: "branch",
      title: "عنوان المركز",
      content: "العنوان شارع النور",
      keywords: "عنوان المركز",
      targetPage: "456",
    },
    {
      id: 2,
      kind: "branch",
      title: "عنوان المركز",
      content: "عنوان سري للصفحة الأخرى",
      keywords: "عنوان المركز",
      targetPage: "654",
    },
  ],
};
function generator(
  text = "العنوان شارع النور",
  sourceIds = [1],
): ReplyGenerator {
  return async () => ({
    reply: { text, sourceIds, handoff: false },
    usage: { model: "gemini-test-central", inputTokens: 20, outputTokens: 10 },
    finishReason: "STOP",
  });
}

describe("central preview preserves reply policy", () => {
  it("filters knowledge and redacts contacts before invoking the selected generator", async () => {
    vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "fixture");
    const generate = vi.fn(generator());
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const proposal = await proposeReply(
      { ...request, text: "عنوان المركز test@example.com 01234567890" },
      generate,
    );
    // Public comments intentionally block contact information before any generation.
    expect(proposal.handoff).toBe(true);
    expect(generate).not.toHaveBeenCalled();
    const valid = await proposeReply(request, generate);
    expect(valid.handoff).toBe(false);
    expect(valid.model).toBe("gemini-test-central");
    expect(generate.mock.calls[0][0].instruction).toContain("شارع النور");
    expect(generate.mock.calls[0][0].instruction).not.toContain("عنوان سري");
    expect(network).not.toHaveBeenCalled();
  });
  it("rejects sources from the other page after central generation", async () => {
    vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "fixture");
    const proposal = await proposeReply(
      request,
      generator("عنوان سري للصفحة الأخرى", [2]),
    );
    expect(proposal.handoff).toBe(true);
    expect(proposal.reason).toBe("needs_review");
  });
  it("redacts contact details from private message history and input", async () => {
    vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "fixture");
    const generate = vi.fn(generator());
    await proposeReply(
      {
        ...request,
        channel: "whatsapp",
        text: "عنوان المركز test@example.com 01234567890",
        context: [
          { direction: "inbound", body: "person@example.com 01987654321" },
        ],
        knowledge: request.knowledge.map((entry) => ({
          ...entry,
          targetPage: "whatsapp",
        })),
      },
      generate,
    );
    expect(generate).toHaveBeenCalledOnce();
    const input = generate.mock.calls[0][0].input;
    expect(input).not.toContain("@example.com");
    expect(input).not.toContain("01234567890");
    expect(input).not.toContain("01987654321");
    expect(input).toContain("removed");
  });
  it("blocks invented numbers and links using the existing output guard", async () => {
    vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "fixture");
    const proposal = await proposeReply(
      request,
      generator("شارع النور رقم 999 https://unapproved.invalid"),
    );
    expect(proposal.reason).toBe("output_guard");
  });
  it("clinical questions never invoke the central generator", async () => {
    const generate = vi.fn(generator());
    const proposal = await proposeReply(
      { ...request, text: "هل ينفع اعمل ليزك لحالتي؟" },
      generate,
    );
    expect(proposal.handoff).toBe(true);
    expect(generate).not.toHaveBeenCalled();
  });
  it("keeps the central feature flag closed without touching SQL", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
    await expect(
      managedReplyPreview("00000000-0000-4000-8000-000000000001")({
        instruction: "test",
        input: "test",
      }),
    ).rejects.toThrow("disabled");
  });
  it("rejects input outside gateway limits before reserving the shared token budget", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    await expect(
      managedReplyPreview("00000000-0000-4000-8000-000000000001")({
        instruction: "ع".repeat(32001),
        input: "x",
      }),
    ).rejects.toThrow("unavailable");
  });
});
