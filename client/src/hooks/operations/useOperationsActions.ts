import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";
import { captureElementAsJpg } from "@/lib/nativePdf";
import {
  TAB_CONFIG,
  getPricingDefaults,
  normalizeDoctorName,
  normalizeTabKey,
  operationTypeLabel,
} from "@/lib/operationsPricing";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { type OperationsState } from "./useOperations";
import { type AccountsAdjustments, type ListData, type SavedSummary, sanitizePayment, toDateInputValue, toHindi } from "./operationsShared";

export function useOperationsActions(operations: OperationsState) {
  const utils = trpc.useUtils();
  const saveListMutation = trpc.medical.saveOperationList.useMutation({
    onSuccess: async () => {
      await utils.medical.getOperationList.invalidate();
      await operations.listQuery.refetch();
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ القائمة"));
    },
  });
  const deleteListByIdMutation = trpc.medical.deleteOperationListById.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القائمة من السجل");
      operations.historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل حذف القائمة من السجل"));
    },
  });
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();

  const lastSavedRef = useRef("");
  const lastSaveAttemptRef = useRef<{ snapshot: string; at: number }>({ snapshot: "", at: 0 });
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAccountsAdjustmentInputChange = (key: keyof AccountsAdjustments, rawValue: string) => {
    operations.setAccountsAdjustmentInputsByTab((prev) => ({
      ...prev,
      [operations.activeTab]: {
        ...(prev[operations.activeTab] ?? { radiology: "0", external: "0", cashbox: "0" }),
        [key]: rawValue,
      },
    }));
    const normalized = rawValue.trim().replace(",", ".");
    if (normalized === "" || normalized === "+" || normalized === "-") return;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return;
    operations.setAccountsAdjustmentsByTab((prev) => ({
      ...prev,
      [operations.activeTab]: {
        ...(prev[operations.activeTab] ?? { radiology: 0, external: 0, cashbox: 0 }),
        [key]: parsed,
      },
    }));
  };

  const handleAccountsAdjustmentInputBlur = (key: keyof AccountsAdjustments) => {
    const numericValue = Number(operations.accountsAdjustments[key] ?? 0);
    operations.setAccountsAdjustmentInputsByTab((prev) => ({
      ...prev,
      [operations.activeTab]: {
        ...(prev[operations.activeTab] ?? { radiology: "0", external: "0", cashbox: "0" }),
        [key]: String(Number.isFinite(numericValue) ? numericValue : 0),
      },
    }));
  };

  const buildAccountsPrintContent = (compact: boolean) => {
    const hindiDate = toHindi(operations.exportDateLabel.replace(/-/g, "/"));
    const hindiTime = toHindi(operations.exportTimeLabel);
    const bodyRows =
      operations.currentList
        .map((appointment) => {
          const values = operations.computeAccounting(appointment);
          return `<tr>
        <td>${appointment.name || "-"}</td>
        <td>${operationTypeLabel(appointment.operation || operations.operationType || "Other")}</td>
        <td>${toHindi(String(Number(appointment.amount ?? 0).toFixed(2)))}</td>
        <td>${appointment.discountType === "percent" ? "نسبة %" : "قيمة"}</td>
        <td>${toHindi(String(Number(appointment.discountValue ?? 0).toFixed(2)))}</td>
        <td>${toHindi(values.paid.toFixed(2))}</td>
        <td>${toHindi(values.centerAmount.toFixed(2))}</td>
        <td>${toHindi(values.remainingAmount.toFixed(2))}</td>
      </tr>`;
        })
        .join("") || `<tr><td colspan="8" style="padding:10px;text-align:center;color:#888;">لا توجد حالات</td></tr>`;
    const extraRows = operations.showSawafAdjustments
      ? `
        <tr><td colspan="5"></td><td style="font-weight:700;">الاشعه</td><td colspan="2">${toHindi(
          operations.accountsAdjustments.radiology.toFixed(2)
        )}</td></tr>
        <tr><td colspan="5"></td><td style="font-weight:700;">خارجي</td><td colspan="2">${toHindi(
          operations.accountsAdjustments.external.toFixed(2)
        )}</td></tr>
        <tr><td colspan="5"></td><td style="font-weight:700;">الصندوق</td><td colspan="2">${toHindi(
          operations.accountsAdjustments.cashbox.toFixed(2)
        )}</td></tr>
        <tr style="font-weight:700;background:#f5f5f5;">
          <td colspan="5">إجمالي (الاشعه + خارجي + الصندوق)</td>
          <td>${toHindi(operations.accountsAdjustmentsTotal.toFixed(2))}</td>
          <td>${toHindi(operations.accountingTotals.centerAmount.toFixed(2))}</td>
          <td>${toHindi(operations.accountsNetAfterAdjustments.toFixed(2))}</td>
        </tr>
      `
      : "";
    const cellPad = compact ? "3px 6px" : "6px 6px";
    const headSize = compact ? "9pt" : "12pt";
    const bodySize = compact ? "9pt" : "12pt";
    return `
      <div dir="rtl" style="font-size:${compact ? "11px" : "14px"};font-weight:700;margin-bottom:8px;text-align:center;font-family:Tahoma,Arial,sans-serif;">
        حسابات العمليات - التاريخ: ${hindiDate} &nbsp;|&nbsp; الساعة: ${hindiTime} &nbsp;|&nbsp; الطبيب: ${operations.exportDoctorLabel} &nbsp;|&nbsp; نوع العملية: ${operations.exportOperationLabel}
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Tahoma,Arial,sans-serif;">
        <thead><tr>
          ${["اسم المريض", "نوع العملية", "المبلغ", "نوع الخصم", "الخصم", "المدفوع", "حساب المركز (من الدكتور)", "المتبقي (حساب الدكتور)"]
            .map((header) => `<th style="border:1px solid #444;padding:${cellPad};background:#d1d5db;font-weight:bold;font-size:${headSize};text-align:center;">${header}</th>`)
            .join("")}
        </tr></thead>
        <tbody style="font-size:${bodySize};">
          ${bodyRows}
          <tr style="font-weight:700;background:#f3f4f6;">
            <td colspan="5">الإجمالي</td>
            <td>${toHindi(operations.accountingTotals.paid.toFixed(2))}</td>
            <td>${toHindi(operations.accountingTotals.centerAmount.toFixed(2))}</td>
            <td>${toHindi(operations.accountingTotals.remainingAmount.toFixed(2))}</td>
          </tr>
          ${extraRows}
        </tbody>
      </table>
      <style>tbody tr td{border:1px solid #444;padding:${cellPad};text-align:center;vertical-align:middle;}</style>
    `;
  };

  const buildOperationsPrintContent = () => {
    if (operations.viewMode === "accounts") return buildAccountsPrintContent(false);
    const hindiDate = toHindi(operations.exportDateLabel.replace(/-/g, "/"));
    const hindiTime = toHindi(operations.exportTimeLabel);
    const hasCataract =
      operations.operationType === "Cataract" || operations.currentList.some((row) => row.operation === "Cataract");
    const colSpan = hasCataract ? 10 : 9;
    const cols = [
      { key: "#", w: "4%" },
      { key: "name", w: "28%" },
      { key: "phone", w: "12%" },
      { key: "doctor", w: "14%" },
      { key: "operation", w: "10%" },
      { key: "eye", w: "8%" },
      ...(hasCataract ? [{ key: "hospital", w: "10%" }] : []),
      { key: "center", w: "7%" },
      { key: "payment", w: "7%" },
      { key: "code", w: "10%" },
    ];
    const colgroup = `<colgroup>${cols.map((col) => `<col style="width:${col.w}">`).join("")}</colgroup>`;
    const rows =
      operations.currentList
        .map(
          (appointment, index) => `<tr>
      <td style="font-weight:bold;text-align:center;">${toHindi(String(index + 1))}</td>
      <td style="text-align:center;">${appointment.name ?? ""}</td>
      <td style="direction:ltr;text-align:center;">${appointment.phone ?? ""}</td>
      <td>${appointment.doctor ?? ""}</td>
      <td>${operationTypeLabel(appointment.operation)}</td>
      <td>${appointment.eye ?? ""}</td>
      ${hasCataract ? `<td>${appointment.hospital ?? ""}</td>` : ""}
      <td>${appointment.center ? "✓" : ""}</td>
      <td>${appointment.payment}</td>
      <td>${appointment.code ?? ""}</td>
    </tr>`
        )
        .join("") || `<tr><td colspan="${colSpan}" style="padding:10px;text-align:center;color:#888;">لا توجد حالات</td></tr>`;
    const headers = ["#", "اسم المريض", "الهاتف", "الطبيب", "العملية", "العين", ...(hasCataract ? ["المستشفى"] : []), "مركز", "دفع", "الكود"];
    return `
      <div dir="rtl" style="font-size:14px;font-weight:700;margin-bottom:10px;text-align:center;font-family:Tahoma,Arial,sans-serif;">
        التاريخ: ${hindiDate} &nbsp;|&nbsp; الساعة: ${hindiTime} &nbsp;|&nbsp; الطبيب: ${operations.exportDoctorLabel}
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Tahoma,Arial,sans-serif;">
        ${colgroup}
        <thead><tr>
          ${headers
            .map(
              (header) =>
                `<th style="border:1px solid #444;padding:6px 6px;background:#d1d5db;font-weight:bold;font-size:12pt;text-align:center;white-space:nowrap;line-height:1.2;font-family:Tahoma,Arial,sans-serif;vertical-align:middle;height:44px;">${header}</th>`
            )
            .join("")}
        </tr></thead>
        <tbody style="font-size:12pt;">${rows}</tbody>
      </table>
      <style>tbody tr td{border:1px solid #444;padding:6px 6px;text-align:center;vertical-align:middle !important;white-space:nowrap;line-height:1.2;font-family:Tahoma,Arial,sans-serif;height:42px;display:table-cell;} tbody tr td:nth-child(3){direction:ltr;}</style>`;
  };

  const handlePrint = () => {
    const content = operations.viewMode === "accounts" ? buildAccountsPrintContent(true) : buildOperationsPrintContent();
    const printWindow = window.open("", "_blank", "width=1280,height=900");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Tahoma, Arial, sans-serif; }
