import { router } from "../_core/procedures";
import { accountingRouter } from "./accounting";
import { attendanceRouter } from "./attendance";
import { kfRouter } from "./kf";
import { medicalRouter } from "./medical";
import { patientRouter } from "./patient";
import { stockroomRouter } from "./stockroom";
import { salaryRouter } from "./salary";
import { patientPortalRouter } from "./patientPortal";
import { marketingRouter } from "./marketing";

export const appRouter = router({
  patientPortal: patientPortalRouter,
  accounting: accountingRouter,
  attendance: attendanceRouter,
  kf: kfRouter,
  medical: medicalRouter,
  patient: patientRouter,
  stockroom: stockroomRouter,
  salary: salaryRouter,
  marketing: marketingRouter,
});

export type AppRouter = typeof appRouter;
