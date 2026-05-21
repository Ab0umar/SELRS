import { z } from "zod";

const envSchema = z.object({
  VITE_APP_ID: z.string().optional().default(""),
  JWT_SECRET: z.string().optional().default("dev-only-change-me"),
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
  VAPID_PRIVATE_KEY: z.string().optional().default(""),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
  FK_PULLER_PATH: z.string().optional().default("D:\\Programs\\fp\\FKOldLogPuller.exe"),
  ATTENDANCE_ENABLED: z.enum(["true", "false"]).optional().default("true"),
  ATTENDANCE_SOURCE: z.enum(["access", "tcp"]).optional().default("access"),
  ATTENDANCE_ACCESS_PATH: z.string().optional().default(""),
  ATTENDANCE_ACCESS_COPY_FIRST: z.enum(["true", "false"]).optional().default("true"),
  ATTENDANCE_ACCESS_USE_ODBC: z.enum(["true", "false"]).optional().default("false"),
  ATTENDANCE_SYNC_BIZ_INTERVAL_MS: z.string().optional().default("120000"),
  ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS: z.string().optional().default("900000"),
  ATTENDANCE_BIZ_HOURS_START: z.string().optional().default("7"),
  ATTENDANCE_BIZ_HOURS_END: z.string().optional().default("20"),
  ATTENDANCE_SAFETY_WINDOW_MIN: z.string().optional().default("120"),
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === "production") {
  const missing: string[] = [];
  if (!parsed.DATABASE_URL) missing.push("DATABASE_URL");
  if (!parsed.JWT_SECRET || parsed.JWT_SECRET === "dev-only-change-me") missing.push("JWT_SECRET");
  if (missing.length > 0) {
    throw new Error(`[env] Missing required production env vars: ${missing.join(", ")}`);
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
  vapidPublicKey: parsed.VAPID_PUBLIC_KEY,
  vapidPrivateKey: parsed.VAPID_PRIVATE_KEY,
  attendanceEnabled: parsed.ATTENDANCE_ENABLED === "true",
  attendanceSource: parsed.ATTENDANCE_SOURCE,
  attendanceAccessPath: parsed.ATTENDANCE_ACCESS_PATH,
  attendanceAccessCopyFirst: parsed.ATTENDANCE_ACCESS_COPY_FIRST === "true",
  attendanceAccessUseOdbc: parsed.ATTENDANCE_ACCESS_USE_ODBC === "true",
  attendanceSyncBizIntervalMs: parseInt(parsed.ATTENDANCE_SYNC_BIZ_INTERVAL_MS, 10),
  attendanceSyncOffhoursIntervalMs: parseInt(parsed.ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS, 10),
  attendanceBizHoursStart: parseInt(parsed.ATTENDANCE_BIZ_HOURS_START, 10),
  attendanceBizHoursEnd: parseInt(parsed.ATTENDANCE_BIZ_HOURS_END, 10),
  attendanceSafetyWindowMin: parseInt(parsed.ATTENDANCE_SAFETY_WINDOW_MIN, 10),
};
