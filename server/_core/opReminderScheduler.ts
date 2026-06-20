import { eq } from "drizzle-orm";
import { pushAppNotification } from "./appNotifications";
import { getOperationBookingsByDateRange, getDb, getSystemSetting, updateSystemSettings } from "../db";
import { operationLists, operationListItems } from "../../drizzle/schema";

const DEFAULT_SEND_HOUR = 20;
const LABEL = "[op-reminder]";
const LAST_SENT_KEY = "op_reminder_last_sent_date";

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getLastSentDate(): Promise<string> {
  try {
    const row = await getSystemSetting(LAST_SENT_KEY);
    const raw = typeof row?.value === "string" ? row.value : "";
    try { return JSON.parse(raw); } catch { return raw; }
  } catch {
    return "";
  }
}

async function markSentToday(): Promise<void> {
  await updateSystemSettings(LAST_SENT_KEY, todayDateString()).catch(() => {});
}

async function getOperationListsForDate(dateStr: string) {
  const db = await getDb();
  if (!db) return [];
  const lists = await db
    .select()
    .from(operationLists)
    .where(eq(operationLists.listDate, dateStr as any));

  const results = [];
  for (const list of lists) {
    const items = await db
      .select()
      .from(operationListItems)
      .where(eq(operationListItems.listId, list.id));
    results.push({ list, items });
  }
  return results;
}

async function loadOpReminderConfig(): Promise<{
  enabled: boolean;
  sendHour: number;
  targetAll: boolean;
  userIds: number[];
}> {
  try {
    const row = await getSystemSetting("app_notification_settings_v1");
    if (!row?.value) return { enabled: false, sendHour: DEFAULT_SEND_HOUR, targetAll: true, userIds: [] };
    const parsed: unknown = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    const raw = parsed as Record<string, unknown> | undefined;
    const rem = raw?.opReminder as Record<string, unknown> | undefined;
    if (!rem) return { enabled: false, sendHour: DEFAULT_SEND_HOUR, targetAll: true, userIds: [] };
    const enabled = typeof rem.enabled === "boolean" ? rem.enabled : false;
    const sendHour = Number.isFinite(Number(rem.sendHour)) ? Number(rem.sendHour) : DEFAULT_SEND_HOUR;
    const targetAll = typeof rem.targetAll === "boolean" ? rem.targetAll : true;
    const userIds = Array.isArray(rem.userIds)
      ? (rem.userIds as unknown[]).map(Number).filter((n) => Number.isFinite(n))
      : [];
    return { enabled, sendHour, targetAll, userIds };
  } catch {
    return { enabled: false, sendHour: DEFAULT_SEND_HOUR, targetAll: true, userIds: [] };
  }
}

async function sendOpReminders(): Promise<void> {
  const cfg = await loadOpReminderConfig();
  if (!cfg.enabled) {
    console.log(`${LABEL} Disabled in settings — skipping`);
    return;
  }

  const targetUserIds = cfg.targetAll ? null : cfg.userIds.length > 0 ? cfg.userIds : null;
  const tomorrow = tomorrowDateString();

  // Mark as sent first so concurrent minute ticks don't re-trigger
  await markSentToday();

  // --- operationBookings ---
  const bookings = await getOperationBookingsByDateRange(tomorrow, tomorrow);
  for (const op of bookings) {
    const title = `عملية غداً — ${op.operationType}`;
    const body = [
      `الطبيب: ${op.doctorName}`,
      `الوقت: ${op.bookingTime}`,
      op.casesCount > 1 ? `عدد الحالات: ${op.casesCount}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    await pushAppNotification({
      title,
      message: body,
      kind: "info",
      targetRoles: null,
      targetUserIds,
      source: "op-reminder",
      entityType: "operationBooking",
      entityId: op.id,
    }).catch((err) =>
      console.error(`${LABEL} booking ${op.id} failed:`, err),
    );
  }

  // --- operationLists (with patient items) ---
  const lists = await getOperationListsForDate(tomorrow);
  for (const { list, items } of lists) {
    const type = list.operationType ?? list.doctorTab;
    const title = `قائمة عمليات غداً — ${type}`;
    const body = [
      list.doctorName ? `الطبيب: ${list.doctorName}` : null,
      list.listTime ? `الوقت: ${list.listTime}` : null,
      items.length > 0 ? `عدد المرضى: ${items.length}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    await pushAppNotification({
      title,
      message: body,
      kind: "info",
      targetRoles: null,
      targetUserIds,
      source: "op-reminder",
      entityType: "operationList",
      entityId: list.id,
    }).catch((err) =>
      console.error(`${LABEL} list ${list.id} failed:`, err),
    );
  }

  const total = bookings.length + lists.length;
  if (total === 0) {
    console.log(`${LABEL} No operations scheduled for ${tomorrow}`);
  } else {
    console.log(
      `${LABEL} Sent ${total} reminder(s) for ${tomorrow} (${bookings.length} bookings, ${lists.length} lists)`,
    );
  }
}

export function startOpReminderScheduler(): void {
  setInterval(() => {
    const now = new Date();
    void (async () => {
      const cfg = await loadOpReminderConfig().catch(() => null);
      if (!cfg?.enabled) return;
      if (now.getHours() !== cfg.sendHour) return;
      // Check DB (survives server restarts) instead of in-memory variable
      const lastSent = await getLastSentDate();
      if (lastSent === todayDateString()) return;
      await sendOpReminders().catch((err) =>
        console.error(`${LABEL} Scheduler error:`, err),
      );
    })();
  }, 60_000); // check every minute
}
