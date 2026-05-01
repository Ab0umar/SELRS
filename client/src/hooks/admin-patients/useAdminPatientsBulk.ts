import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { loadXlsx } from "@/lib/xlsx";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { type AdminPatientsListState } from "./useAdminPatientsList";
import { type BulkSnapshot, type ImportPreviewRow, type SheetTypeChoice, toLegacyServiceType } from "./adminPatientsShared";

type UseAdminPatientsBulkOptions = {
  activeDoctors: AdminPatientsListState["activeDoctors"];
  filteredPatients: AdminPatientsListState["filteredPatients"];
  getRowServiceCode: AdminPatientsListState["getRowServiceCode"];
  savePatientPageStateMutation: AdminPatientsListState["savePatientPageStateMutation"];
  setManualLockOverrides: Dispatch<SetStateAction<Record<number, boolean>>>;
};

export function useAdminPatientsBulk({
  activeDoctors,
  filteredPatients,
  getRowServiceCode,
  savePatientPageStateMutation,
  setManualLockOverrides,
}: UseAdminPatientsBulkOptions) {
  const utils = trpc.useUtils();
  const bulkAssignDoctorMutation = trpc.medical.bulkAssignDoctorToPatients.useMutation();
  const bulkAssignSheetMutation = trpc.medical.bulkAssignSheetTypeToPatients.useMutation();
  const bulkRestoreMutation = trpc.medical.bulkRestorePatients.useMutation();
  const stageImportMutation = trpc.medical.stagePatientsImport.useMutation();
  const applyImportMutation = trpc.medical.applyPatientsImport.useMutation();

  const [bulkDoctorId, setBulkDoctorId] = useState("none");
  const [bulkSheetType, setBulkSheetType] = useState<"none" | SheetTypeChoice>("none");
  const [bulkManualLock, setBulkManualLock] = useState<"none" | "on" | "off">("none");
  const [lastBulkSnapshots, setLastBulkSnapshots] = useState<BulkSnapshot[]>([]);
  const [lastBulkLabel, setLastBulkLabel] = useState("");
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importBatchId, setImportBatchId] = useState("");
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importDateFormat, setImportDateFormat] = useState<"" | "DMY" | "MDY">("");

  const handleSetFilteredDoctor = async () => {
    if (filteredPatients.length === 0) {
      toast.info("No patients in current filter");
      return;
    }
    if (bulkDoctorId === "none") {
      toast.info("Choose doctor first");
      return;
    }
    const selectedDoctor = activeDoctors.find((doctor) => doctor.id === bulkDoctorId);
    if (!selectedDoctor) {
      toast.error("Selected doctor not found");
      return;
    }
    const nextDoctorName = String(selectedDoctor.name ?? "").trim();
    if (!nextDoctorName) {
      toast.error("Selected doctor name is empty");
      return;
    }
    const nextLocation = selectedDoctor.locationType === "external" ? "external" : "center";
    const confirmed = window.confirm(`Change doctor for ${filteredPatients.length} filtered patients to \"${nextDoctorName}\" (${nextLocation})?`);
    if (!confirmed) return;

    try {
      const result = await bulkAssignDoctorMutation.mutateAsync({
        patientIds: Array.from(new Set(filteredPatients.map((patient) => patient.id))),
        doctorCode: String(selectedDoctor.code ?? "").trim(),
        doctorName: nextDoctorName,
        doctorLocationType: nextLocation,
      });
      setLastBulkSnapshots(((result as { snapshots?: BulkSnapshot[] }).snapshots ?? []) as BulkSnapshot[]);
      setLastBulkLabel(`Doctor -> ${nextDoctorName}`);
      toast.success(
        `Updated ${(result as { updatedCount?: number }).updatedCount ?? filteredPatients.length} patients to ${nextDoctorName}`,
      );
      await utils.medical.getAllPatients.invalidate();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to update filtered patients doctor"));
    }
  };

  const handleSetFilteredSheetType = async () => {
    if (filteredPatients.length === 0) {
      toast.info("No patients in current filter");
      return;
    }
    if (bulkSheetType === "none") {
      toast.info("Choose sheet type first");
      return;
    }
    const confirmed = window.confirm(`Change sheet type for ${filteredPatients.length} filtered patients to \"${bulkSheetType}\"?`);
    if (!confirmed) return;

    try {
      const rowsWithServiceCode = filteredPatients.filter((patient) => Boolean(getRowServiceCode(patient)));
      const rowsWithoutServiceCode = filteredPatients.filter((patient) => !getRowServiceCode(patient));
      let updatedCount = 0;

      for (const patient of rowsWithServiceCode) {
        const rowServiceCode = getRowServiceCode(patient);
        if (!rowServiceCode) continue;
        const existingState = await utils.medical.getPatientPageState.fetch({ patientId: patient.id, page: "examination" }).catch(() => null);
        const existingData =
          existingState && typeof (existingState as { data?: unknown }).data === "object" && (existingState as { data?: unknown }).data
            ? ((existingState as { data: Record<string, unknown> }).data as Record<string, unknown>)
            : {};
        const existingMap =
          existingData.serviceSheetTypeByCode && typeof existingData.serviceSheetTypeByCode === "object"
            ? (existingData.serviceSheetTypeByCode as Record<string, unknown>)
            : {};

        await savePatientPageStateMutation.mutateAsync({
          patientId: patient.id,
          page: "examination",
          data: {
            ...existingData,
            syncLockManual: true,
            manualEditedAt: new Date().toISOString(),
            serviceSheetTypeByCode: {
              ...existingMap,
              [rowServiceCode]: bulkSheetType,
            },
          },
        });
        updatedCount += 1;
      }

      let snapshots: BulkSnapshot[] = [];
      if (rowsWithoutServiceCode.length > 0) {
        const result = await bulkAssignSheetMutation.mutateAsync({
          patientIds: Array.from(new Set(rowsWithoutServiceCode.map((patient) => patient.id))),
          sheetType: toLegacyServiceType(bulkSheetType),
        });
        snapshots = ((result as { snapshots?: BulkSnapshot[] }).snapshots ?? []) as BulkSnapshot[];
        updatedCount += Number((result as { updatedCount?: number }).updatedCount ?? rowsWithoutServiceCode.length);
      }

      setLastBulkSnapshots(snapshots);
      setLastBulkLabel(`Sheet -> ${bulkSheetType}`);
      toast.success(`Updated ${updatedCount} patients to ${bulkSheetType}`);
      await utils.medical.getAllPatients.invalidate();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to update filtered patients sheet type"));
    }
  };

  const handleSetFilteredManualLock = async () => {
    if (filteredPatients.length === 0) {
      toast.info("No patients in current filter");
      return;
    }
    if (bulkManualLock === "none") {
      toast.info("Choose manual lock mode first");
      return;
    }
    const nextEnabled = bulkManualLock === "on";
    const confirmed = window.confirm(`${nextEnabled ? "Enable" : "Disable"} manual lock for ${filteredPatients.length} filtered patients?`);
    if (!confirmed) return;

    try {
      const uniquePatients = Array.from(new Map(filteredPatients.map((patient) => [patient.id, patient])).values());
      for (const patient of uniquePatients) {
        const existingState = await utils.medical.getPatientPageState.fetch({ patientId: patient.id, page: "examination" }).catch(() => null);
        const existingData =
          existingState && typeof (existingState as { data?: unknown }).data === "object" && (existingState as { data?: unknown }).data
            ? ((existingState as { data: Record<string, unknown> }).data as Record<string, unknown>)
            : {};

        await savePatientPageStateMutation.mutateAsync({
          patientId: patient.id,
          page: "examination",
          data: {
            ...existingData,
            syncLockManual: nextEnabled,
            manualEditedAt: nextEnabled ? new Date().toISOString() : "",
          },
        });
      }

      setManualLockOverrides((prev) => {
        const next = { ...prev };
        for (const patient of filteredPatients) {
          next[patient.id] = nextEnabled;
        }
        return next;
      });
      toast.success(`${nextEnabled ? "Enabled" : "Disabled"} manual lock for ${filteredPatients.length} patients`);
      await utils.medical.getAllPatients.invalidate();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to update manual lock for filtered patients"));
    }
  };

  const handleUndoLastBulkAction = async () => {
    if (lastBulkSnapshots.length === 0) {
      toast.info("No bulk action to undo");
      return;
    }
    const confirmed = window.confirm(`Undo last bulk action (${lastBulkLabel}) for ${lastBulkSnapshots.length} patients?`);
    if (!confirmed) return;

    try {
      await bulkRestoreMutation.mutateAsync({
        snapshots: lastBulkSnapshots.map((item) => ({
          patientId: item.patientId,
          serviceType: item.serviceType ?? null,
          locationType: item.locationType ?? null,
          doctorName: item.doctorName ?? "",
        })),
      });
      setLastBulkSnapshots([]);
      setLastBulkLabel("");
      toast.success("Last bulk action undone");
      await utils.medical.getAllPatients.invalidate();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to undo last bulk action"));
    }
  };

  const downloadInvalidImportCsv = () => {
    const invalidRows = importPreviewRows.filter((row) => row.status !== "valid");
    if (invalidRows.length === 0) {
      toast.info("No invalid rows to export");
      return;
    }
    const escapeCsv = (value: string) => `\"${String(value ?? "").replace(/\"/g, '\"\"')}\"`;
    const lines = [
      ["rowNumber", "patientCode", "fullName", "status", "errors"].join(","),
      ...invalidRows.map((row) =>
        [String(row.rowNumber), escapeCsv(row.patientCode), escapeCsv(row.fullName), escapeCsv(row.status), escapeCsv((row.errors ?? []).join(" | "))].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `admin_patients_import_errors_${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applyStagedImport = async () => {
    if (!importBatchId) return;
    try {
      const applied = await applyImportMutation.mutateAsync({ batchId: importBatchId });
      if (applied.inserted > 0 || applied.updated > 0) {
        toast.success(`Import applied. Inserted ${applied.inserted}, updated ${applied.updated}.`);
      }
      if (applied.failed > 0) {
        toast.error(`Apply failed for ${applied.failed} row(s).`);
      }
      setImportPreviewOpen(false);
      await utils.medical.getAllPatients.invalidate();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to apply import batch"));
    }
  };

  const handleImportPatients = async (file: File) => {
    if (!importDateFormat) {
      toast.error("Choose import date format first (DD/MM/YYYY or MM/DD/YYYY)");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const normalizeString = (value: unknown) => String(value ?? "").trim();
      const preferredSlashOrder: "DMY" | "MDY" = importDateFormat;
      const normalizeCode = (value: unknown) => {
        const raw = normalizeString(value);
        if (!raw) return "";
        return /^\d+$/.test(raw) ? raw.padStart(4, "0") : raw;
      };
      const normalizeDate = (value: unknown) => {
        if (!value) return "";
        if (value instanceof Date) {
          const yyyy = value.getFullYear();
          const mm = String(value.getMonth() + 1).padStart(2, "0");
          const dd = String(value.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }
        const raw = String(value).trim();
        if (!raw) return "";
        if (/^\d+(\.\d+)?$/.test(raw)) {
          const excelEpoch = new Date(Date.UTC(1899, 11, 30));
          const days = Number(raw);
          if (Number.isFinite(days)) {
            const date = new Date(excelEpoch.getTime() + days * 86400000);
            const yyyy = date.getUTCFullYear();
            const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
            const dd = String(date.getUTCDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
          }
        }
        const slash = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (slash) {
          const part1 = Number(slash[1]);
          const part2 = Number(slash[2]);
          let dd = 0;
          let mm = 0;
          if (part1 > 12 && part2 >= 1 && part2 <= 12) {
            dd = part1;
            mm = part2;
          } else if (part2 > 12 && part1 >= 1 && part1 <= 12) {
            dd = part2;
            mm = part1;
          } else if (preferredSlashOrder === "MDY") {
            mm = part1;
            dd = part2;
          } else {
            dd = part1;
            mm = part2;
          }
          if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return "";
          return `${slash[3]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        }
        const iso = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (iso) {
          return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
        }
        return "";
      };
      const parseServiceType = (raw: string): SheetTypeChoice => {
        const value = raw.trim().toLowerCase();
        if (value === "b" || value === "اخصائي" || value === "أخصائي" || value === "specialist") return "specialist";
        if (value === "c" || value === "فحوصات الليزك" || value === "lasik") return "lasik";
        if (value === "d" || value === "خارجي" || value === "external" || value === "2") return "external";
        return "consultant";
      };
      const readRowValue = (row: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
          const value = row[key];
          if (value !== undefined && value !== null && String(value).trim() !== "") return value;
        }
        return "";
      };

      const rowsWithSheetName = workbook.SheetNames.flatMap((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) return [] as Array<Record<string, unknown> & { __sheetName: string }>;
        const rows = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;
        return rows.map((row) => ({ ...row, __sheetName: sheetName }));
      });

      const stageRows = rowsWithSheetName.map((rawRow, index) => {
        const row = rawRow as Record<string, unknown>;
        const serviceType = toLegacyServiceType(
          parseServiceType(
            normalizeString(
              readRowValue(row, [
                "serviceCode",
                "service_code",
                "serviceType",
                "service_type",
                "Service Code",
                "Service Type",
                "كود الخدمة",
                "نوع الخدمة",
              ]),
            ),
          ),
        );
        return {
          rowNumber: index + 2,
          patientCode: normalizeCode(row.patientCode || row.id || row.ID || row["Patient ID"] || row["رقم المريض"] || row["كود المريض"]),
          fullName: normalizeString(row.fullName || row.name || row["اسم المريض"]),
          dateOfBirth: normalizeDate(row.dateOfBirth ?? row["تاريخ الميلاد"]),
          gender: (() => {
            const rawGender = normalizeString(row.gender ?? row["النوع"]);
            if (rawGender === "ذكر" || rawGender.toLowerCase() === "male") return "male" as const;
            if (rawGender === "أنثى" || rawGender === "انثى" || rawGender.toLowerCase() === "female") return "female" as const;
            return "" as const;
          })(),
          phone: normalizeString(row.phone || row["تليفون منزل"] || row["تليفون"] || row["موبايل"] || row["الموبايل"] || row["هاتف"]),
          address: normalizeString(row.address || row["العنوان"]),
          branch: "examinations" as const,
          serviceType,
          locationType: (serviceType === "external" ? "external" : "center") as "center" | "external",
          doctorCode: normalizeString(
            readRowValue(row, [
              "doctorCode",
              "doctor_code",
              "doctor",
              "doctorName",
              "DoctorCode",
              "Doctor Code",
              "doctor code",
              "docCode",
              "drCode",
              "treatingDoctor",
              "physicianCode",
              "physician",
              "كود الطبيب",
              "كود الدكتور",
              "الطبيب",
              "اسم الطبيب",
            ]),
          ),
          doctorName: normalizeString(readRowValue(row, ["doctorName", "doctor", "treatingDoctor", "physician", "اسم الطبيب", "الطبيب"])),
        };
      });

      const stage = await stageImportMutation.mutateAsync({ rows: stageRows });
      const preview = await utils.medical.getPatientImportPreview.fetch({ batchId: stage.batchId, limit: 200 });
      setImportBatchId(stage.batchId);
      setImportSummary({ total: stage.total, valid: stage.valid, invalid: stage.invalid });
      setImportPreviewRows((preview as ImportPreviewRow[]) ?? []);
      setImportPreviewOpen(true);
      if (stage.invalid > 0) {
        toast.error(`Import validation has ${stage.invalid} invalid row(s). Review before apply.`);
      } else {
        toast.success(`Validation passed for ${stage.valid} row(s). Click Apply to import.`);
      }
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to import patient workbook"));
    }
  };

  return {
    applyImportMutation,
    applyStagedImport,
    bulkAssignDoctorMutation,
    bulkDoctorId,
    bulkManualLock,
    bulkRestoreMutation,
    bulkSheetType,
    downloadInvalidImportCsv,
    handleSetFilteredDoctor,
    handleImportPatients,
    handleSetFilteredManualLock,
    handleSetFilteredSheetType,
    handleUndoLastBulkAction,
    importBatchId,
    importDateFormat,
    importPreviewOpen,
    importPreviewRows,
    importSummary,
    lastBulkLabel,
    lastBulkSnapshots,
    setBulkDoctorId,
    setBulkManualLock,
    setBulkSheetType,
    setImportDateFormat,
    setImportPreviewOpen,
    stageImportMutation,
  };
}
