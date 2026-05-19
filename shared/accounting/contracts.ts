import { z } from "zod";

const isoDateStringSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  z.string().datetime(),
]);

const codeStringSchema = z.string();
const moneySchema = z.number();
const countSchema = z.number().int().nonnegative();

/** Query filters: MSSQL PAT_CD — strings only (ASCII trim only; keeps leading zeros). Rejects numeric JSON to avoid silent truncation. */
const accountingPatientCodeOptionalSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== "string") return undefined;
  const t = val.trim();
  return t === "" ? undefined : t;
}, z.string().min(1)).optional();

export const receiptHeaderSchema = z.object({
  sectionCode: z.number().int(),
  trTy: z.number().int(),
  trNo: codeStringSchema,
  transactionDate: isoDateStringSchema,
  patientCode: codeStringSchema,
  patientName: z.string().nullable().optional(),
  total: moneySchema,
  discount: moneySchema,
  paidValue: moneySchema,
  enteredBy: z.string().nullable().optional(),
});

export type ReceiptHeader = z.infer<typeof receiptHeaderSchema>;

export const serviceRowSchema = z.object({
  sectionCode: z.number().int(),
  trTy: z.number().int().nullable().optional(),
  trNo: codeStringSchema,
  patientCode: codeStringSchema,
  patientName: z.string().nullable().optional(),
  visitNo: codeStringSchema.nullable().optional(),
  serviceCode: codeStringSchema,
  serviceName: z.string().nullable().optional(),
  quantity: countSchema,
  price: moneySchema,
  discountValue: moneySchema,
  paidValue: moneySchema,
  companyValue: moneySchema,
  entryDate: isoDateStringSchema,
  serviceBy1: codeStringSchema.nullable().optional(),
  currentServiceBy: codeStringSchema.nullable().optional(),
  doctorCode: codeStringSchema.nullable().optional(),
  doctorName: z.string().nullable().optional(),
});

export type ServiceRow = z.infer<typeof serviceRowSchema>;

export const moneyTotalsSchema = z.object({
  totalGross: moneySchema,
  totalDiscount: moneySchema,
  totalPaid: moneySchema,
});

export type MoneyTotals = z.infer<typeof moneyTotalsSchema>;

