import type {
  DashboardSummaryOutput,
  DailyRevenueOutput,
  DailyRevenueRow,
  LasikRevenueSummaryInput,
  LasikRevenueSummaryOutput,
  PatientLasikSummaryOutput,
  ReceiptDetailOutput,
  ReceiptHeader,
  ServiceRevenueDetail,
  ServiceRevenueOutput,
  ServiceRevenueSection,
  ServiceRevenueService,
  ServiceRow,
} from "../../../shared/accounting/contracts";

type Row = Record<string, unknown>;

function numberValue(value: unknown): number {
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

function stringValue(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim();
}

/** PAT_CD / patient codes: preserve textual form from MSSQL (leading zeros); avoid numeric coercion on output values. */
function patientCodeFromRow(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return String(value).trim();
}

function optionalString(value: unknown): string | null {
  const text = stringValue(value);
  return text ? text : null;
}

function isoDateValue(value: unknown): string {
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

function isoDateOnlyValue(value: unknown): string {
  const iso = isoDateValue(value);
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

function receiptKey(row: Row): string {
  return [
    stringValue(row.sectionCode),
    stringValue(row.trTy),
    stringValue(row.trNo),
  ].join(":");
}

export function mapDashboardSummaryRow(row: Row | undefined): DashboardSummaryOutput {
  return {
    totalReceiptsToday: numberValue(row?.totalReceiptsToday),
    totalRevenueToday: numberValue(row?.totalRevenueToday),
    totalReceiptsThisMonth: numberValue(row?.totalReceiptsThisMonth),
    totalRevenueThisMonth: numberValue(row?.totalRevenueThisMonth),
  };
}

export function mapReceiptHeader(row: Row, patientCodeFallback?: string): ReceiptHeader {
  return {
    sectionCode: numberValue(row.sectionCode ?? row.secCd),
    trTy: numberValue(row.trTy),
    trNo: stringValue(row.trNo),
    transactionDate: isoDateValue(row.transactionDate ?? row.trDate),
    patientCode: patientCodeFromRow(row.patientCode, patientCodeFallback),
    patientName: optionalString(row.patientName),
    total: numberValue(row.total ?? row.totalValue ?? row.receiptTotal),
    discount: numberValue(row.discount ?? row.discountValue ?? row.receiptDiscount),
    paidValue: numberValue(row.paidValue ?? row.receiptPaid),
    enteredBy: optionalString(row.enteredBy),
  };
}

export function mapServiceRow(row: Row, patientCodeFallback?: string): ServiceRow {
  const doctorCode = optionalString(row.doctorCode ?? row.serviceBy1);

  return {
    sectionCode: numberValue(row.sectionCode ?? row.secCd),
    trTy: row.trTy === undefined || row.trTy === null ? null : numberValue(row.trTy),
    trNo: stringValue(row.trNo),
    patientCode: patientCodeFromRow(row.patientCode, patientCodeFallback),
    patientName: optionalString(row.patientName),
    visitNo: optionalString(row.visitNo),
    serviceCode: stringValue(row.serviceCode),
    serviceName: optionalString(row.serviceName),
    quantity: numberValue(row.quantity),
    price: numberValue(row.price),
    discountValue: numberValue(row.discountValue ?? row.lineDiscount),
    paidValue: numberValue(row.paidValue ?? row.linePaid),
    companyValue: numberValue(row.companyValue),
    entryDate: isoDateValue(row.entryDate ?? row.receiptDate ?? row.trDate),
    serviceBy1: doctorCode,
    currentServiceBy: optionalString(row.currentServiceBy ?? row.currentDoctorCode),
    doctorCode,
    doctorName: optionalString(row.doctorName),
  };
}

export function mapReceiptHeaders(rows: Row[]): ReceiptHeader[] {
  return rows.map((row) => mapReceiptHeader(row));
}

export function mapReceiptDetailRows(rows: Row[]): ReceiptDetailOutput {
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

export function mapServiceRows(rows: Row[]): ServiceRow[] {
  return rows.map((row) => mapServiceRow(row));
}

export function mapDailyRevenueRows(rows: Row[]): DailyRevenueOutput {
  const mappedRows: DailyRevenueRow[] = rows.map((row) => ({
    date: isoDateOnlyValue(row.date ?? row.trDate),
    totalReceipts: numberValue(row.totalReceipts),
    totalGross: numberValue(row.totalGross),
    totalDiscount: numberValue(row.totalDiscount),
    totalCash: numberValue(row.totalCash),
    totalPaid: numberValue(row.totalPaid),
    netAfterDiscount: numberValue(row.netAfterDiscount),
  }));

  const totals = mappedRows.reduce(
    (acc, row) => ({
      totalReceipts: acc.totalReceipts + row.totalReceipts,
      totalGross: acc.totalGross + row.totalGross,
      totalDiscount: acc.totalDiscount + row.totalDiscount,
      totalCash: acc.totalCash + row.totalCash,
      totalPaid: acc.totalPaid + row.totalPaid,
      netAfterDiscount: acc.netAfterDiscount + row.netAfterDiscount,
    }),
    {
      totalReceipts: 0,
      totalGross: 0,
      totalDiscount: 0,
      totalCash: 0,
      totalPaid: 0,
      netAfterDiscount: 0,
    },
  );

  return { rows: mappedRows, totals };
}

export function mapServiceRevenueRows(rows: Row[]): ServiceRevenueOutput {
  const sections = new Map<number, ServiceRevenueSection>();

  for (const row of rows) {
    const sectionCode = numberValue(row.sectionCode);
    const serviceCode = stringValue(row.serviceCode);

    let section = sections.get(sectionCode);
    if (!section) {
      section = {
        sectionCode,
        sectionName: stringValue(row.sectionName || row.sectionCode),
        services: [],
        subtotal: {
          rowCount: 0,
          totalGross: 0,
          totalDiscount: 0,
          totalPaid: 0,
        },
      };
      sections.set(sectionCode, section);
    }

    let service = section.services.find((s: ServiceRevenueService) => s.serviceCode === serviceCode);
    if (!service) {
      service = {
        serviceCode,
        serviceName: optionalString(row.serviceName),
        rowCount: 0,
        totalGross: 0,
        totalPaid: 0,
        totalDiscount: 0,
        details: [],
      };
      section.services.push(service);
    }

    const detail: ServiceRevenueDetail = {
      trNo: stringValue(row.trNo),
      trDate: isoDateValue(row.trDate),
      patientCode: patientCodeFromRow(row.patientCode),
      patientName: optionalString(row.patientName),
      quantity: numberValue(row.quantity),
      price: numberValue(row.price),
      patientShare: numberValue(row.patientShare),
      discount: numberValue(row.discount),
      patientTotal: numberValue(row.patientShare), // In this context, paid by patient
      companyTotal: numberValue(row.companyValue),
    };

    service.details?.push(detail);
    service.rowCount += 1;
    service.totalGross += numberValue(row.lineGross);
    service.totalDiscount += detail.discount;
    service.totalPaid += detail.patientShare;

    section.subtotal.rowCount += 1;
    section.subtotal.totalGross += numberValue(row.lineGross);
    section.subtotal.totalDiscount += detail.discount;
    section.subtotal.totalPaid += detail.patientShare;
  }

  const groupedSections = Array.from(sections.values()).sort(
    (a, b) => a.sectionCode - b.sectionCode,
  );

  for (const section of groupedSections) {
    section.services.sort((a, b) =>
      a.serviceCode.localeCompare(b.serviceCode, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }

  const grandTotal = groupedSections.reduce(
    (acc, section) => ({
      rowCount: acc.rowCount + section.subtotal.rowCount,
      totalGross: acc.totalGross + section.subtotal.totalGross,
      totalDiscount: acc.totalDiscount + section.subtotal.totalDiscount,
      totalPaid: acc.totalPaid + section.subtotal.totalPaid,
    }),
    {
      rowCount: 0,
      totalGross: 0,
      totalDiscount: 0,
      totalPaid: 0,
    },
  );

  return { sections: groupedSections, grandTotal };
}

export function mapLasikRevenueSummaryRow(
  row: Row | undefined,
  input: LasikRevenueSummaryInput,
): LasikRevenueSummaryOutput {
  const totalGross = numberValue(row?.totalGross);
  const totalDiscount = numberValue(row?.totalDiscount);

  return {
    sectionCode: 15,
    fromDate: input.fromDate,
    toDate: input.toDate,
    doctorCode: input.doctorCode ?? null,
    totalServices: numberValue(row?.rowCount ?? row?.row_count),
    totalGross,
    totalDiscount,
    totalPaid: numberValue(row?.totalPaid),
    netAfterDiscount: totalGross - totalDiscount,
  };
}

export function mapPatientLasikSummaryRows(
  rows: Row[],
  patientCode: string | undefined,
): PatientLasikSummaryOutput {
  const receiptMap = new Map<string, ReceiptHeader>();
  const services = rows
    .filter((row) => stringValue(row.serviceCode) !== "")
    .map((row) => mapServiceRow(row, patientCode));

  for (const row of rows) {
    const keyedRow = {
      ...row,
      patientCode: patientCodeFromRow(row.patientCode, patientCode ?? ""),
    };
    receiptMap.set(receiptKey(keyedRow), mapReceiptHeader(keyedRow, patientCode));
  }

  const receipts = Array.from(receiptMap.values());
  const totalGross = rows.reduce((sum, row) => sum + numberValue(row.lineGross), 0);
  const totalDiscount = services.reduce((sum, row) => sum + row.discountValue, 0);
  const totalPaid = services.reduce((sum, row) => sum + row.paidValue, 0);
  const totalCompanyAmount = services.reduce((sum, row) => sum + row.companyValue, 0);
  const lastTransactionDate = receipts[0]?.transactionDate ?? null;

  return {
    patientCode: patientCode ?? receipts[0]?.patientCode ?? "",
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
      totalPatientAmount: totalPaid,
      totalCompanyAmount,
      lastTransactionDate,
    },
  };
}
