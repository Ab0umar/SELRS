import { customType } from "drizzle-orm/mysql-core";

// Before August 2026, Drizzle wrote UTC clock text to a MySQL TIMESTAMP
// connection whose session time zone was Cairo. Keep that historical decoding
// until the scoped data correction is applied; newer rows use Cairo wall time.
const LOCAL_STORAGE_START = "2026-08-01 00:00:00";

function correctionIsActive(): boolean {
  // The deployed bundle can be built before the historic rows are migrated.
  // Enable only after the service is stopped and the August backfill commits.
  return process.env.ATTENDANCE_TIME_FIX_ENABLED === "1";
}

function localWallTime(value: Date): string {
  const pad = (part: number, width = 2) => String(part).padStart(width, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}.${pad(value.getMilliseconds(), 3)}`;
}

export const attendanceTimestamp = customType<{
  data: Date;
  driverData: string;
}>({
  dataType: () => "timestamp",
  toDriver(value) {
    const local = localWallTime(value);
    return !correctionIsActive() || local < LOCAL_STORAGE_START
      ? value.toISOString().replace("T", " ").slice(0, 23)
      : local;
  },
  fromDriver(value) {
    const wall = value.replace("T", " ");
    const dateTime = wall.replace(" ", "T");
    return new Date(
      !correctionIsActive() || wall < LOCAL_STORAGE_START
        ? `${dateTime}Z`
        : dateTime,
    );
  },
});
