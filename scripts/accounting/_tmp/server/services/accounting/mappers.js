"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDashboardSummaryRow = mapDashboardSummaryRow;
exports.mapReceiptHeader = mapReceiptHeader;
exports.mapServiceRow = mapServiceRow;
exports.mapReceiptHeaders = mapReceiptHeaders;
exports.mapReceiptDetailRows = mapReceiptDetailRows;
exports.mapServiceRows = mapServiceRows;
exports.mapDailyRevenueRows = mapDailyRevenueRows;
exports.mapServiceRevenueRows = mapServiceRevenueRows;
exports.mapLasikRevenueSummaryRow = mapLasikRevenueSummaryRow;
exports.mapPatientLasikSummaryRows = mapPatientLasikSummaryRows;
function numberValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "bigint") {
        return Number(value);
    }
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
function stringValue(value, fallback = "") {
    if (value === null || value === undefined) {
        return fallback;
    }
    return String(value).trim();
}
function optionalString(value) {
    const text = stringValue(value);
    return text ? text : null;
}
function isoDateValue(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }
    const text = stringValue(value);
    if (!text) {
        return new Date(0).toISOString();
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.valueOf()) ? text : parsed.toISOString();
}
function isoDateOnlyValue(value) {
    const iso = isoDateValue(value);
    return iso.length >= 10 ? iso.slice(0, 10) : iso;
}
function receiptKey(row) {
    return [
        stringValue(row.sectionCode),
        stringValue(row.trTy),
        stringValue(row.trNo),
    ].join(":");
}
function mapDashboardSummaryRow(row) {
    return {
        totalReceiptsToday: numberValue(row?.totalReceiptsToday),
        totalRevenueToday: numberValue(row?.totalRevenueToday),
        totalReceiptsThisMonth: numberValue(row?.totalReceiptsThisMonth),
        totalRevenueThisMonth: numberValue(row?.totalRevenueThisMonth),
    };
}
function mapReceiptHeader(row, patientCodeFallback) {
    return {
        sectionCode: numberValue(row.sectionCode ?? row.secCd),
        trTy: numberValue(row.trTy),
        trNo: stringValue(row.trNo),
        transactionDate: isoDateValue(row.transactionDate ?? row.trDate),
        patientCode: stringValue(row.patientCode, patientCodeFallback),
        patientName: optionalString(row.patientName),
        total: numberValue(row.total ?? row.totalValue ?? row.receiptTotal),
        discount: numberValue(row.discount ?? row.discountValue ?? row.receiptDiscount),
        paidValue: numberValue(row.paidValue ?? row.receiptPaid),
        enteredBy: optionalString(row.enteredBy),
    };
}
function mapServiceRow(row, patientCodeFallback) {
    const doctorCode = optionalString(row.doctorCode ?? row.serviceBy1);
    return {
        sectionCode: numberValue(row.sectionCode ?? row.secCd),
        trTy: row.trTy === undefined || row.trTy === null ? null : numberValue(row.trTy),
        trNo: stringValue(row.trNo),
        patientCode: stringValue(row.patientCode, patientCodeFallback),
        visitNo: optionalString(row.visitNo),
        serviceCode: stringValue(row.serviceCode),
        serviceName: optionalString(row.serviceName),
        price: numberValue(row.price),
        discountValue: numberValue(row.discountValue ?? row.lineDiscount),
        paidValue: numberValue(row.paidValue ?? row.linePaid),
        entryDate: isoDateValue(row.entryDate ?? row.receiptDate ?? row.trDate),
        serviceBy1: doctorCode,
        currentServiceBy: optionalString(row.currentServiceBy ?? row.currentDoctorCode),
        doctorCode,
        doctorName: optionalString(row.doctorName),
    };
}
function mapReceiptHeaders(rows) {
    return rows.map((row) => mapReceiptHeader(row));
}
function mapReceiptDetailRows(rows) {
    const first = rows[0];
    return {
        header: first
            ? mapReceiptHeader(first)
            : {
                sectionCode: 0,
                trTy: 0,
                trNo: "",
                transactionDate: new Date(0).toISOString(),
                patientCode: "",
                patientName: null,
                total: 0,
                discount: 0,
                paidValue: 0,
                enteredBy: null,
            },
        lines: rows.map((row) => mapServiceRow(row)),
    };
}
function mapServiceRows(rows) {
    return rows.map((row) => mapServiceRow(row));
}
function mapDailyRevenueRows(rows) {
    const mappedRows = rows.map((row) => ({
        date: isoDateOnlyValue(row.date ?? row.trDate),
        totalReceipts: numberValue(row.totalReceipts),
        totalGross: numberValue(row.totalGross),
        totalDiscount: numberValue(row.totalDiscount),
        totalCash: numberValue(row.totalCash),
        totalPaid: numberValue(row.totalPaid),
        netAfterDiscount: numberValue(row.netAfterDiscount),
    }));
    const totals = mappedRows.reduce((acc, row) => ({
        totalReceipts: acc.totalReceipts + row.totalReceipts,
        totalGross: acc.totalGross + row.totalGross,
        totalDiscount: acc.totalDiscount + row.totalDiscount,
        totalCash: acc.totalCash + row.totalCash,
        totalPaid: acc.totalPaid + row.totalPaid,
        netAfterDiscount: acc.netAfterDiscount + row.netAfterDiscount,
    }), {
        totalReceipts: 0,
        totalGross: 0,
        totalDiscount: 0,
        totalCash: 0,
        totalPaid: 0,
        netAfterDiscount: 0,
    });
    return { rows: mappedRows, totals };
}
function mapServiceRevenueRows(rows) {
    const doctors = new Map();
    for (const row of rows) {
        const doctorCode = stringValue(row.doctorCode);
        const service = {
            serviceCode: stringValue(row.serviceCode),
            serviceName: optionalString(row.serviceName),
            rowCount: numberValue(row.rowCount),
            totalGross: numberValue(row.totalGross),
            totalPaid: numberValue(row.totalPaid),
            totalDiscount: numberValue(row.totalDiscount),
        };
        const doctor = doctors.get(doctorCode) ??
            {
                doctorCode,
                doctorName: optionalString(row.doctorName),
                services: [],
                subtotal: {
                    rowCount: 0,
                    totalGross: 0,
                    totalDiscount: 0,
                    totalPaid: 0,
                },
            };
        doctor.services.push(service);
        doctor.subtotal.rowCount += service.rowCount;
        doctor.subtotal.totalGross += service.totalGross;
        doctor.subtotal.totalDiscount += service.totalDiscount;
        doctor.subtotal.totalPaid += service.totalPaid;
        doctors.set(doctorCode, doctor);
    }
    const groupedDoctors = Array.from(doctors.values());
    const grandTotal = groupedDoctors.reduce((acc, doctor) => ({
        rowCount: acc.rowCount + doctor.subtotal.rowCount,
        totalGross: acc.totalGross + doctor.subtotal.totalGross,
        totalDiscount: acc.totalDiscount + doctor.subtotal.totalDiscount,
        totalPaid: acc.totalPaid + doctor.subtotal.totalPaid,
    }), {
        rowCount: 0,
        totalGross: 0,
        totalDiscount: 0,
        totalPaid: 0,
    });
    return { doctors: groupedDoctors, grandTotal };
}
function mapLasikRevenueSummaryRow(row, input) {
    const totalGross = numberValue(row?.totalGross);
    const totalDiscount = numberValue(row?.totalDiscount);
    return {
        sectionCode: 15,
        fromDate: input.fromDate,
        toDate: input.toDate,
        doctorCode: input.doctorCode ?? null,
        totalServices: numberValue(row?.rowCount),
        totalGross,
        totalDiscount,
        totalPaid: numberValue(row?.totalPaid),
        netAfterDiscount: totalGross - totalDiscount,
    };
}
function mapPatientLasikSummaryRows(rows, patientCode) {
    const receiptMap = new Map();
    const services = rows.map((row) => mapServiceRow(row, patientCode));
    for (const row of rows) {
        const keyedRow = {
            ...row,
            patientCode: row.patientCode ?? patientCode,
        };
        receiptMap.set(receiptKey(keyedRow), mapReceiptHeader(keyedRow, patientCode));
    }
    const receipts = Array.from(receiptMap.values());
    const totalGross = rows.reduce((sum, row) => sum + numberValue(row.lineGross), 0);
    const totalDiscount = services.reduce((sum, row) => sum + row.discountValue, 0);
    const totalPaid = services.reduce((sum, row) => sum + row.paidValue, 0);
    const lastTransactionDate = receipts[0]?.transactionDate ?? null;
    return {
        patientCode,
        patientName: receipts[0]?.patientName ?? null,
        hasMedicalLink: undefined,
        receipts,
        services,
        totals: {
            totalReceipts: receipts.length,
            totalServices: services.length,
            totalGross,
            totalDiscount,
            totalPaid,
            lastTransactionDate,
        },
    };
}