</style>
</head>
<body>${content}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const captureOperationsAsJpg = async (): Promise<Blob> => {
    const content = buildOperationsPrintContent();
    const captureRoot = document.createElement("div");
    captureRoot.dir = "rtl";
    captureRoot.style.cssText =
      "position:fixed;left:-99999px;top:0;z-index:-1;background:#fff;padding:8mm;box-sizing:border-box;overflow:hidden;font-family:Tahoma,Arial,sans-serif;width:1180px;height:820px;";
    captureRoot.innerHTML = content;
    document.body.appendChild(captureRoot);
    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const blob = await captureElementAsJpg({ element: captureRoot, quality: 0.92 });
      if (!blob) throw new Error("toBlob failed");
      return blob;
    } finally {
      captureRoot.remove();
    }
  };

  const buildExportFileName = () => `operations-${operations.activeTab}-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;

  const saveBlobInBrowser = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const blobToBase64Data = async (blob: Blob) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Cannot read export blob."));
      reader.readAsDataURL(blob);
    });
    const commaIndex = dataUrl.indexOf(",");
    return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  };

  const saveJpg = async () => {
    try {
      const blob = await captureOperationsAsJpg();
      const fileName = buildExportFileName();
      if (!Capacitor.isNativePlatform()) {
        saveBlobInBrowser(blob, fileName);
        toast.success("تم حفظ الصورة JPG");
        return;
      }
      const base64 = await blobToBase64Data(blob);
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      toast.success("تم حفظ الصورة JPG في Documents");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "تعذر حفظ الصورة JPG"));
    }
  };

  const shareJpg = async () => {
    try {
      const blob = await captureOperationsAsJpg();
      const fileName = buildExportFileName();
      if (Capacitor.isNativePlatform()) {
        const base64 = await blobToBase64Data(blob);
        const written = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({
          title: "Operations",
          text: "Operations list JPG",
          url: written.uri,
          dialogTitle: "Share JPG",
        });
        return;
      }
      if (navigator.share) {
        const file = new File([blob], fileName, { type: "image/jpeg" });
        const canShareFiles = typeof (navigator as any).canShare === "function" ? (navigator as any).canShare({ files: [file] }) : true;
        if (canShareFiles) {
          await navigator.share({ title: "Operations", files: [file] });
          return;
        }
      }
      saveBlobInBrowser(blob, fileName);
      toast.success("تم حفظ الصورة JPG");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "تعذر مشاركة الصورة JPG"));
    }
  };

  const handleAddPatientRow = (patient: any) => {
    if (!operations.canManageList) return;
    if (!patient?.fullName) {
      toast.error("بيانات المريض غير مكتملة");
      return;
    }
    const exists = operations.currentList.some(
      (row) =>
        row.patientId === patient.id ||
        (!!patient.patientCode && row.code === patient.patientCode) ||
        (!!patient.phone && row.phone === patient.phone)
    );
    if (exists) {
      toast.error("هذه الحالة موجودة بالفعل في القائمة");
      return;
    }
    const row: ListData = {
      id: operations.currentList.length + 1,
      patientId: patient.id,
      number: "",
      name: patient.fullName ?? "",
      phone: patient.phone ?? "",
      doctor: operations.doctorName,
      operation: operations.operationType === "" ? operations.operationTypeOther : operations.operationType,
      eye: "",
      center: false,
      payment: "",
      hospital: "",
      code: patient.patientCode ?? "",
      amount: 0,
      paidAmount: 0,
      doctorAmount: null,
      discountType: "amount",
      discountValue: 0,
    };
    const defaults = getPricingDefaults(operations.activeTab, row, operations.pricingConfig);
    row.amount = defaults.amount;
    row.doctorAmount = defaults.doctorAmount;
    operations.setLists({
      ...operations.lists,
      [operations.activeTab]: [...operations.currentList, row],
    });
    operations.setPatientSearchTerm("");
  };

  const handleDeleteRow = (id: number) => {
    if (!operations.canManageList) return;
    operations.setLists({
      ...operations.lists,
      [operations.activeTab]: operations.currentList.filter((appointment) => appointment.id !== id),
    });
    toast.success("تم حذف الصف من القائمة");
  };

  const handleUpdateRow = (id: number, field: keyof ListData | string, value: any) => {
    if (!operations.canManageList) return;
    operations.setLists({
      ...operations.lists,
      [operations.activeTab]: operations.currentList.map((appointment) => {
        if (appointment.id !== id) return appointment;
        const updated = { ...appointment, [field]: value } as ListData;
        if (field === "amount" || field === "discountType" || field === "discountValue") {
          const amountFromRow = Number(updated.amount ?? 0);
          const rawDiscount = Number(updated.discountValue ?? 0);
          const normalizedDiscount = Number.isFinite(rawDiscount) ? Math.max(rawDiscount, 0) : 0;
          const discount =
            updated.discountType === "percent"
              ? Math.min(amountFromRow, (amountFromRow * Math.min(normalizedDiscount, 100)) / 100)
              : Math.min(amountFromRow, normalizedDiscount);
          updated.paidAmount = Math.max(amountFromRow - discount, 0);
        }
        return updated;
      }),
    });
  };

  const handleSaveList = async () => {
    if (!operations.canManageList) {
      toast.error("عرض فقط لهذا الدور");
      return;
    }
    if (saveListMutation.isPending) return;
    if (operations.currentList.length === 0) {
      toast.error("القائمة فارغة. أضف حالة واحدة على الأقل قبل الحفظ");
      return;
    }
    const receiptNumbers = operations.currentList.map((row) => String(row.number ?? "").trim()).filter((value) => value.length > 0);
    const duplicateReceipt = receiptNumbers.find((value, index) => receiptNumbers.indexOf(value) !== index);
    if (duplicateReceipt) {
      toast.error(`رقم الإيصال مكرر: ${duplicateReceipt}`);
      return;
    }
    const patientCodes = operations.currentList.map((row) => String(row.code ?? "").trim()).filter((value) => value.length > 0);
    const duplicateCode = patientCodes.find((value, index) => patientCodes.indexOf(value) !== index);
    if (duplicateCode) {
      toast.error(`كود المريض مكرر: ${duplicateCode}`);
      return;
    }

    const payload = {
      listId: operations.selectedListId > 0 ? operations.selectedListId : null,
      doctorTab: operations.activeTab,
      listDate: operations.listDate,
      operationType: operations.operationType || null,
      doctorName: operations.doctorName || null,
      listTime: operations.listTime || null,
      items: operations.currentList.map((row) => ({
        number: row.number,
        name: row.name,
        phone: row.phone,
        doctor: row.doctor,
        operation: row.operation,
        eye: row.eye,
        center: row.center,
        payment: sanitizePayment(row.payment),
        hospital: row.hospital,
        code: row.code,
        discountType: row.discountType,
        discountValue: row.discountValue,
      })),
    };
    const snapshot = JSON.stringify(payload);
    const now = Date.now();
    if (lastSaveAttemptRef.current.snapshot === snapshot && now - lastSaveAttemptRef.current.at < 2000) {
      return;
    }
    lastSaveAttemptRef.current = { snapshot, at: now };
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    lastSavedRef.current = snapshot;

    await saveListMutation.mutateAsync(payload);

    const names = operations.currentList.map((row) => row.name).filter(Boolean);
    const key = `${operations.listDate}-${names.join("|")}`;
    operations.setSavedSummariesByTab((prev) => {
      const next = prev[operations.activeTab] ?? [];
      if (next.some((item) => item.key === key)) return prev;
      const updated = {
        ...prev,
        [operations.activeTab]: [...next, { key, date: String(operations.listDate), names, items: operations.currentList, operationType: operations.operationType || null }],
      };
      localStorage.setItem("appointments_saved_summaries", JSON.stringify(updated));
      return updated;
    });
    operations.historyQuery.refetch();
  };

  const handleEditSavedSummary = (summary: SavedSummary) => {
    if (summary.listId) {
      handleLoadListById(summary.listId);
      return;
    }
    operations.setListDate(summary.date);
    operations.setLists({
      ...operations.lists,
      [operations.activeTab]: summary.items.map((row: any, index: number) => {
        const mapped = {
          id: row.id ?? index + 1,
          patientId: row.patientId ?? null,
          number: row.number ?? "",
          name: row.name ?? "",
          phone: row.phone ?? "",
          doctor: normalizeDoctorName(row.doctor ?? operations.doctorName),
          operation: row.operation ?? "",
          eye: row.eye ?? "",
          center: Boolean(row.center),
          payment: sanitizePayment(row.payment),
          hospital: row.hospital ?? "",
          code: row.code ?? "",
          amount: Number(row.amount ?? 0),
          paidAmount: Number(row.paidAmount ?? 0),
          doctorAmount: row.doctorAmount === null || row.doctorAmount === undefined ? null : Number(row.doctorAmount),
          discountType: (row.discountType === "percent" ? "percent" : "amount") as "amount" | "percent",
          discountValue: Number(row.discountValue ?? 0),
        };
        const defaults = getPricingDefaults(operations.activeTab, mapped, operations.pricingConfig);
        return {
          ...mapped,
          amount: mapped.amount > 0 ? mapped.amount : defaults.amount,
          doctorAmount: mapped.doctorAmount ?? defaults.doctorAmount,
        };
      }),
    });
  };

  const handleDeleteSavedSummary = (key: string, listId?: number) => {
    if (listId) deleteListByIdMutation.mutate({ listId });
    operations.setSavedSummariesByTab((prev) => {
      const updated = {
        ...prev,
        [operations.activeTab]: (prev[operations.activeTab] ?? []).filter((item) => item.key !== key),
      };
      localStorage.setItem("appointments_saved_summaries", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (!operations.canManageList) return;
    if (!operations.autoSaveEnabled) return;
    if (saveListMutation.isPending) return;
    if (operations.currentList.length === 0) return;

    const payload = {
      listId: operations.selectedListId > 0 ? operations.selectedListId : null,
      doctorTab: operations.activeTab,
      listDate: operations.listDate,
      operationType: operations.operationType || null,
      doctorName: operations.doctorName || null,
      listTime: operations.listTime || null,
      items: operations.currentList.map((row) => ({
        number: row.number,
        name: row.name,
        phone: row.phone,
        doctor: row.doctor,
        operation: row.operation,
        eye: row.eye,
        center: row.center,
        payment: sanitizePayment(row.payment),
        hospital: row.hospital,
        code: row.code,
        discountType: row.discountType,
        discountValue: row.discountValue,
      })),
    };
    const snapshot = JSON.stringify(payload);
    if (snapshot === lastSavedRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const now = Date.now();
        if (lastSaveAttemptRef.current.snapshot === snapshot && now - lastSaveAttemptRef.current.at < 2000) return;
        lastSaveAttemptRef.current = { snapshot, at: now };
        await saveListMutation.mutateAsync(payload);
        lastSavedRef.current = snapshot;
        operations.historyQuery.refetch();
      } catch {
        // Mutation handler surfaces the error.
      }
    }, 1200);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [operations.autoSaveEnabled, operations.activeTab, operations.listDate, operations.operationType, operations.doctorName, operations.listTime, operations.currentList, operations.selectedListId, operations.canManageList, operations.historyQuery, saveListMutation]);

  useEffect(() => {
    const payload = {
      activeTab: operations.activeTab,
      listDate: operations.listDate,
      operationType: operations.operationType,
      operationTypeOther: operations.operationTypeOther,
      doctorName: operations.doctorName,
      listTime: operations.listTime,
      viewMode: operations.viewMode,
      historySearch: operations.historySearch,
      autoSaveEnabled: operations.autoSaveEnabled,
    };
    if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    userStateTimerRef.current = setTimeout(() => {
      saveUserStateMutation.mutate({ page: "appointments", data: payload });
    }, 800);
    return () => {
      if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    };
  }, [
    operations.activeTab,
    operations.autoSaveEnabled,
    operations.doctorName,
    operations.historySearch,
    operations.listDate,
    operations.listTime,
    operations.operationType,
    operations.operationTypeOther,
    operations.viewMode,
    saveUserStateMutation,
  ]);

  const handleNewList = async () => {
    if (!operations.canManageList) {
      toast.error("عرض فقط لهذا الدور");
      return;
    }
    operations.setLists({ ...operations.lists, [operations.activeTab]: [] });
    operations.setSelectedListId(0);
  };

  const handleLoadListById = (listId: number) => {
    operations.setSelectedListId(listId);
  };

  useEffect(() => {
    const data = operations.listByIdQuery.data as any;
    if (!data || !data.id) return;
    operations.setActiveTab(normalizeTabKey(data.doctorTab ?? operations.activeTab));
    operations.setListDate(toDateInputValue(data.listDate));
    operations.setDoctorName(normalizeDoctorName(data.doctorName ?? ""));
    operations.setOperationType(data.operationType ?? "");
    operations.setListTime(data.listTime ?? "");
    const tabKey = normalizeTabKey(data.doctorTab ?? operations.activeTab);
    const items = (data.items ?? [])
      .map((item: any, index: number) => ({
        id: item.id ?? index + 1,
        number: item.number ?? "",
        name: item.name ?? "",
        phone: item.phone ?? "",
        doctor: normalizeDoctorName(item.doctor ?? ""),
        operation: item.operation ?? "",
        eye: item.eye ?? "",
        center: Boolean(item.center),
        payment: sanitizePayment(item.payment),
        hospital: item.hospital ?? "",
        code: item.code ?? "",
        amount: 0,
        paidAmount: 0,
        doctorAmount: null,
        discountType: "amount" as const,
        discountValue: 0,
      }))
      .map((row: ListData) => {
        const defaults = getPricingDefaults(tabKey, row, operations.pricingConfig);
        return { ...row, amount: defaults.amount, doctorAmount: defaults.doctorAmount };
      });
    operations.setLists((prev) => ({ ...prev, [tabKey]: items }));
  }, [operations.activeTab, operations.listByIdQuery.data, operations.pricingConfig, operations.setActiveTab, operations.setDoctorName, operations.setListDate, operations.setListTime, operations.setLists, operations.setOperationType]);

  return {
    buildAccountsPrintContent,
    buildOperationsPrintContent,
    deleteListByIdMutation,
    handleAccountsAdjustmentInputBlur,
    handleAccountsAdjustmentInputChange,
    handleAddPatientRow,
    handleDeleteRow,
    handleDeleteSavedSummary,
    handleEditSavedSummary,
    handleLoadListById,
    handleNewList,
    handlePrint,
    handleSaveList,
    handleUpdateRow,
    saveJpg,
    saveListMutation,
    shareJpg,
  };
}

export type OperationsActions = ReturnType<typeof useOperationsActions>;
