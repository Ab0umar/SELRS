import * as db from "../db";
import { sendFcmPushToRegisteredDevices } from "./fcmPush";

export const APP_NOTIFICATION_FEED_KEY = "app_notifications_feed_v1";
export const APP_NOTIFICATION_SETTINGS_KEY = "app_notification_settings_v1";
const APP_NOTIFICATION_FEED_LIMIT = 50;

export type AppNotificationEntry = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  kind: "info" | "success" | "warning" | "error";
  targetRoles?: string[] | null;
  targetUserIds?: number[] | null;
  source?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  meta?: Record<string, unknown> | null;
};

type PushAppNotificationInput = {
  title: string;
  message: string;
  kind?: AppNotificationEntry["kind"];
  targetRoles?: string[] | null;
  targetUserIds?: number[] | null;
  source?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  meta?: Record<string, unknown> | null;
  /** Override which delivery channels fire. Both default to true when omitted. */
  channels?: { inApp?: boolean; push?: boolean };
};

export type CategoryChannels = {
  enabled: boolean;
  inApp: boolean;
  push: boolean;
  local: boolean;
};

export type AppNotificationSettings = {
  patients: CategoryChannels;
  operations: CategoryChannels & { userIds: number[] };
  attendance: CategoryChannels & { managerId: number | null };
  stockroom: CategoryChannels;
};

export const DEFAULT_APP_NOTIFICATION_SETTINGS: AppNotificationSettings = {
  patients:   { enabled: true,  inApp: true,  push: false, local: false },
  operations: { enabled: false, inApp: false, push: false, local: false, userIds: [] },
  attendance: { enabled: true,  inApp: true,  push: false, local: false, managerId: null },
  stockroom:  { enabled: false, inApp: false, push: false, local: false },
};

const normalizeFeed = (value: unknown): AppNotificationEntry[] => {
  if (!Array.isArray(value)) return [];
  const normalized: AppNotificationEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const title = String(row.title ?? "").trim();
    const message = String(row.message ?? "").trim();
    const createdAt = String(row.createdAt ?? "").trim();
    const kindRaw = String(row.kind ?? "info").trim().toLowerCase();
    const kind: AppNotificationEntry["kind"] =
      kindRaw === "success" || kindRaw === "warning" || kindRaw === "error" ? kindRaw : "info";
    const targetRolesRaw = Array.isArray(row.targetRoles) ? row.targetRoles : [];
    const targetRoles = targetRolesRaw
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);
    const targetUserIdsRaw = Array.isArray(row.targetUserIds) ? row.targetUserIds : [];
    const targetUserIds = targetUserIdsRaw
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    if (!id || !title || !message || !createdAt) continue;
    normalized.push({
      id,
      title,
      message,
      createdAt,
      kind,
      targetRoles: targetRoles.length ? Array.from(new Set(targetRoles)) : null,
      targetUserIds: targetUserIds.length ? Array.from(new Set(targetUserIds)) : null,
      source: row.source == null ? null : String(row.source),
      entityType: row.entityType == null ? null : String(row.entityType),
      entityId: Number.isFinite(Number(row.entityId)) ? Number(row.entityId) : null,
      meta: row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : null,
    });
  }
  return normalized;
};

