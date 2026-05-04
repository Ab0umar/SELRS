import { router } from "../_core/procedures";
import { accountingRouter } from "./accounting";
import { medicalRouter } from "./medical";
import { patientRouter } from "./patient";

/**
 * AppRouter - Main TRPC router combining all sub-routers
 */
export const appRouter = router({
  accounting: accountingRouter,
  medical: medicalRouter,
  patient: patientRouter,
});

export type AppRouter = typeof appRouter;
