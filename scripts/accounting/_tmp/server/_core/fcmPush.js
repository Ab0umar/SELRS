"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFcmPushToRegisteredDevices = sendFcmPushToRegisteredDevices;
const jose_1 = require("jose");
const env_1 = require("./env");
const db = __importStar(require("../db"));
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
let accessTokenCache = null;
function getFcmCredentials() {
    if (env_1.ENV.fcmServiceAccountJson) {
        try {
            const parsed = JSON.parse(env_1.ENV.fcmServiceAccountJson);
            const projectId = String(parsed.project_id ?? "").trim();
            const clientEmail = String(parsed.client_email ?? "").trim();
            const privateKey = String(parsed.private_key ?? "").trim();
            if (projectId && clientEmail && privateKey) {
                return {
                    projectId,
                    clientEmail,
                    privateKey,
                };
            }
        }
        catch (error) {
            console.warn("[FCM] Invalid FCM_SERVICE_ACCOUNT_JSON:", error);
        }
    }
    const projectId = String(env_1.ENV.fcmProjectId ?? "").trim();
    const clientEmail = String(env_1.ENV.fcmClientEmail ?? "").trim();
    const privateKey = String(env_1.ENV.fcmPrivateKey ?? "").replace(/\\n/g, "\n").trim();
    if (!projectId || !clientEmail || !privateKey)
        return null;
    return {
        projectId,
        clientEmail,
        privateKey,
    };
}
async function getAccessToken() {
    const now = Date.now();
    if (accessTokenCache && accessTokenCache.expiresAt - 60000 > now) {
        return accessTokenCache.token;
    }
    const credentials = getFcmCredentials();
    if (!credentials)
        return null;
    const privateKey = await (0, jose_1.importPKCS8)(credentials.privateKey, "RS256");
    const issuedAt = Math.floor(now / 1000);
    const assertion = await new jose_1.SignJWT({
        scope: FCM_SCOPE,
    })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuer(credentials.clientEmail)
        .setSubject(credentials.clientEmail)
        .setAudience(OAUTH_TOKEN_URL)
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + 3600)
        .sign(privateKey);
    const response = await fetch(OAUTH_TOKEN_URL, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
        }),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Failed to obtain FCM access token (${response.status}): ${detail}`);
    }
    const json = await response.json();
    const token = String(json.access_token ?? "").trim();
    const expiresIn = Number(json.expires_in ?? 3600);
    if (!token) {
        throw new Error("FCM access token response was missing access_token");
    }
    accessTokenCache = {
        token,
        expiresAt: now + Math.max(60, expiresIn) * 1000,
    };
    return token;
}
function isInvalidTokenResponse(status, detail) {
    if (status === 404)
        return true;
    const lowered = detail.toLowerCase();
    return (lowered.includes("unregistered") ||
        lowered.includes("registration-token-not-registered") ||
        lowered.includes("invalid registration token") ||
        lowered.includes("requested entity was not found"));
}
async function sendFcmPushToRegisteredDevices(payload) {
    const credentials = getFcmCredentials();
    if (!credentials) {
        return { sent: 0, skipped: 0, configured: false };
    }
    const registrations = await db.getActivePushDeviceRegistrations();
    if (registrations.length === 0) {
        return { sent: 0, skipped: 0, configured: true };
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return { sent: 0, skipped: registrations.length, configured: false };
    }
    const normalizedTargetRoles = Array.isArray(payload.targetRoles)
        ? Array.from(new Set(payload.targetRoles
            .map((value) => String(value ?? "").trim().toLowerCase())
            .filter(Boolean)))
        : [];
    const userRoleCache = new Map();
    let sent = 0;
    let skipped = 0;
    for (const registration of registrations) {
        const token = String(registration.token ?? "").trim();
        if (!token) {
            skipped += 1;
            continue;
        }
        if (normalizedTargetRoles.length > 0) {
            const registrationUserId = Number(registration.userId ?? 0);
            if (!Number.isFinite(registrationUserId) || registrationUserId <= 0) {
                skipped += 1;
                continue;
            }
            let userRole = userRoleCache.get(registrationUserId);
            if (!userRole) {
                const user = await db.getUserById(registrationUserId).catch(() => null);
                userRole = String(user?.role ?? "").trim().toLowerCase();
                if (userRole)
                    userRoleCache.set(registrationUserId, userRole);
            }
            if (!userRole || !normalizedTargetRoles.includes(userRole)) {
                skipped += 1;
                continue;
            }
        }
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                message: {
                    token,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                    },
                    data: {
                        notificationId: payload.notificationId,
                        kind: payload.kind ?? "info",
                        targetRoles: normalizedTargetRoles.join(","),
                        path: payload.path ?? "",
                        entityType: payload.entityType ?? "",
                        entityId: payload.entityId == null ? "" : String(payload.entityId),
                    },
                    android: {
                        priority: "high",
                        notification: {
                            channel_id: "selrs-push",
                        },
                    },
                },
            }),
        });
        if (response.ok) {
            sent += 1;
            continue;
        }
        const detail = await response.text().catch(() => "");
        if (isInvalidTokenResponse(response.status, detail)) {
            await db.disablePushDeviceToken(token).catch(() => { });
        }
        skipped += 1;
        console.warn(`[FCM] Failed to send push (${response.status}) for token ${token.slice(0, 12)}...: ${detail}`);
    }
    return {
        sent,
        skipped,
        configured: true,
    };
}
