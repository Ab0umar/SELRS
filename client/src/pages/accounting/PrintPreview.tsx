import React, { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, CircleAlert } from "lucide-react";
import styles from "./PrintPreview.module.css";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND_LOGO_PNG_FALLBACK_URL, BRAND_LOGO_URL } from "@/lib/brand";
import { printOrExportPdf } from "@/lib/nativePdf";
import {
  firstNumericColumnIndex,
  formatPrintCellValue,
  hasPrintableDateRange,
  sumNumericBlock,
  type PrintPayload,
} from "./printUtils";
import { formatDateAr, toArabicDigits } from "./accountingFormat";

const PRINT_LOGO_CHAIN = [BRAND_LOGO_URL, BRAND_LOGO_PNG_FALLBACK_URL] as const;

/** Real uploaded clinic assets only (no SVG / no placeholder icon). */
function PrintClinicLogo({ className }: { className?: string }) {
  const [idx, setIdx] = useState(0);
  if (idx >= PRINT_LOGO_CHAIN.length) return null;
  return (
    <img
      src={PRINT_LOGO_CHAIN[idx]}
      alt=""
      className={className}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

function receiptDataCellClass(key: string): string {
  if (key === "price" || key === "discountValue" || key === "paidValue") {
    return styles.receiptColNumeric;
  }
  if (key === "serviceCode" || key === "doctorCode" || key === "sectionCode") {
    return styles.receiptColCode;
  }
  return styles.receiptColText;
}

function receiptFilterValueUseRtl(filterKey: string): boolean {
  if (filterKey.includes("اسم")) return true;
  if (filterKey.includes("نوع")) return true;
  return false;
}

function reportThClass(col: { key: string; align?: string }, isReceiptPrint: boolean): string {
  if (isReceiptPrint) return styles.receiptTh;
  if (col.align === "center") return "text-center";
  return styles.reportThText;
}

function subtotalLabelSpan(cols: { key: string; label: string; align?: "left" | "right" | "center" }[]): number {
  return Math.max(1, firstNumericColumnIndex(cols));
}

function reportTdClass(col: { key: string; align?: string }, isReceiptPrint: boolean): string {
  if (isReceiptPrint) return receiptDataCellClass(col.key);
  if (col.align === "center") return "text-center";
  return styles.reportTdText;
}

export default function PrintPreview() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [payload, setPayload] = useState<PrintPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const payloadId = params.get("payloadId");

    if (!payloadId) {
      setError("No print payload specified.");
      return;
    }

    try {
      const data = sessionStorage.getItem(payloadId);
      if (!data) {
        setError("Print data has expired or is invalid.");
        return;
      }

      setPayload(JSON.parse(data) as PrintPayload);
      sessionStorage.removeItem(payloadId);
    } catch (err) {
      setError("Failed to load print data.");
    }
  }, [search]);

  useEffect(() => {
    if (!payload) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [payload]);

  if (error) {
    return (
      <div className="min-h-screen bg-muted/20 p-8 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="flex flex-col items-center p-6 text-center gap-4">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <CircleAlert className="h-8 w-8" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">تعذر عرض المعاينة</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => setLocation("/accounting")} variant="outline" className="mt-2">
              <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              الرجوع إلى الحسابات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  const isReceiptPrint = payload.printLayout === "receipt";
  const cols = payload.columns;
  const labelSpan = subtotalLabelSpan(cols);

  const renderTotalsFoot = () => {
    if (!payload.totals || payload.totals.length === 0) return null;
    return (
      <tfoot>
        {payload.totals.map((total, tIndex) => (
          <tr key={tIndex} className={styles.grandTotalPrintRow}>
            {cols.map((col, cIndex) => {
              if (cIndex === 0) {
                return (
                  <td
                    key={col.key}
                    className={
                      isReceiptPrint
                        ? `${styles.receiptTotalLabel} ${styles.grandTotalPrintCell}`
                        : `${styles.reportTdText} ${styles.grandTotalPrintCell}`
                    }
                  >
                    {total.label}
                  </td>
                );
              }
              const val = total.values[col.key];
              if (val !== undefined) {
                return (
                  <td
                    key={col.key}
                    className={
                      isReceiptPrint
                        ? `${styles.receiptColNumeric} ${styles.grandTotalPrintCell}`
                        : `${styles.reportTdNum} ${styles.grandTotalPrintCell}`
                    }
                  >
                    {formatPrintCellValue(val, col)}
                  </td>
                );
              }
              return (
                <td
                  key={col.key}
                  className={
                    isReceiptPrint ? `${styles.receiptColText} ${styles.grandTotalPrintCell}` : styles.grandTotalPrintCell
                  }
                />
              );
            })}
          </tr>
        ))}
      </tfoot>
    );
  };

  const handlePrint = async () => {
    if (Capacitor.isNativePlatform()) {
      await printOrExportPdf(`${payload.title}.pdf`, {
        selector: "[data-accounting-print-root]",
      });
      return;
    }
    window.print();
  };

  let bodyRows: React.ReactNode[] = [];

  const hasDoctorGroup = payload.groupBy?.includes("doctor");
  const hasServiceGroup = payload.groupBy?.includes("service");

  if (hasServiceGroup && !hasDoctorGroup) {
    let currentServiceCode: string | null = null;
    const blockRows: Record<string, unknown>[] = [];

    const flushServiceBlock = (svc: string) => {
      if (blockRows.length === 0) return;
      const sums = sumNumericBlock(blockRows, cols);
      bodyRows.push(
        <tr key={`sub-svc-${svc}`} className={styles.groupSubtotalRow}>
          <td colSpan={labelSpan} className="text-right font-bold">
            إجمالي الخدمة
          </td>
          {cols.slice(labelSpan).map((col) => (
            <td key={col.key} className={reportTdClass(col, isReceiptPrint)}>
              {col.align === "right" && sums[col.key] !== undefined
                ? formatPrintCellValue(sums[col.key], col)
                : ""}
            </td>
          ))}
        </tr>,
      );
      blockRows.length = 0;
    };

    payload.rows.forEach((row, index) => {
      const r = row as Record<string, unknown>;
      const serviceCode = String(r.serviceCode ?? "");
      if (serviceCode !== currentServiceCode) {
        if (currentServiceCode !== null) {
          flushServiceBlock(currentServiceCode);
        }
        currentServiceCode = serviceCode;
        const serviceName = String(r.serviceName ?? "");
        const label =
          serviceName.trim().length > 0 ? `${serviceCode} — ${serviceName}` : serviceCode;
        bodyRows.push(
          <tr key={`svc-${serviceCode}-${index}`} className={styles.groupRow}>
            <td colSpan={cols.length} className="font-bold text-right">
              الخدمة: {toArabicDigits(label)}
            </td>
          </tr>,
        );
      }

      bodyRows.push(
        <tr key={index}>
          {cols.map((col) => (
            <td key={col.key} className={reportTdClass(col, isReceiptPrint)}>
              {col.key === "serviceCode" || col.key === "serviceName"
                ? ""
                : formatPrintCellValue(r[col.key], col)}
            </td>
          ))}
        </tr>,
      );
      blockRows.push(r);
    });
    if (currentServiceCode !== null) {
      flushServiceBlock(currentServiceCode);
    }
  } else if (hasDoctorGroup) {
    let currentDoctorCode: string | null = null;
    const blockRows: Record<string, unknown>[] = [];

    const flushDoctorBlock = (doc: string) => {
      if (blockRows.length === 0) return;
      const sums = sumNumericBlock(blockRows, cols);
      bodyRows.push(
        <tr key={`sub-doc-${doc}`} className={styles.groupSubtotalRow}>
          <td colSpan={labelSpan} className="text-right font-bold">
            إجمالي الطبيب
          </td>
          {cols.slice(labelSpan).map((col) => (
            <td key={col.key} className={reportTdClass(col, isReceiptPrint)}>
              {col.align === "right" && sums[col.key] !== undefined
                ? formatPrintCellValue(sums[col.key], col)
                : ""}
            </td>
          ))}
        </tr>,
      );
      blockRows.length = 0;
    };

    payload.rows.forEach((row, index) => {
      const r = row as Record<string, unknown>;
      const doctorCode = String(r.doctorCode ?? "");
      if (doctorCode !== currentDoctorCode) {
        if (currentDoctorCode !== null) {
          flushDoctorBlock(currentDoctorCode);
        }
        currentDoctorCode = doctorCode;
        const doctorName = r.doctorName ? `${String(r.doctorName)} (${doctorCode})` : doctorCode;
        bodyRows.push(
          <tr key={`group-${doctorCode}-${index}`} className={styles.groupRow}>
            <td colSpan={cols.length} className="font-bold text-right">
              الطبيب: {toArabicDigits(String(doctorName))}
            </td>
          </tr>,
        );
      }

      bodyRows.push(
        <tr key={index}>
          {cols.map((col) => (
            <td key={col.key} className={reportTdClass(col, isReceiptPrint)}>
              {col.key === "doctorCode" || col.key === "doctorName"
                ? ""
                : formatPrintCellValue(r[col.key], col)}
            </td>
          ))}
        </tr>,
      );
      blockRows.push(r);
    });
    if (currentDoctorCode !== null) {
      flushDoctorBlock(currentDoctorCode);
    }
  } else {
    bodyRows = payload.rows.map((row, index) => {
      const r = row as Record<string, unknown>;
      if (r.isSubtotal) {
        return (
          <tr key={index} className={styles.groupSubtotalRow}>
            {cols.map((col, cIndex) => {
              if (cIndex === 0) {
                return (
                  <td key={col.key} colSpan={labelSpan} className="text-right font-bold">
                    {String(r[col.key] ?? "")}
                  </td>
                );
              }
              if (cIndex < labelSpan) return null;

              return (
                <td key={col.key} className={reportTdClass(col, isReceiptPrint)}>
                  {col.align === "right" && r[col.key] !== undefined
                    ? formatPrintCellValue(r[col.key], col)
                    : ""}
                </td>
              );
            })}
          </tr>
        );
      }
      return (
        <tr key={index}>
          {cols.map((col) => (
            <td key={col.key} className={reportTdClass(col, isReceiptPrint)}>
              {formatPrintCellValue(r[col.key], col)}
            </td>
          ))}
        </tr>
      );
    });
  }

  return (
    <div className={styles.viewport} dir="rtl">
      <div className={`${styles.backdrop} ${styles.noPrint}`} aria-hidden />
      <div className={styles.dialog}>
        <div className={`${styles.actionBar} ${styles.noPrint}`}>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            رجوع
          </Button>
          <Button type="button" onClick={() => void handlePrint()}>
            <Printer className="ml-2 h-4 w-4" />
            طباعة التقرير
          </Button>
        </div>

        <div
          data-accounting-print-root
          className={`${styles.reportPaper}${isReceiptPrint ? ` ${styles.receiptPrint}` : ""}`}
        >
          <div className={styles.printSurface}>
            <table className={styles.table}>
              <colgroup>
                {cols.map((col) => (
                  <col key={col.key} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={cols.length} className={styles.printHeaderCell}>
                    <div className={styles.printBrandHeader} aria-hidden="true">
                      <span className={styles.printBrandName}>مركز عيون الشروق</span>
                      <PrintClinicLogo className={styles.printBrandLogo} />
                    </div>

                    <div className={`${styles.header} ${styles.screenOnly}`}>
                      <h1 className="text-2xl font-bold uppercase tracking-tight">{payload.title}</h1>
                      <div className="mt-1 text-sm font-medium text-slate-900">{payload.meta.clinicName}</div>
                    </div>

                    <div className={styles.printTitleBand}>
                      <h1 className={styles.printTitleH1}>{payload.title}</h1>
                    </div>

                    <div className={styles.metaBlock}>
                      <div className={`grid gap-4 text-sm ${isReceiptPrint ? "" : "grid-cols-2"}`}>
                        {hasPrintableDateRange(payload.meta) && (
                          <div className={isReceiptPrint ? styles.receiptMetaRow : undefined}>
                            <span className="font-semibold">الفترة:</span>
                            {isReceiptPrint ? (
                              <span className={styles.receiptMetaValueRtl}>
                                من {formatDateAr(payload.meta.fromDate)} إلى {formatDateAr(payload.meta.toDate)}
                              </span>
                            ) : (
                              <>
                                {" "}
                                من {formatDateAr(payload.meta.fromDate)} إلى {formatDateAr(payload.meta.toDate)}
                              </>
                            )}
                          </div>
                        )}
                        {payload.meta.filters &&
                          Object.entries(payload.meta.filters).map(([key, value]) => {
                            if (!value) return null;
                            return (
                              <div key={key} className={isReceiptPrint ? styles.receiptMetaRow : undefined}>
                                <span className="font-semibold">{key}:</span>
                                {isReceiptPrint ? (
                                  <span
                                    className={
                                      receiptFilterValueUseRtl(key)
                                        ? styles.receiptMetaValueRtl
                                        : styles.receiptMetaValueLtr
                                    }
                                  >
                                    {toArabicDigits(value)}
                                  </span>
                                ) : (
                                  <> {toArabicDigits(value)}</>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </th>
                </tr>
                <tr>
                  {cols.map((col) => (
                    <th key={col.key} className={reportThClass(col, isReceiptPrint)}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{bodyRows}</tbody>
              {renderTotalsFoot()}
            </table>

            <div className={styles.printTail}>
              {payload.footer && (
                <div className={styles.footer}>
                  <p className="font-medium">{toArabicDigits(payload.footer)}</p>
                </div>
              )}
              <div className={styles.printTime}>
                تمت الطباعة في: {toArabicDigits(new Date().toLocaleString("ar-EG"))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
