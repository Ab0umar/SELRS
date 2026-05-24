import { router } from "../_core/procedures";
import { accountingRouter } from "./accounting";
import { attendanceRouter } from "./attendance";
import { medicalRouter } from "./medical";
import { patientRouter } from "./patient";
import { stockroomRouter } from "./stockroom";
import { salaryRouter } from "./salary";
import { shiftStaffRouter } from "./shiftStaff";

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
  shiftStaff: shiftStaffRouter,
});

export type AppRouter = typeof appRouter;
