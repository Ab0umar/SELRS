import { router } from "../_core/procedures";
import { accountingRouter } from "./accounting";
import { attendanceRouter } from "./attendance";
import { medicalRouter } from "./medical";
import { patientRouter } from "./patient";
import { stockroomRouter } from "./stockroom";
import { salaryRouter } from "./salary";
import { patientPortalRouter } from "./patientPortal";

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
  patientPortal: patientPortalRouter,
});

export type AppRouter = typeof appRouter;

console.log("[DEBUG] appRouter procedures:", Object.keys(appRouter._def.procedures));
