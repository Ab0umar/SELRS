import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  connect: vi.fn(),
}));
vi.mock("../db", () => ({
  getSystemSetting: mocks.read,
  updateSystemSettings: mocks.write,
  getDbConnection: mocks.connect,
}));
import { AiManagementStore } from "../services/ai/managementStore";
import {
  readMedicalAssistantSettings,
  saveMedicalAssistantSettings,
  assertSelectedSpeechProvider,
} from "../services/ai/medicalSettings";
import { defaultMedicalAssistantSettings } from "../../shared/medical-assistant-settings";
beforeEach(() => {
  vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
  mocks.read.mockResolvedValue(null);
  vi.stubEnv("AZURE_SPEECH_KEY", "test");
  vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
});
afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("central medical assistant settings", () => {
  it("shows the central processing provider rather than stale legacy settings", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    vi.spyOn(AiManagementStore.prototype, "listProfiles").mockResolvedValue([
      {
        workload: "medical.documentation",
        provider: "gemini",
        model: "gemini-selected",
        enabled: true,
        dailyRequests: 20,
        dailyTokens: 100000,
        maxConcurrent: 1,
      },
    ]);
    expect((await readMedicalAssistantSettings()).processingModel).toBe(
      "gemini:gemini-selected",
    );
  });
  it("uses Azure defaults only when no settings exist", async () => {
    expect(await readMedicalAssistantSettings()).toEqual(
      defaultMedicalAssistantSettings,
    );
  });
  it.each(["doctor", "nurse", "manager"])(
    "forbids %s from saving",
    async (role) => {
      await expect(
        saveMedicalAssistantSettings(role, defaultMedicalAssistantSettings),
      ).rejects.toThrow("الأدمن فقط");
      expect(mocks.write).not.toHaveBeenCalled();
    },
  );
  it("persists settings for all users and routes fresh sessions to Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    vi.stubEnv("MEDICAL_GEMINI_CLINICAL_APPROVED", "true");
    const settings = {
      ...defaultMedicalAssistantSettings,
      speechProvider: "gemini" as const,
    };
    await saveMedicalAssistantSettings("admin", settings);
    expect(mocks.write).toHaveBeenCalledWith(
      "medical_assistant_settings_v1",
      settings,
    );
    mocks.read.mockResolvedValue({ value: JSON.stringify(settings) });
    await expect(
      assertSelectedSpeechProvider("gemini"),
    ).resolves.toBeUndefined();
    await expect(assertSelectedSpeechProvider("azure")).rejects.toThrow(
      "تغيّر مزوّد الصوت",
    );
  });
  it("does not bypass Gemini clinical approval", async () => {
    vi.stubEnv("MEDICAL_GEMINI_CLINICAL_APPROVED", "false");
    await expect(
      saveMedicalAssistantSettings("admin", {
        ...defaultMedicalAssistantSettings,
        speechProvider: "gemini",
      }),
    ).rejects.toThrow("موافقة الاستخدام الطبي");
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("fails closed on corrupt saved settings instead of switching providers", async () => {
    mocks.read.mockResolvedValue({ value: "invalid" });
    await expect(readMedicalAssistantSettings()).rejects.toThrow("غير صالحة");
  });
});
