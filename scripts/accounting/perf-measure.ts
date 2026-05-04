/**
 * Wall-clock timings for accounting service calls (Task 18 baseline / regression).
 * Uses the same MSSQL pool as production accounting code.
 *
 * Warmup: preload modules + prime MSSQL pool so timings reflect steady-state queries.
 *
 * Usage: node --import tsx scripts/accounting/perf-measure.ts
 */

import "dotenv/config";

const RANGE = { fromDate: "2026-04-01", toDate: "2026-04-30" };
const SECTION = 15;
const MEDIAN_RUNS = Number(process.env.ACCOUNTING_PERF_RUNS ?? "5");

async function timeMs<T>(name: string, fn: () => Promise<T>): Promise<{ name: string; ms: number }> {
  const t0 = performance.now();
  await fn();
  const ms = Math.round((performance.now() - t0) * 100) / 100;
  return { name, ms };
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

async function medianMs(name: string, fn: () => Promise<unknown>): Promise<{ name: string; ms: number }> {
  const timings: number[] = [];
  for (let i = 0; i < MEDIAN_RUNS; i++) {
    timings.push((await timeMs(name, fn)).ms);
  }
  return { name, ms: Math.round(median(timings) * 100) / 100 };
}

async function main() {
  // Warm module graph + MSSQL pool (matches long-lived server behavior).
  await import("../../server/services/accounting/dashboardSummary.service");
  await import("../../server/services/accounting/dailyRevenue.service");
  await import("../../server/services/accounting/lasikRevenue.service");
  await import("../../server/services/accounting/receiptsInquiry.service");
  await import("../../server/services/accounting/lasikReceipts.service");
  await import("../../server/services/accounting/lasikServices.service");
  await import("../../server/services/accounting/lasikPatientAccounting.service");
  const { mssqlQuery } = await import("../../server/services/accounting/mssqlAccounting");
  await mssqlQuery("SELECT 1 AS x", {}, "warmup");

  const rows: { name: string; ms: number }[] = [];

  rows.push(
    await medianMs("dashboardSummary", async () => {
      const { getDashboardSummary } = await import("../../server/services/accounting/dashboardSummary.service");
      await getDashboardSummary({ sectionCode: SECTION });
    }),
  );

  rows.push(
    await medianMs("dailyRevenue", async () => {
      const { getDailyRevenue } = await import("../../server/services/accounting/dailyRevenue.service");
      await getDailyRevenue({ ...RANGE, sectionCode: SECTION });
    }),
  );

  rows.push(
    await medianMs("serviceRevenue", async () => {
      const { getServiceRevenue } = await import("../../server/services/accounting/lasikRevenue.service");
      await getServiceRevenue({ ...RANGE, sectionCode: SECTION });
    }),
  );

  rows.push(
    await medianMs("receiptsInquiry", async () => {
      const { getReceiptsInquiry } = await import("../../server/services/accounting/receiptsInquiry.service");
      await getReceiptsInquiry({ ...RANGE, sectionCode: SECTION });
    }),
  );

  rows.push(
    await medianMs("receiptDetail", async () => {
      const { getReceiptDetail } = await import("../../server/services/accounting/receiptsInquiry.service");
      await getReceiptDetail({ sectionCode: SECTION, trTy: 1, trNo: "1812" });
    }),
  );

  rows.push(
    await medianMs("lasikReceipts", async () => {
      const { getLasikReceipts } = await import("../../server/services/accounting/lasikReceipts.service");
      await getLasikReceipts({ ...RANGE });
    }),
  );

  rows.push(
    await medianMs("lasikServices", async () => {
      const { getLasikServices } = await import("../../server/services/accounting/lasikServices.service");
      await getLasikServices({ ...RANGE });
    }),
  );

  rows.push(
    await medianMs("lasikRevenueSummary", async () => {
      const { getLasikRevenueSummary } = await import("../../server/services/accounting/lasikRevenue.service");
      await getLasikRevenueSummary({ ...RANGE });
    }),
  );

  rows.push(
    await medianMs("patientLasikSummary", async () => {
      const { getPatientLasikSummary } = await import(
        "../../server/services/accounting/lasikPatientAccounting.service"
      );
      await getPatientLasikSummary({ patientCode: "1354", sectionCode: SECTION });
    }),
  );

  console.log(JSON.stringify({ window: RANGE, medianOfRuns: MEDIAN_RUNS, rows }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
