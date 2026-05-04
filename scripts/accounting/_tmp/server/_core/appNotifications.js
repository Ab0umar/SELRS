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
exports.APP_NOTIFICATION_SETTINGS_KEY = exports.APP_NOTIFICATION_FEED_KEY = void 0;
exports.pushAppNotification = pushAppNotification;
exports.getAppNotificationSettings = getAppNotificationSettings;
const db = __importStar(require("../db"));
const fcmPush_1 = require("./fcmPush");
exports.APP_NOTIFICATION_FEED_KEY = "app_notifications_feed_v1";
exports.APP_NOTIFICATION_SETTINGS_KEY = "app_notification_settings_v1";
const APP_NOTIFICATION_FEED_LIMIT = 50;
const DEFAULT_APP_NOTIFICATION_SETTINGS = {
    mssqlOwnerEnabled: true,
    mssqlInAppEnabled: true,
    manualPatientInAppEnabled: true,
    operationsPushEnabled: false,
    operationsPushUserIds: [],
};
const normalizeFeed = (value) => {
    if (!Array.isArray(value))
        return [];
    const normalized = [];
    for (const item of value) {
        if (!item || typeof item !== "object")
            continue;
        const row = item;
        const id = String(row.id ?? "").trim();
        const title = String(row.title ?? "").trim();
        const message = String(row.message ?? "").trim();
        const createdAt = String(row.createdAt ?? "").trim();
        const kindRaw = String(row.kind ?? "info").trim().toLowerCase();
        const kind = kindRaw === "success" || kindRaw === "warning" || kindRaw === "error" ? kindRaw : "info";
        const targetRolesRaw = Array.isArray(row.targetRoles) ? row.targetRoles : [];
        const targetRoles = targetRolesRaw
            .map((value) => String(value ?? "").trim().toLowerCase())
            .filter(Boolean);
        const targetUserIdsRaw = Array.isArray(row.targetUserIds) ? row.targetUserIds : [];
        const targetUserIds = targetUserIdsRaw
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
        if (!id || !title || !message || !createdAt)
            continue;
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
            meta: row.meta && typeof row.meta === "object" ? row.meta : null,
        });
    }
    return normalized;
};
async function pushAppNotification(input) {
    const row = await db.getSystemSetting(exports.APP_NOTIFICATION_FEED_KEY).catch(() => null);
    let existingFeed = [];
    if (row?.value) {
        try {
            existingFeed = normalizeFeed(JSON.parse(String(row.value)));
        }
        catch {
            existingFeed = [];
        }
    }
    const entry = {
        id: `app_ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: String(input.title ?? "").trim(),
        message: String(input.message ?? "").trim(),
        createdAt: new Date().toISOString(),
        kind: input.kind ?? "info",
        targetRoles: Array.isArray(input.targetRoles)
            ? Array.from(new Set(input.targetRoles
                .map((value) => String(value ?? "").trim().toLowerCase())
                .filter(Boolean)))
            : null,
        targetUserIds: Array.isArray(input.targetUserIds)
            ? Array.from(new Set(input.targetUserIds
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value))))
            : null,
        source: input.source ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        meta: input.meta ?? null,
    };
    const nextFeed = [entry, ...existingFeed].slice(0, APP_NOTIFICATION_FEED_LIMIT);
    await db.updateSystemSettings(exports.APP_NOTIFICATION_FEED_KEY, nextFeed);
    await (0, fcmPush_1.sendFcmPushToRegisteredDevices)({
        notificationId: entry.id,
        title: entry.title,
        body: entry.message,
        kind: entry.kind,
        targetRoles: entry.targetRoles ?? null,
        path: entry.meta?.path ? String(entry.meta.path) : null,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
    }).catch((error) => {
        console.warn("[FCM] pushAppNotification send failed:", error);
    });
    return entry;
}
async function getAppNotificationSettings() {
    const row = await db.getSystemSetting(exports.APP_NOTIFICATION_SETTINGS_KEY).catch(() => null);
    if (!row?.value)
        return DEFAULT_APP_NOTIFICATION_SETTINGS;
    try {
        const parsed = JSON.parse(String(row.value));
        const operationsPushUserIdsRaw = Array.isArray(parsed.operationsPushUserIds) ? parsed.operationsPushUserIds : [];
        const operationsPushUserIds = operationsPushUserIdsRaw
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
        return {
            mssqlOwnerEnabled: typeof parsed.mssqlOwnerEnabled === "boolean"
                ? parsed.mssqlOwnerEnabled
                : DEFAULT_APP_NOTIFICATION_SETTINGS.mssqlOwnerEnabled,
            mssqlInAppEnabled: typeof parsed.mssqlInAppEnabled === "boolean"
                ? parsed.mssqlInAppEnabled
                : DEFAULT_APP_NOTIFICATION_SETTINGS.mssqlInAppEnabled,
            manualPatientInAppEnabled: typeof parsed.manualPatientInAppEnabled === "boolean"
                ? parsed.manualPatientInAppEnabled
                : DEFAULT_APP_NOTIFICATION_SETTINGS.manualPatientInAppEnabled,
            operationsPushEnabled: typeof parsed.operationsPushEnabled === "boolean"
                ? parsed.operationsPushEnabled
                : DEFAULT_APP_NOTIFICATION_SETTINGS.operationsPushEnabled,
            operationsPushUserIds: operationsPushUserIds.length > 0 ? operationsPushUserIds : DEFAULT_APP_NOTIFICATION_SETTINGS.operationsPushUserIds,
        };
    }
    catch {
        return DEFAULT_APP_NOTIFICATION_SETTINGS;
    }
}
