"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientLasikSummaryOutputSchema = exports.patientLasikSummaryTotalsSchema = exports.patientLasikSummaryInputSchema = exports.lasikRevenueSummaryOutputSchema = exports.lasikRevenueSummaryInputSchema = exports.lasikServicesOutputSchema = exports.lasikServicesInputSchema = exports.lasikReceiptsOutputSchema = exports.lasikReceiptsInputSchema = exports.receiptDetailOutputSchema = exports.receiptDetailInputSchema = exports.receiptsInquiryOutputSchema = exports.receiptsInquiryInputSchema = exports.serviceRevenueOutputSchema = exports.serviceRevenueDoctorSchema = exports.serviceRevenueServiceSchema = exports.serviceRevenueInputSchema = exports.dailyRevenueOutputSchema = exports.dailyRevenueRowSchema = exports.dailyRevenueInputSchema = exports.dashboardSummaryOutputSchema = exports.dashboardSummaryInputSchema = exports.moneyTotalsSchema = exports.serviceRowSchema = exports.receiptHeaderSchema = void 0;
const zod_1 = require("zod");
const isoDateStringSchema = zod_1.z.union([
    zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    zod_1.z.string().datetime(),
]);
const codeStringSchema = zod_1.z.string().min(1);
const moneySchema = zod_1.z.number();
const countSchema = zod_1.z.number().int().nonnegative();
exports.receiptHeaderSchema = zod_1.z.object({
    sectionCode: zod_1.z.number().int(),
    trTy: zod_1.z.number().int(),
    trNo: codeStringSchema,
    transactionDate: isoDateStringSchema,
    patientCode: codeStringSchema,
    patientName: zod_1.z.string().nullable().optional(),
    total: moneySchema,
    discount: moneySchema,
    paidValue: moneySchema,
    enteredBy: zod_1.z.string().nullable().optional(),
});
exports.serviceRowSchema = zod_1.z.object({
    sectionCode: zod_1.z.number().int(),
    trTy: zod_1.z.number().int().nullable().optional(),
    trNo: codeStringSchema,
    patientCode: codeStringSchema,
    visitNo: codeStringSchema.nullable().optional(),
    serviceCode: codeStringSchema,
    serviceName: zod_1.z.string().nullable().optional(),
    price: moneySchema,
    discountValue: moneySchema,
    paidValue: moneySchema,
    entryDate: isoDateStringSchema,
    serviceBy1: codeStringSchema.nullable().optional(),
    currentServiceBy: codeStringSchema.nullable().optional(),
    doctorCode: codeStringSchema.nullable().optional(),
    doctorName: zod_1.z.string().nullable().optional(),
});
exports.moneyTotalsSchema = zod_1.z.object({
    totalGross: moneySchema,
    totalDiscount: moneySchema,
    totalPaid: moneySchema,
});
exports.dashboardSummaryInputSchema = zod_1.z.object({
    sectionCode: zod_1.z.number().int().optional(),
});
exports.dashboardSummaryOutputSchema = zod_1.z.object({
    totalReceiptsToday: countSchema,
    totalRevenueToday: moneySchema,
    totalReceiptsThisMonth: countSchema,
    totalRevenueThisMonth: moneySchema,
});
exports.dailyRevenueInputSchema = zod_1.z.object({
    fromDate: isoDateStringSchema,
    toDate: isoDateStringSchema,
    sectionCode: zod_1.z.number().int().optional(),
    doctorCode: codeStringSchema.optional(),
});
exports.dailyRevenueRowSchema = zod_1.z.object({
    date: isoDateStringSchema,
    totalReceipts: countSchema,
    totalGross: moneySchema,
    totalDiscount: moneySchema,
    totalCash: moneySchema,
    totalPaid: moneySchema,
    netAfterDiscount: moneySchema,
});
exports.dailyRevenueOutputSchema = zod_1.z.object({
    rows: zod_1.z.array(exports.dailyRevenueRowSchema),
    totals: exports.dailyRevenueRowSchema.omit({ date: true }),
});
exports.serviceRevenueInputSchema = zod_1.z.object({
    fromDate: isoDateStringSchema,
    toDate: isoDateStringSchema,
    sectionCode: zod_1.z.number().int().optional(),
    doctorCode: codeStringSchema.optional(),
    serviceCode: codeStringSchema.optional(),
});
exports.serviceRevenueServiceSchema = zod_1.z.object({
    serviceCode: codeStringSchema,
    serviceName: zod_1.z.string().nullable().optional(),
    rowCount: countSchema,
    totalGross: moneySchema,
    totalPaid: moneySchema,
    totalDiscount: moneySchema,
});
exports.serviceRevenueDoctorSchema = zod_1.z.object({
    doctorCode: codeStringSchema,
    doctorName: zod_1.z.string().nullable().optional(),
    services: zod_1.z.array(exports.serviceRevenueServiceSchema),
    subtotal: exports.moneyTotalsSchema.extend({
        rowCount: countSchema,
    }),
});
exports.serviceRevenueOutputSchema = zod_1.z.object({
    doctors: zod_1.z.array(exports.serviceRevenueDoctorSchema),
    grandTotal: exports.moneyTotalsSchema.extend({
        rowCount: countSchema,
    }),
});
exports.receiptsInquiryInputSchema = zod_1.z.object({
    fromDate: isoDateStringSchema.optional(),
    toDate: isoDateStringSchema.optional(),
    patientCode: codeStringSchema.optional(),
    doctorCode: codeStringSchema.optional(),
    sectionCode: zod_1.z.number().int().optional(),
    trNo: codeStringSchema.optional(),
    trTy: zod_1.z.number().int().optional(),
    limit: zod_1.z.number().int().positive().optional(),
});
exports.receiptsInquiryOutputSchema = zod_1.z.array(exports.receiptHeaderSchema);
exports.receiptDetailInputSchema = zod_1.z.object({
    sectionCode: zod_1.z.number().int(),
    trTy: zod_1.z.number().int(),
    trNo: codeStringSchema,
});
exports.receiptDetailOutputSchema = zod_1.z.object({
    header: exports.receiptHeaderSchema,
    lines: zod_1.z.array(exports.serviceRowSchema),
});
exports.lasikReceiptsInputSchema = exports.receiptsInquiryInputSchema.omit({
    sectionCode: true,
});
exports.lasikReceiptsOutputSchema = exports.receiptsInquiryOutputSchema;
exports.lasikServicesInputSchema = zod_1.z.object({
    fromDate: isoDateStringSchema.optional(),
    toDate: isoDateStringSchema.optional(),
    patientCode: codeStringSchema.optional(),
    serviceCode: codeStringSchema.optional(),
    doctorCode: codeStringSchema.optional(),
    limit: zod_1.z.number().int().positive().optional(),
});
exports.lasikServicesOutputSchema = zod_1.z.array(exports.serviceRowSchema);
exports.lasikRevenueSummaryInputSchema = zod_1.z.object({
    fromDate: isoDateStringSchema.optional(),
    toDate: isoDateStringSchema.optional(),
    doctorCode: codeStringSchema.optional(),
});
exports.lasikRevenueSummaryOutputSchema = zod_1.z.object({
    sectionCode: zod_1.z.literal(15),
    fromDate: isoDateStringSchema.optional(),
    toDate: isoDateStringSchema.optional(),
    doctorCode: codeStringSchema.nullable().optional(),
    totalServices: countSchema,
    totalGross: moneySchema,
    totalDiscount: moneySchema,
    totalPaid: moneySchema,
    netAfterDiscount: moneySchema,
});
exports.patientLasikSummaryInputSchema = zod_1.z.object({
    patientCode: codeStringSchema,
});
exports.patientLasikSummaryTotalsSchema = zod_1.z.object({
    totalReceipts: countSchema,
    totalServices: countSchema,
    totalGross: moneySchema,
    totalDiscount: moneySchema,
    totalPaid: moneySchema,
    lastTransactionDate: isoDateStringSchema.nullable(),
});
exports.patientLasikSummaryOutputSchema = zod_1.z.object({
    patientCode: codeStringSchema,
    patientName: zod_1.z.string().nullable().optional(),
    hasMedicalLink: zod_1.z.boolean().optional(),
    receipts: zod_1.z.array(exports.receiptHeaderSchema),
    services: zod_1.z.array(exports.serviceRowSchema),
    totals: exports.patientLasikSummaryTotalsSchema,
});
