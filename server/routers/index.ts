import { router } from "../_core/procedures";
import { accountingRouter } from "./accounting";
import { attendanceRouter } from "./attendance";
import { medicalRouter } from "./medical";
import { patientRouter } from "./patient";
import { stockroomRouter } from "./stockroom";

console.log('[routers] All imports completed');
console.log('[routers] accountingRouter:', !!accountingRouter);
console.log('[routers] attendanceRouter:', !!attendanceRouter);
console.log('[routers] medicalRouter:', !!medicalRouter);

/**
 * AppRouter - Main TRPC router combining all sub-routers
 */
export const appRouter = router({
  accounting: accountingRouter,
  attendance: attendanceRouter,
  medical: medicalRouter,
  patient: patientRouter,
  stockroom: stockroomRouter,
});

// Debug: Log router contents
console.log('[routers] appRouter created with keys:', Object.keys(appRouter._def.routes || {}));

export type AppRouter = typeof appRouter;
