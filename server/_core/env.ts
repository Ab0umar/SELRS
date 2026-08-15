import { z } from "zod";

const envSchema = z.object({
  VITE_APP_ID: z.string().optional().default(""),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().optional().default(""),
  OAUTH_SERVER_URL: z.string().optional().default(""),
  OWNER_OPEN_ID: z.string().optional().default(""),
  BUILT_IN_FORGE_API_URL: z.string().optional().default(""),
  BUILT_IN_FORGE_API_KEY: z.string().optional().default(""),
  FCM_PROJECT_ID: z.string().optional().default(""),
  FCM_CLIENT_EMAIL: z.string().optional().default(""),
  FCM_PRIVATE_KEY: z.string().optional().default(""),
  FCM_SERVICE_ACCOUNT_JSON: z.string().optional().default(""),
  VAPID_PUBLIC_KEY: z.string().optional().default(""),
  VITE_VAPID_PUBLIC_KEY: z.string().optional().default(""),
  VAPID_PRIVATE_KEY: z.string().optional().default(""),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  FK_PULLER_PATH: z
    .string()
    .optional()
    .default("E:\\selrs.cc\\scripts\\FKOldLogPuller.exe"),
  FK_USER_PULLER_PATH: z
    .string()
    .optional()
    .default("E:\\selrs.cc\\scripts\\FKUserPuller.exe"),
  FK_MDB_PATH: z.string().optional().default("E:\\Taurus V3.0\\Taurus.mdb"),
  ATTENDANCE_ENABLED: z.enum(["true", "false"]).optional().default("true"),
  ATTENDANCE_SOURCE: z.enum(["access", "tcp"]).optional().default("access"),
  ATTENDANCE_ACCESS_PATH: z.string().optional().default(""),
  ATTENDANCE_ACCESS_COPY_FIRST: z
    .enum(["true", "false"])
    .optional()
    .default("true"),
  ATTENDANCE_ACCESS_USE_ODBC: z
    .enum(["true", "false"])
    .optional()
    .default("false"),
  ATTENDANCE_SYNC_BIZ_INTERVAL_MS: z.string().optional().default("120000"),
  ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS: z.string().optional().default("900000"),
  ATTENDANCE_BIZ_HOURS_START: z.string().optional().default("7"),
  ATTENDANCE_BIZ_HOURS_END: z.string().optional().default("20"),
  ATTENDANCE_SAFETY_WINDOW_MIN: z.string().optional().default("120"),
  GEMINI_API_KEY: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  FAL_API_KEY: z.string().optional().default(""),
  MARKETING_IMAGE_DIR: z.string().optional().default(""),
  FB_APP_ID: z.string().optional().default(""),
  FB_APP_SECRET: z.string().optional().default(""),
  FB_REDIRECT_URI: z.string().optional().default(""),
  FB_APP_ORIGIN: z.string().optional().default(""),
  ZOHO_SMTP_USERNAME: z.string().optional().default(""),
  ZOHO_SMTP_APP_PASSWORD: z.string().optional().default(""),
  BOOKING_EMAIL_FROM: z.string().optional().default("noreply@selrs.cc"),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_API_VERSION: z.string().optional().default("v25.0"),
  WHATSAPP_CONFIRMATION_TEMPLATE: z.string().optional().default(""),
  WHATSAPP_CANCELLATION_TEMPLATE: z.string().optional().default(""),
  WHATSAPP_OPERATION_TEMPLATE: z.string().optional().default(""),
  WHATSAPP_OPERATION_CANCELLATION_TEMPLATE: z.string().optional().default(""),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().optional().default("ar"),
  WHATSAPP_SUPPORT_NUMBER: z.string().optional().default("01285800309"),
  WHATSAPP_TANTA_MAP_URL: z.string().optional().default(""),
  WHATSAPP_KFS_MAP_URL: z.string().optional().default(""),
  WHATSAPP_OPERATION_MAP_URL: z.string().optional().default(""),
  WHATSAPP_ALAMAL_MAP_URL: z.string().optional().default(""),
  WHATSAPP_ELITE_MAP_URL: z.string().optional().default(""),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional().default(""),
  WHATSAPP_APP_SECRET: z.string().optional().default(""),
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === "production") {
  const missing: string[] = [];
  if (!parsed.DATABASE_URL) missing.push("DATABASE_URL");
  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required production env vars: ${missing.join(", ")}`,
    );
  }
}

export const ENV = {
  appId: parsed.VITE_APP_ID,
  cookieSecret: parsed.JWT_SECRET,
  JWT_SECRET: parsed.JWT_SECRET,
  databaseUrl: parsed.DATABASE_URL,
  oAuthServerUrl: parsed.OAUTH_SERVER_URL,
  ownerOpenId: parsed.OWNER_OPEN_ID,
  isProduction: parsed.NODE_ENV === "production",
  forgeApiUrl: parsed.BUILT_IN_FORGE_API_URL,
  forgeApiKey: parsed.BUILT_IN_FORGE_API_KEY,
  fcmProjectId: parsed.FCM_PROJECT_ID,
  fcmClientEmail: parsed.FCM_CLIENT_EMAIL,
  fcmPrivateKey: parsed.FCM_PRIVATE_KEY,
  fcmServiceAccountJson: parsed.FCM_SERVICE_ACCOUNT_JSON,
  vapidPublicKey: parsed.VAPID_PUBLIC_KEY || parsed.VITE_VAPID_PUBLIC_KEY,
  vapidPrivateKey: parsed.VAPID_PRIVATE_KEY,
  attendanceEnabled: parsed.ATTENDANCE_ENABLED === "true",
  attendanceSource: parsed.ATTENDANCE_SOURCE,
  attendanceAccessPath: parsed.ATTENDANCE_ACCESS_PATH,
  attendanceAccessCopyFirst: parsed.ATTENDANCE_ACCESS_COPY_FIRST === "true",
  attendanceAccessUseOdbc: parsed.ATTENDANCE_ACCESS_USE_ODBC === "true",
  attendanceSyncBizIntervalMs: parseInt(
    parsed.ATTENDANCE_SYNC_BIZ_INTERVAL_MS,
    10,
  ),
  attendanceSyncOffhoursIntervalMs: parseInt(
    parsed.ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS,
    10,
  ),
  attendanceBizHoursStart: parseInt(parsed.ATTENDANCE_BIZ_HOURS_START, 10),
  attendanceBizHoursEnd: parseInt(parsed.ATTENDANCE_BIZ_HOURS_END, 10),
  attendanceSafetyWindowMin: parseInt(parsed.ATTENDANCE_SAFETY_WINDOW_MIN, 10),
  geminiApiKey: parsed.GEMINI_API_KEY,
  openaiApiKey: parsed.OPENAI_API_KEY,
  falApiKey: parsed.FAL_API_KEY,
  marketingImageDir: parsed.MARKETING_IMAGE_DIR,
  fbAppId: parsed.FB_APP_ID,
  fbAppSecret: parsed.FB_APP_SECRET,
  fbRedirectUri: parsed.FB_REDIRECT_URI,
  fbAppOrigin: parsed.FB_APP_ORIGIN,
  zohoSmtpUsername: parsed.ZOHO_SMTP_USERNAME,
  zohoSmtpAppPassword: parsed.ZOHO_SMTP_APP_PASSWORD,
  bookingEmailFrom: parsed.BOOKING_EMAIL_FROM,
  whatsappAccessToken: parsed.WHATSAPP_ACCESS_TOKEN,
  whatsappPhoneNumberId: parsed.WHATSAPP_PHONE_NUMBER_ID,
  whatsappApiVersion: parsed.WHATSAPP_API_VERSION,
  whatsappConfirmationTemplate: parsed.WHATSAPP_CONFIRMATION_TEMPLATE,
  whatsappCancellationTemplate: parsed.WHATSAPP_CANCELLATION_TEMPLATE,
  whatsappOperationTemplate: parsed.WHATSAPP_OPERATION_TEMPLATE,
  whatsappOperationCancellationTemplate:
    parsed.WHATSAPP_OPERATION_CANCELLATION_TEMPLATE,
  whatsappTemplateLanguage: parsed.WHATSAPP_TEMPLATE_LANGUAGE,
  whatsappSupportNumber: parsed.WHATSAPP_SUPPORT_NUMBER,
  whatsappTantaMapUrl: parsed.WHATSAPP_TANTA_MAP_URL,
  whatsappKfsMapUrl: parsed.WHATSAPP_KFS_MAP_URL,
  whatsappOperationMapUrl: parsed.WHATSAPP_OPERATION_MAP_URL,
  whatsappAlamalMapUrl: parsed.WHATSAPP_ALAMAL_MAP_URL,
  whatsappEliteMapUrl: parsed.WHATSAPP_ELITE_MAP_URL,
  whatsappWebhookVerifyToken: parsed.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  whatsappAppSecret: parsed.WHATSAPP_APP_SECRET,
};
