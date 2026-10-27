import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  marketingGenerationInput,
  whatsappRequestContext,
} from "@shared/ai-request-context";
import { readPending, removePending, savePending } from "./pending-request";
const id = "00000000-0000-4000-8000-000000000123";
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("pending AI request context", () => {
  it("restores the doctor's Monday slot with its original topic and assistant", () => {
    const context = {
      requestId: id,
      pageRole: "doctor",
      postDay: "tuesday",
      topic: "موضوع خيالي",
      assistant: { provider: "manus", model: "max" },
    };
    savePending("marketing", context);
    expect(readPending("marketing", marketingGenerationInput)).toEqual(context);
  });
  it("restores an examination campaign with only its selected offer days", () => {
    const context = { requestId: id, kind: "exam", days: ["الثلاثاء"] };
    savePending("whatsapp", context);
    expect(readPending("whatsapp", whatsappRequestContext)).toEqual(context);
    removePending("whatsapp");
    expect(readPending("whatsapp", whatsappRequestContext)).toBeUndefined();
  });
  it("does not interpret an invalid saved campaign as a different valid campaign", () => {
    savePending("whatsapp", { requestId: id, kind: "exam", days: [] });
    expect(readPending("whatsapp", whatsappRequestContext)).toBeUndefined();
  });
  it("storage restrictions do not interrupt a server-tracked request", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => savePending("key", {})).not.toThrow();
    expect(readPending("key", marketingGenerationInput)).toBeUndefined();
    expect(() => removePending("key")).not.toThrow();
  });
});
