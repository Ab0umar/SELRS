import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  dailyRevenueInputSchema,
  dailyRevenueOutputSchema,
  dashboardSummaryInputSchema,
  dashboardSummaryOutputSchema,
  lasikReceiptsInputSchema,
  lasikReceiptsOutputSchema,
  lasikRevenueSummaryInputSchema,
  lasikRevenueSummaryOutputSchema,
  lasikServicesInputSchema,
  lasikServicesOutputSchema,
  patientLasikSummaryInputSchema,
  patientLasikSummaryOutputSchema,
  receiptDetailInputSchema,
  receiptDetailOutputSchema,
  receiptsInquiryInputSchema,
  receiptsInquiryOutputSchema,
  serviceRevenueInputSchema,
  serviceRevenueOutputSchema,
} from "../../shared/accounting/contracts";
import { managerProcedure, router } from "../_core/procedures";
import { getDailyRevenue } from "../services/accounting/dailyRevenue.service";
import { getDashboardSummary } from "../services/accounting/dashboardSummary.service";
import {
  getLasikRevenueSummary,
  getServiceRevenue,
} from "../services/accounting/lasikRevenue.service";
import { getLasikReceipts } from "../services/accounting/lasikReceipts.service";
import { getLasikServices } from "../services/accounting/lasikServices.service";
import { getPatientLasikSummary } from "../services/accounting/lasikPatientAccounting.service";
import {
  getReceiptDetail,
  getReceiptsInquiry,
} from "../services/accounting/receiptsInquiry.service";
import { mssqlQuery } from "../services/accounting/mssqlAccounting";

async function accountingQuery<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[accounting:${operation}]`, error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to load accounting data",
    });
  }
}

export const accountingRouter = router({
  dashboardSummary: managerProcedure
    .input(dashboardSummaryInputSchema)
    .output(dashboardSummaryOutputSchema)
    .query(({ input }) =>
      accountingQuery("dashboardSummary", () => getDashboardSummary(input)),
    ),

  dailyRevenue: managerProcedure
    .input(dailyRevenueInputSchema)
    .output(dailyRevenueOutputSchema)
    .query(({ input }) =>
      accountingQuery("dailyRevenue", () => getDailyRevenue(input)),
    ),

  serviceRevenue: managerProcedure
    .input(serviceRevenueInputSchema)
    .output(serviceRevenueOutputSchema)
    .query(({ input }) =>
      accountingQuery("serviceRevenue", () => getServiceRevenue(input)),
    ),

  receiptsInquiry: managerProcedure
    .input(receiptsInquiryInputSchema)
    .output(receiptsInquiryOutputSchema)
    .query(({ input }) =>
      accountingQuery("receiptsInquiry", () => getReceiptsInquiry(input)),
    ),

  receiptDetail: managerProcedure
    .input(receiptDetailInputSchema)
    .output(receiptDetailOutputSchema)
    .query(({ input }) =>
      accountingQuery("receiptDetail", () => getReceiptDetail(input)),
    ),

  lasikReceipts: managerProcedure
    .input(lasikReceiptsInputSchema)
    .output(lasikReceiptsOutputSchema)
    .query(({ input }) =>
      accountingQuery("lasikReceipts", () => getLasikReceipts(input)),
    ),

  lasikServices: managerProcedure
    .input(lasikServicesInputSchema)
    .output(lasikServicesOutputSchema)
    .query(({ input }) =>
      accountingQuery("lasikServices", () => getLasikServices(input)),
    ),

  lasikRevenueSummary: managerProcedure
    .input(lasikRevenueSummaryInputSchema)
    .output(lasikRevenueSummaryOutputSchema)
    .query(({ input }) =>
      accountingQuery("lasikRevenueSummary", () => getLasikRevenueSummary(input)),
    ),

  patientLasikSummary: managerProcedure
    .input(patientLasikSummaryInputSchema)
    .output(patientLasikSummaryOutputSchema)
    .query(({ input }) =>
      accountingQuery("patientLasikSummary", () => getPatientLasikSummary(input)),
    ),

  patientLookup: managerProcedure
    .input(z.object({ patientCode: z.string() }))
    .query(async ({ input }) => {
      const rows = await mssqlQuery<{ PAT_CD: string; NAM: string }>(
        "SELECT TOP 1 PAT_CD, NAM FROM PAPATMF WHERE PAT_CD = @code",
        { code: input.patientCode }
      );
      return rows[0] ? { patientCode: rows[0].PAT_CD, patientName: rows[0].NAM } : null;
    }),

  doctorLookup: managerProcedure
    .input(z.object({ doctorCode: z.string() }))
    .query(async ({ input }) => {
      const rows = await mssqlQuery<{ CODE: string; PHNM_AR: string }>(
        "SELECT TOP 1 CODE, PHNM_AR FROM MDTEAM WHERE CODE = @code",
        { code: input.doctorCode }
      );
      return rows[0] ? { doctorCode: rows[0].CODE, doctorName: rows[0].PHNM_AR } : null;
    }),

  serviceLookup: managerProcedure
    .input(z.object({ serviceCode: z.string(), sectionCode: z.number().optional() }))
    .query(async ({ input }) => {
      const rows = await mssqlQuery<{ SRV_CD: string; SRV_NM_AR: string }>(
        "SELECT TOP 1 SRV_CD, SRV_NM_AR FROM SRVCMF WHERE SRV_CD = @code",
        { code: input.serviceCode }
      );
      return rows[0] ? { serviceCode: rows[0].SRV_CD, serviceName: rows[0].SRV_NM_AR } : null;
    }),
});

export type AccountingRouter = typeof accountingRouter;