export const dashboardSummaryInputSchema = z.object({
  sectionCode: z.number().int().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const dashboardSummaryOutputSchema = z.object({
  totalReceiptsToday: countSchema,
  totalRevenueToday: moneySchema,
  totalReceiptsThisMonth: countSchema,
  totalRevenueThisMonth: moneySchema,
});

export type DashboardSummaryInput = z.infer<typeof dashboardSummaryInputSchema>;
export type DashboardSummaryOutput = z.infer<typeof dashboardSummaryOutputSchema>;

export const dailyRevenueInputSchema = z.object({
  fromDate: isoDateStringSchema,
  toDate: isoDateStringSchema,
  sectionCode: z.number().int().optional(),
  doctorCode: codeStringSchema.optional(),
  shiftCode: codeStringSchema.optional(),
});

export const dailyRevenueRowSchema = z.object({
  date: isoDateStringSchema,
  totalReceipts: countSchema,
  totalGross: moneySchema,
  totalDiscount: moneySchema,
  totalCash: moneySchema,
  totalPaid: moneySchema,
  netAfterDiscount: moneySchema,
});

export const dailyRevenueOutputSchema = z.object({
  rows: z.array(dailyRevenueRowSchema),
  totals: dailyRevenueRowSchema.omit({ date: true }),
});

export type DailyRevenueInput = z.infer<typeof dailyRevenueInputSchema>;
export type DailyRevenueRow = z.infer<typeof dailyRevenueRowSchema>;
export type DailyRevenueOutput = z.infer<typeof dailyRevenueOutputSchema>;

export const serviceRevenueInputSchema = z.object({
  fromDate: isoDateStringSchema,
  toDate: isoDateStringSchema,
  sectionCode: z.number().int().optional(),
  doctorCode: codeStringSchema.optional(),
  serviceCode: codeStringSchema.optional(),
});

export const serviceRevenueDetailSchema = z.object({
  trNo: codeStringSchema,
  trDate: isoDateStringSchema,
  patientCode: codeStringSchema,
  patientName: z.string().nullable().optional(),
  quantity: countSchema,
  price: moneySchema,
  patientShare: moneySchema,
  discount: moneySchema,
  patientTotal: moneySchema,
  companyTotal: moneySchema,
});

export const serviceRevenueServiceSchema = z.object({
  serviceCode: codeStringSchema,
  serviceName: z.string().nullable().optional(),
  rowCount: countSchema,
  totalGross: moneySchema,
  totalPaid: moneySchema,
  totalDiscount: moneySchema,
  details: z.array(serviceRevenueDetailSchema).optional(),
});

export const serviceRevenueSectionSchema = z.object({
  sectionCode: z.number().int(),
  sectionName: z.string().nullable().optional(),
  services: z.array(serviceRevenueServiceSchema),
  subtotal: moneyTotalsSchema.extend({
    rowCount: countSchema,
  }),
});

export const serviceRevenueOutputSchema = z.object({
  sections: z.array(serviceRevenueSectionSchema),
  grandTotal: moneyTotalsSchema.extend({
    rowCount: countSchema,
  }),
});

export type ServiceRevenueInput = z.infer<typeof serviceRevenueInputSchema>;
export type ServiceRevenueDetail = z.infer<typeof serviceRevenueDetailSchema>;
export type ServiceRevenueService = z.infer<typeof serviceRevenueServiceSchema>;
export type ServiceRevenueSection = z.infer<typeof serviceRevenueSectionSchema>;
export type ServiceRevenueOutput = z.infer<typeof serviceRevenueOutputSchema>;

export const receiptsInquiryInputSchema = z.object({
  fromDate: isoDateStringSchema.optional(),
  toDate: isoDateStringSchema.optional(),
  patientCode: accountingPatientCodeOptionalSchema,
  doctorCode: codeStringSchema.optional(),
  sectionCode: z.number().int().optional(),
  trNo: codeStringSchema.optional(),
  trTy: z.number().int().optional(),
  limit: z.number().int().positive().optional(),
});

export const receiptsInquiryOutputSchema = z.array(receiptHeaderSchema);

export type ReceiptsInquiryInput = z.infer<typeof receiptsInquiryInputSchema>;
export type ReceiptsInquiryOutput = z.infer<typeof receiptsInquiryOutputSchema>;

export const receiptDetailInputSchema = z.object({
  sectionCode: z.number().int(),
  trTy: z.number().int(),
  trNo: codeStringSchema,
});

export const receiptDetailOutputSchema = z.object({
  header: receiptHeaderSchema,
  lines: z.array(serviceRowSchema),
});

export type ReceiptDetailInput = z.infer<typeof receiptDetailInputSchema>;
export type ReceiptDetailOutput = z.infer<typeof receiptDetailOutputSchema>;

export const lasikReceiptsInputSchema = receiptsInquiryInputSchema.omit({
  sectionCode: true,
});

export const lasikReceiptsOutputSchema = receiptsInquiryOutputSchema;

export type LasikReceiptsInput = z.infer<typeof lasikReceiptsInputSchema>;
export type LasikReceiptsOutput = z.infer<typeof lasikReceiptsOutputSchema>;

export const lasikServicesInputSchema = z.object({
  fromDate: isoDateStringSchema.optional(),
  toDate: isoDateStringSchema.optional(),
  patientCode: accountingPatientCodeOptionalSchema,
  serviceCode: codeStringSchema.optional(),
  doctorCode: codeStringSchema.optional(),
  limit: z.number().int().positive().optional(),
});

export const lasikServicesOutputSchema = z.array(serviceRowSchema);

export type LasikServicesInput = z.infer<typeof lasikServicesInputSchema>;
export type LasikServicesOutput = z.infer<typeof lasikServicesOutputSchema>;

export const lasikRevenueSummaryInputSchema = z.object({
  fromDate: isoDateStringSchema.optional(),
  toDate: isoDateStringSchema.optional(),
  doctorCode: codeStringSchema.optional(),
});

export const lasikRevenueSummaryOutputSchema = z.object({
  sectionCode: z.literal(15),
  fromDate: isoDateStringSchema.optional(),
  toDate: isoDateStringSchema.optional(),
  doctorCode: codeStringSchema.nullable().optional(),
  totalServices: countSchema,
  totalGross: moneySchema,
  totalDiscount: moneySchema,
  totalPaid: moneySchema,
  netAfterDiscount: moneySchema,
});

export type LasikRevenueSummaryInput = z.infer<typeof lasikRevenueSummaryInputSchema>;
export type LasikRevenueSummaryOutput = z.infer<typeof lasikRevenueSummaryOutputSchema>;

export const patientLasikSummaryInputSchema = z.object({
  patientCode: accountingPatientCodeOptionalSchema,
  patientName: z.string().optional(),
  fromDate: isoDateStringSchema.optional(),
  toDate: isoDateStringSchema.optional(),
  sectionCode: z.number().int().optional(),
});

export const patientLasikSummaryTotalsSchema = z.object({
  totalReceipts: countSchema,
  totalServices: countSchema,
  totalGross: moneySchema,
  totalDiscount: moneySchema,
  totalPaid: moneySchema,
  totalPatientAmount: moneySchema,
  totalCompanyAmount: moneySchema,
  lastTransactionDate: isoDateStringSchema.nullable(),
});

export const patientLasikSummaryOutputSchema = z.object({
  patientCode: codeStringSchema,
  patientName: z.string().nullable().optional(),
  hasMedicalLink: z.boolean().optional(),
  receipts: z.array(receiptHeaderSchema),
  services: z.array(serviceRowSchema),
  totals: patientLasikSummaryTotalsSchema,
});

export type PatientLasikSummaryInput = z.infer<typeof patientLasikSummaryInputSchema>;
export type PatientLasikSummaryTotals = z.infer<typeof patientLasikSummaryTotalsSchema>;
export type PatientLasikSummaryOutput = z.infer<typeof patientLasikSummaryOutputSchema>;

export const extendedDashboardSummaryOutputSchema = dashboardSummaryOutputSchema;

export type ExtendedDashboardSummaryOutput = z.infer<typeof extendedDashboardSummaryOutputSchema>;

export const transactionsInputSchema = z.object({
  sectionCode: z.number().int().optional(),
  limit: z.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type TransactionsInput = z.infer<typeof transactionsInputSchema>;

export const transactionsOutputSchema = z.array(receiptHeaderSchema);

export type TransactionsOutput = z.infer<typeof transactionsOutputSchema>;
