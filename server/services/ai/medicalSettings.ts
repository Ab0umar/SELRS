import { TRPCError } from "@trpc/server";
import {
  getSystemSetting,
  updateSystemSettings,
  getDbConnection,
} from "../../db";
import { AiManagementStore, AiManagementError } from "./managementStore";
import type { RowDataPacket } from "mysql2/promise";
import {
  defaultMedicalAssistantSettings,
  medicalAssistantSettingsSchema,
  type MedicalAssistantSettings,
} from "../../../shared/medical-assistant-settings";

const key = "medical_assistant_settings_v1";
export async function readMedicalAssistantSettings() {
  const row = await getSystemSetting(key);
  let settings: MedicalAssistantSettings;
  try {
    settings = row
      ? medicalAssistantSettingsSchema.parse(JSON.parse(row.value ?? ""))
      : { ...defaultMedicalAssistantSettings };
  } catch {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "إعدادات المساعد الطبي المحفوظة غير صالحة. يرجى مراجعتها بواسطة الأدمن.",
    });
  }
  if (process.env.AI_CORE_MANAGEMENT_ENABLED === "true") {
    const profile = (
      await new AiManagementStore(getDbConnection).listProfiles()
    ).find((p) => p.workload === "medical.documentation");
    if (!profile) throw new AiManagementError("unavailable");
    settings.processingModel = `${profile.provider}:${profile.model}`;
  }
  return settings;
}
export async function saveMedicalAssistantSettings(
  role: string,
  input: MedicalAssistantSettings,
) {
  if (role !== "admin")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "الأدمن فقط يمكنه تعديل إعدادات المساعد الطبي.",
    });
  const settings = medicalAssistantSettingsSchema.parse(input);
  if (
    (settings.speechProvider === "gemini" ||
      settings.processingModel.startsWith("gemini:")) &&
    (!process.env.GEMINI_API_KEY ||
      process.env.MEDICAL_GEMINI_CLINICAL_APPROVED !== "true")
  )
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "يجب إعداد مفتاح Gemini وموافقة الاستخدام الطبي على السيرفر أولًا.",
    });
  if (
    settings.speechProvider === "azure" &&
    (!process.env.AZURE_SPEECH_KEY ||
      !/^[a-z0-9]+$/.test(process.env.AZURE_SPEECH_REGION?.trim() ?? ""))
  )
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "يجب إعداد Azure Speech على السيرفر أولًا.",
    });
  if (process.env.AI_CORE_MANAGEMENT_ENABLED === "true") {
    const connection = await getDbConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT workload FROM ai_core_profiles WHERE workload='medical.documentation' FOR UPDATE",
      );
      if (!rows.length) throw new AiManagementError("unavailable");
      const [provider, ...model] = settings.processingModel.split(":");
      await connection.execute(
        "UPDATE ai_core_profiles SET provider=?,model=? WHERE workload='medical.documentation'",
        [provider, model.join(":")],
      );
      await connection.execute(
        "INSERT INTO systemSettings (`key`,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value),updatedAt=CURRENT_TIMESTAMP",
        [key, JSON.stringify(settings)],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } else await updateSystemSettings(key, settings);
  return settings;
}
export async function assertSelectedSpeechProvider(
  provider: "azure" | "gemini",
) {
  if ((await readMedicalAssistantSettings()).speechProvider !== provider)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "تغيّر مزوّد الصوت المركزي. أغلق نافذة التسجيل وافتحها مجددًا.",
    });
}