export async function pushAppNotification(input: PushAppNotificationInput): Promise<AppNotificationEntry> {
  const doInApp = input.channels?.inApp !== false;
  const doPush = input.channels?.push !== false;

  const entry: AppNotificationEntry = {
    id: `app_ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: String(input.title ?? "").trim(),
    message: String(input.message ?? "").trim(),
    createdAt: new Date().toISOString(),
    kind: input.kind ?? "info",
    targetRoles: Array.isArray(input.targetRoles)
      ? Array.from(
          new Set(
            input.targetRoles
              .map((value) => String(value ?? "").trim().toLowerCase())
              .filter(Boolean)
          )
        )
      : null,
    targetUserIds: Array.isArray(input.targetUserIds)
      ? Array.from(
          new Set(
            input.targetUserIds
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value))
          )
        )
      : null,
    source: input.source ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    meta: input.meta ?? null,
  };

  if (doInApp) {
    const row = await db.getSystemSetting(APP_NOTIFICATION_FEED_KEY).catch(() => null);
    let existingFeed: AppNotificationEntry[] = [];
    if (row?.value) {
      try {
        existingFeed = normalizeFeed(JSON.parse(String(row.value)));
      } catch {
        existingFeed = [];
      }
    }
    const nextFeed = [entry, ...existingFeed].slice(0, APP_NOTIFICATION_FEED_LIMIT);
    await db.updateSystemSettings(APP_NOTIFICATION_FEED_KEY, nextFeed);
  }

  if (doPush) {
    await sendFcmPushToRegisteredDevices({
      notificationId: entry.id,
      title: entry.title,
      body: entry.message,
      kind: entry.kind,
      targetRoles: entry.targetRoles ?? null,
      targetUserIds: entry.targetUserIds ?? null,
      path: entry.meta?.path ? String(entry.meta.path) : null,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
    }).catch((error) => {
      console.warn("[FCM] pushAppNotification send failed:", error);
    });
  }

  return entry;
}

export async function getAppNotificationSettings(): Promise<AppNotificationSettings> {
  const row = await db.getSystemSetting(APP_NOTIFICATION_SETTINGS_KEY).catch(() => null);
  if (!row?.value) return DEFAULT_APP_NOTIFICATION_SETTINGS;
  try {
    const parsed = JSON.parse(String(row.value)) as Record<string, unknown>;

    const parseCat = (raw: unknown, def: CategoryChannels): CategoryChannels => {
      if (!raw || typeof raw !== "object") return def;
      const r = raw as Record<string, unknown>;
      return {
        enabled: typeof r.enabled === "boolean" ? r.enabled : def.enabled,
        inApp:   typeof r.inApp   === "boolean" ? r.inApp   : def.inApp,
        push:    typeof r.push    === "boolean" ? r.push    : def.push,
        local:   typeof r.local   === "boolean" ? r.local   : def.local,
      };
    };

    if (parsed.patients && typeof parsed.patients === "object") {
      // New nested format
      const opsRaw = parsed.operations as Record<string, unknown> | undefined;
      const userIds = Array.isArray(opsRaw?.userIds)
        ? (opsRaw!.userIds as unknown[]).map(Number).filter((v) => Number.isFinite(v))
        : [];
      const attnRaw = parsed.attendance as Record<string, unknown> | undefined;
      const managerId =
        attnRaw?.managerId != null && Number.isFinite(Number(attnRaw.managerId))
          ? Number(attnRaw.managerId)
          : null;
      return {
        patients:   parseCat(parsed.patients,   DEFAULT_APP_NOTIFICATION_SETTINGS.patients),
        operations: { ...parseCat(parsed.operations, DEFAULT_APP_NOTIFICATION_SETTINGS.operations), userIds },
        attendance: { ...parseCat(parsed.attendance, DEFAULT_APP_NOTIFICATION_SETTINGS.attendance), managerId },
        stockroom:  parseCat(parsed.stockroom,  DEFAULT_APP_NOTIFICATION_SETTINGS.stockroom),
      };
    }

    // v1 flat format backward-compat
    const legacyUserIds = Array.isArray(parsed.operationsPushUserIds)
      ? (parsed.operationsPushUserIds as unknown[]).map(Number).filter((v) => Number.isFinite(v))
      : [];
    const legacyOpsPush =
      typeof parsed.operationsPushEnabled === "boolean" ? parsed.operationsPushEnabled : false;
    return {
      patients: {
        ...DEFAULT_APP_NOTIFICATION_SETTINGS.patients,
        inApp: typeof parsed.manualPatientInAppEnabled === "boolean"
          ? parsed.manualPatientInAppEnabled
          : DEFAULT_APP_NOTIFICATION_SETTINGS.patients.inApp,
      },
      operations: {
        ...DEFAULT_APP_NOTIFICATION_SETTINGS.operations,
        enabled: legacyOpsPush,
        push:    legacyOpsPush,
        userIds: legacyUserIds,
      },
      attendance: DEFAULT_APP_NOTIFICATION_SETTINGS.attendance,
      stockroom:  DEFAULT_APP_NOTIFICATION_SETTINGS.stockroom,
    };
  } catch {
    return DEFAULT_APP_NOTIFICATION_SETTINGS;
  }
}
