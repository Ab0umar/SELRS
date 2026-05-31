import { router } from "../_core/procedures";
import { accountingRouter } from "./accounting";
import { attendanceRouter } from "./attendance";
import { medicalRouter } from "./medical";
import { patientRouter } from "./patient";
import { stockroomRouter } from "./stockroom";
import { salaryRouter } from "./salary";

console.log("[DEBUG] about to import patientPortal");
// eslint-disable-next-line @typescript-eslint/no-require-imports
let patientPortalRouter: any;
try {
  patientPortalRouter = require("./patientPortal").patientPortalRouter;
  console.log("[DEBUG] patientPortal loaded, procedures:", Object.keys(patientPortalRouter._def.procedures));
} catch (e: any) {
  console.error("[DEBUG] patientPortal FAILED TO LOAD:", e?.message ?? String(e));
  console.error(e?.stack ?? "");
}

/**
 * AppRouter - Main TRPC router combining all sub-routers
 */
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
