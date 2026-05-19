import { router } from "../_core/procedures";
import { accountingRouter } from "./accounting";
import { medicalRouter } from "./medical";
import { patientRouter } from "./patient";
import { stockroomRouter } from "./stockroom";

/**
 * AppRouter - Main TRPC router combining all sub-routers
 */
export const appRouter = router({
  accounting: accountingRouter,
  medical: medicalRouter,
  patient: patientRouter,
  stockroom: stockroomRouter,
});

export type AppRouter = typeof appRouter;
