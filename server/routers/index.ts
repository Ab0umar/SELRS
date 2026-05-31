import { router } from "../_core/procedures";
import { accountingRouter } from "./accounting";
import { attendanceRouter } from "./attendance";
import { medicalRouter } from "./medical";
import { patientRouter } from "./patient";
import { stockroomRouter } from "./stockroom";
import { salaryRouter } from "./salary";

console.log("[DEBUG] index.ts body running");

let patientPortalRouter: any = null;
try {
  const m = await import("./patientPortal.js");
  patientPortalRouter = m.patientPortalRouter;
  console.log("[DEBUG] patientPortal OK:", Object.keys(patientPortalRouter._def.procedures));
} catch (e: any) {
  console.error("[DEBUG] patientPortal FAILED:", e?.message ?? String(e));
  if (e?.stack) console.error(e.stack);
}

export const appRouter = router({
  accounting: accountingRouter,
  attendance: attendanceRouter,
  medical: medicalRouter,
  patient: patientRouter,
  stockroom: stockroomRouter,
  salary: salaryRouter,
  ...(patientPortalRouter ? { patientPortal: patientPortalRouter } : {}),
});

export type AppRouter = typeof appRouter;
