"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    VITE_APP_ID: zod_1.z.string().optional().default(""),
    JWT_SECRET: zod_1.z.string().optional().default("dev-only-change-me"),
    DATABASE_URL: zod_1.z.string().optional().default(""),
    OAUTH_SERVER_URL: zod_1.z.string().optional().default(""),
    OWNER_OPEN_ID: zod_1.z.string().optional().default(""),
    BUILT_IN_FORGE_API_URL: zod_1.z.string().optional().default(""),
    BUILT_IN_FORGE_API_KEY: zod_1.z.string().optional().default(""),
    FCM_PROJECT_ID: zod_1.z.string().optional().default(""),
    FCM_CLIENT_EMAIL: zod_1.z.string().optional().default(""),
    FCM_PRIVATE_KEY: zod_1.z.string().optional().default(""),
    FCM_SERVICE_ACCOUNT_JSON: zod_1.z.string().optional().default(""),
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).optional().default("development"),
});
const parsed = envSchema.parse(process.env);
if (parsed.NODE_ENV === "production") {
    const missing = [];
    if (!parsed.DATABASE_URL)
        missing.push("DATABASE_URL");
    if (!parsed.JWT_SECRET || parsed.JWT_SECRET === "dev-only-change-me")
        missing.push("JWT_SECRET");
    if (missing.length > 0) {
        throw new Error(`[env] Missing required production env vars: ${missing.join(", ")}`);
    }
}
exports.ENV = {
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
};
