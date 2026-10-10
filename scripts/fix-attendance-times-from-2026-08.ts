/**
 * One-time correction for attendance clock columns written before the scoped
 * Cairo timestamp codec was deployed. Run without --apply to preview first.
 * Stop SRV100 before --apply so an old runtime cannot insert legacy rows.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";

const PUNCH_CUTOFF = "2026-07-31 21:00:00"; // 2026-08-01 00:00 Cairo in summer
const WORK_DATE_CUTOFF = "2026-08-01";
const EXPECTED_OFFSET_SECONDS = 3 * 60 * 60;

type DeviceOffset = RowDataPacket & {
  deviceId: string;
  rowsChecked: number;
  minOffset: number;
  maxOffset: number;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const apply = process.argv.includes("--apply");
  const verify = process.argv.includes("--verify");
  if (apply) {
    const backupPath = process.argv
      .find((arg) => arg.startsWith("--backup="))
      ?.slice("--backup=".length);
    if (!backupPath || statSync(backupPath).size === 0) {
      throw new Error("--apply requires a nonempty --backup=<path> dump");
    }
    const serviceStatus = execFileSync("sc.exe", ["query", "SRV100"], {
      encoding: "utf8",
    });
    if (!/STATE\s*:\s*1\s+STOPPED/i.test(serviceStatus)) {
      throw new Error("SRV100 must be stopped before applying timestamp changes");
    }
  }
  const connection = await mysql.createConnection({
    uri: databaseUrl,
    timezone: "local",
  });

  try {
    const [clock] = await connection.query<RowDataPacket[]>(
      "SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) AS utcOffsetSeconds",
    );
    if (Number(clock[0]?.utcOffsetSeconds) !== EXPECTED_OFFSET_SECONDS) {
      throw new Error("Expected the MySQL session to be Cairo summer time (+03:00)");
    }

    const [counts] = await connection.execute<RowDataPacket[]>(
      `SELECT source, COALESCE(device_id, '(none)') AS deviceId, COUNT(*) AS rowsToFix
         FROM attendance_punches WHERE punch_at >= ?
         GROUP BY source, device_id ORDER BY rowsToFix DESC`,
      [PUNCH_CUTOFF],
    );
    const [dailyCounts] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS dailyRows,
              SUM(first_in IS NOT NULL) AS firstInRows,
              SUM(last_out IS NOT NULL) AS lastOutRows
         FROM attendance_daily WHERE work_date >= ?`,
      [WORK_DATE_CUTOFF],
    );

    const getDeviceOffsets = async () => {
      const [rows] = await connection.execute<DeviceOffset[]>(
        `SELECT device_id AS deviceId, COUNT(*) AS rowsChecked,
                MIN(TIMESTAMPDIFF(SECOND, punch_at,
                    FROM_UNIXTIME(CAST(SUBSTRING_INDEX(source_row_id, '_', -1) AS UNSIGNED) / 1000))) AS minOffset,
                MAX(TIMESTAMPDIFF(SECOND, punch_at,
                    FROM_UNIXTIME(CAST(SUBSTRING_INDEX(source_row_id, '_', -1) AS UNSIGNED) / 1000))) AS maxOffset
           FROM attendance_punches
          WHERE punch_at >= ?
            AND (device_id = 'fk_ef10k' OR device_id LIKE 'zk_%')
            AND source_row_id REGEXP '_[0-9]{13}$'
          GROUP BY device_id`,
        [PUNCH_CUTOFF],
      );
      return rows.map((row) => ({
        deviceId: row.deviceId,
        rowsChecked: Number(row.rowsChecked),
        minOffset: Number(row.minOffset),
        maxOffset: Number(row.maxOffset),
      }));
    };

    const before = await getDeviceOffsets();
    console.log(JSON.stringify({
      mode: apply ? "apply" : verify ? "verify" : "preview",
      from: WORK_DATE_CUTOFF,
      punches: counts,
      daily: dailyCounts[0],
      deviceOffsetsSeconds: before,
    }, null, 2));

    if (verify) {
      if (process.env.ATTENDANCE_TIME_FIX_ENABLED !== "1" || before.length === 0 ||
          before.some((row) => row.minOffset !== 0 || row.maxOffset !== 0)) {
        throw new Error("August attendance timestamp correction is not fully active");
      }
      return;
    }
    if (!apply) return;
    if (before.length === 0) throw new Error("No device timestamp anchors found");
    if (before.every((row) => row.minOffset === 0 && row.maxOffset === 0)) {
      console.log("Already corrected; no rows changed");
      return;
    }
    if (before.some((row) =>
      row.minOffset !== EXPECTED_OFFSET_SECONDS ||
      row.maxOffset !== EXPECTED_OFFSET_SECONDS
    )) {
      throw new Error("Mixed or unexpected device offsets; no rows changed");
    }

    await connection.beginTransaction();
    try {
      const [punchResult] = await connection.execute<mysql.ResultSetHeader>(
        `UPDATE attendance_punches
            SET punch_at = DATE_ADD(punch_at, INTERVAL 3 HOUR)
          WHERE punch_at >= ?`,
        [PUNCH_CUTOFF],
      );
      const [dailyResult] = await connection.execute<mysql.ResultSetHeader>(
        `UPDATE attendance_daily
            SET first_in = DATE_ADD(first_in, INTERVAL 3 HOUR),
                last_out = DATE_ADD(last_out, INTERVAL 3 HOUR)
          WHERE work_date >= ?`,
        [WORK_DATE_CUTOFF],
      );

      const after = await getDeviceOffsets();
      if (after.some((row) => row.minOffset !== 0 || row.maxOffset !== 0)) {
        throw new Error("Timestamp validation failed; transaction rolled back");
      }
      await connection.commit();
      console.log(JSON.stringify({
        correctedPunchRows: punchResult.affectedRows,
        correctedDailyRows: dailyResult.affectedRows,
        deviceOffsetsSeconds: after,
      }, null, 2));
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
