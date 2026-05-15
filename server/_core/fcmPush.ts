import { importPKCS8, SignJWT } from "jose";
import { ENV } from "./env";
import * as db from "../db";

export type FcmPushPayload = {
  notificationId: string;
  title: string;
  body: string;
  kind?: "info" | "success" | "warning" | "error";
  targetRoles?: string[] | null;
  targetUserIds?: number[] | null;
  path?: string | null;
  entityType?: string | null;
  entityId?: number | null;
};

type FcmCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type AccessTokenCache = {
  token: string;
  expiresAt: number;
};

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

let accessTokenCache: AccessTokenCache | null = null;

function getFcmCredentials(): FcmCredentials | null {
  if (ENV.fcmServiceAccountJson) {
    try {
      const parsed = JSON.parse(ENV.fcmServiceAccountJson) as Record<string, unknown>;
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
    } catch (error) {
      console.warn("[FCM] Invalid FCM_SERVICE_ACCOUNT_JSON:", error);
    }
  }

  const projectId = String(ENV.fcmProjectId ?? "").trim();
  const clientEmail = String(ENV.fcmClientEmail ?? "").trim();
  const privateKey = String(ENV.fcmPrivateKey ?? "").replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

async function getAccessToken() {
  const now = Date.now();
  if (accessTokenCache && accessTokenCache.expiresAt - 60_000 > now) {
    return accessTokenCache.token;
  }

  const credentials = getFcmCredentials();
  if (!credentials) return null;

  const privateKey = await importPKCS8(credentials.privateKey, "RS256");
  const issuedAt = Math.floor(now / 1000);
  const assertion = await new SignJWT({
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

  const json = await response.json() as {
    access_token?: string;
    expires_in?: number;
  };
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

function isInvalidTokenResponse(status: number, detail: string) {
  if (status === 404) return true;
  const lowered = detail.toLowerCase();
  return (
    lowered.includes("unregistered") ||
    lowered.includes("registration-token-not-registered") ||
    lowered.includes("invalid registration token") ||
    lowered.includes("requested entity was not found")
  );
}

export async function sendFcmPushToRegisteredDevices(payload: FcmPushPayload) {
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
    ? Array.from(
        new Set(
          payload.targetRoles
            .map((value) => String(value ?? "").trim().toLowerCase())
            .filter(Boolean)
        )
      )
    : [];
  const normalizedTargetUserIds = Array.isArray(payload.targetUserIds)
    ? Array.from(
        new Set(
          payload.targetUserIds
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        )
      )
    : [];
  const userRoleCache = new Map<number, string>();
  let sent = 0;
  let skipped = 0;

  for (const registration of registrations) {
    const token = String((registration as any).token ?? "").trim();
    if (!token) {
      skipped += 1;
      continue;
    }
    const registrationUserId = Number((registration as any).userId ?? 0);
    if (normalizedTargetUserIds.length > 0) {
      if (!Number.isFinite(registrationUserId) || !normalizedTargetUserIds.includes(registrationUserId)) {
        skipped += 1;
        continue;
      }
    }
    if (normalizedTargetRoles.length > 0) {
      if (!Number.isFinite(registrationUserId) || registrationUserId <= 0) {
        skipped += 1;
        continue;
      }
      let userRole = userRoleCache.get(registrationUserId);
      if (!userRole) {
        const user = await db.getUserById(registrationUserId).catch(() => null);
        userRole = String((user as any)?.role ?? "").trim().toLowerCase();
        if (userRole) userRoleCache.set(registrationUserId, userRole);
      }
      if (!userRole || !normalizedTargetRoles.includes(userRole)) {
        skipped += 1;
        continue;
      }
    }

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`,
      {
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
              targetUserIds: normalizedTargetUserIds.join(","),
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
      }
    );

    if (response.ok) {
      sent += 1;
      continue;
    }

    const detail = await response.text().catch(() => "");
    if (isInvalidTokenResponse(response.status, detail)) {
      await db.disablePushDeviceToken(token).catch(() => {});
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
