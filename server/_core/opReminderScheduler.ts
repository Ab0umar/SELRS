import { eq, and } from "drizzle-orm";
import { pushAppNotification } from "./appNotifications";
import { getOperationBookingsByDateRange, getDb } from "../db";
import { operationLists, operationListItems } from "../../drizzle/schema";

const SEND_HOUR = 20; // 8pm — configurable via OP_REMINDER_HOUR env var
const LABEL = "[op-reminder]";

let lastSentDate = ""; // tracks which calendar date we already fired for

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
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

async function sendOpReminders(): Promise<void> {
  const tomorrow = tomorrowDateString();

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
      targetRoles: null, // null = all roles
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
  const sendHour =
    Number.isFinite(Number(process.env.OP_REMINDER_HOUR))
      ? Number(process.env.OP_REMINDER_HOUR)
      : SEND_HOUR;

  setInterval(() => {
    const now = new Date();
    if (now.getHours() !== sendHour) return;
    const today = todayDateString();
    if (lastSentDate === today) return; // already fired today
    lastSentDate = today;
    void sendOpReminders().catch((err) =>
      console.error(`${LABEL} Scheduler error:`, err),
    );
  }, 60_000); // check every minute
}
