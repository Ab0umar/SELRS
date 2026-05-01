import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { loadXlsx } from "@/lib/xlsx";

export type ImportPreviewRow = {
  rowNumber: number;
  patientCode: string;
  fullName: string;
  serviceType: string;
  locationType: string;
  status: string;
  errors: string[];
};

export function usePatientsActions(
  isAuthenticated: boolean,
  patientsQuery: any,
  utils: any
) {
  const [importDateFormat, setImportDateFormat] = useState<"" | "DMY" | "MDY">("");
  const [importBatchId, setImportBatchId] = useState("");
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPatientMutation = trpc.medical.createPatient.useMutation({
    onSuccess: () => {
      patientsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء إضافة المريض"));
    },
  });

  const updatePatientMutation = trpc.medical.updatePatient.useMutation({
    onSuccess: () => {
      patientsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء تحديث المريض"));
    },
  });

  const deletePatientMutation = trpc.medical.deletePatient.useMutation({
    onSuccess: () => {
      patientsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء حذف المريض"));
    },
  });

  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation({
    onSuccess: () => {
      toast.success("تم نقل البيانات إلى فحوصات الليزك المختارة");
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء نقل البيانات"));
    },
  });

  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  const bulkAssignSheetMutation = trpc.medical.bulkAssignSheetTypeToPatients.useMutation();
  const stageImportMutation = trpc.medical.stagePatientsImport.useMutation();
  const applyImportMutation = trpc.medical.applyPatientsImport.useMutation();

  const downloadInvalidImportCsv = () => {
    const invalidRows = importPreviewRows.filter((r) => r.status !== "valid");
    if (!invalidRows.length) {
      toast.info("No invalid rows to export");
      return;
    }
    const escapeCsv = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["rowNumber", "patientCode", "fullName", "status", "errors"].join(","),
      ...invalidRows.map((r) =>
        [
          String(r.rowNumber),
          escapeCsv(r.patientCode),
          escapeCsv(r.fullName),
          escapeCsv(r.status),
          escapeCsv((r.errors ?? []).join(" | ")),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patients_import_errors_${Date.now()}.csv`;
    a.click();
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
      await patientsQuery.refetch();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to apply import batch"));
    }
  };

  const handleImportPatients = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!importDateFormat) {
      toast.error("Choose import date format first (DD/MM/YYYY or MM/DD/YYYY)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const XLSX = await loadXlsx();
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const normalizeString = (value: any) => String(value ?? "").trim();
        const extractServiceTypeFromSheetName = (sheetName: string) => {
          const normalizedSheetName = normalizeString(sheetName).toUpperCase();
          const match = normalizedSheetName.match(/^([ABCD])(?:[\s_\-|].*|$)/);
          if (!match) return "";
          return match[1];
        };
        const extractDoctorFromSheetName = (sheetName: string) => {
          const raw = normalizeString(sheetName);
          if (!raw) return "";
          const tokens = raw.split(/[\s_\-|]+/).map((t) => t.trim()).filter(Boolean);
          if (tokens.length === 0) return "";
          const maybeServiceLetter = tokens[0].toUpperCase();
          if (["A", "B", "C", "D"].includes(maybeServiceLetter)) {
            return tokens.slice(1).join(" ").trim();
          }
          return raw;
        };
        const rowsWithSheetName = workbook.SheetNames.flatMap((name) => {
          const worksheet = workbook.Sheets[name];
          if (!worksheet) return [] as Array<Record<string, unknown> & { __sheetName: string }>;
          const rows = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;
          return rows.map((row) => ({ ...row, __sheetName: name }));
        });

        const preferredSlashOrder: "DMY" | "MDY" = importDateFormat;

        const normalizeCode = (value: any) => {
          const raw = normalizeString(value);
          if (!raw) return "";
          if (/^\d+$/.test(raw)) {
            return raw.padStart(4, "0");
          }
          return raw;
        };
        const normalizeDate = (value: any) => {
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
          const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (match) {
            const p1 = Number(match[1]);
            const p2 = Number(match[2]);
            let dd = 0;
            let mm = 0;
            if (p1 > 12 && p2 >= 1 && p2 <= 12) {
              dd = p1;
              mm = p2;
            } else if (p2 > 12 && p1 >= 1 && p1 <= 12) {
              mm = p1;
              dd = p2;
            } else if (preferredSlashOrder === "MDY") {
              mm = p1;
              dd = p2;
            } else {
              dd = p1;
              mm = p2;
            }
            if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return "";
            const yyyy = match[3];
            return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
          }
          const iso = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
          if (iso) {
            const yyyy = iso[1];
            const mm = iso[2].padStart(2, "0");
            const dd = iso[3].padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
          }
          return "";
        };
        const parseServiceType = (raw: string) => {
          const v = raw.trim().toLowerCase();
          if (!v) return undefined as any;
          if (v === "a" || v === "استشاري" || v === "consultant" || v === "1") return "consultant";
          if (v === "b" || v === "اخصائي" || v === "أخصائي" || v === "specialist") return "specialist";
          if (v === "c" || v === "فحوصات الليزك" || v === "lasik") return "lasik";
          if (v === "d" || v === "خارجي" || v === "external" || v === "2") return "external";
          return undefined as any;
        };
        const readRowValue = (row: any, keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
              return row[key];
            }
          }
          return "";
        };

        const importedPatients = rowsWithSheetName.map((row: any) => {
          const patientCode =
            row.patientCode ||
            row.id ||
            row.ID ||
            row["Patient ID"] ||
            row["رقم المريض"] ||
            row["كود المريض"] ||
            "";
          const fullName =
            row.fullName ||
            row.name ||
            row["اسم المريض"] ||
            "";
          const phone =
            row.phone ||
            row["تليفون منزل"] ||
            row["تليفون"] ||
            row["موبايل"] ||
            row["الموبايل"] ||
            row["هاتف"] ||
            "";
          const ageRaw = row.age ?? row["السن"];
          const ageNum = (() => {
            if (ageRaw === null || ageRaw === undefined || ageRaw === "") return undefined;
            const cleaned = String(ageRaw).replace(/[^\d]/g, "");
            if (!cleaned) return undefined;
            const n = Number(cleaned);
            return Number.isFinite(n) ? n : undefined;
          })();
          const dateOfBirth = normalizeDate(row.dateOfBirth ?? row["تاريخ الميلاد"]);
          const rawGender = normalizeString(row.gender ?? row["النوع"]);
          const gender =
            rawGender === "ذكر" || rawGender.toLowerCase() === "male"
              ? "male"
              : rawGender === "أنثى" || rawGender === "انثى" || rawGender.toLowerCase() === "female"
              ? "female"
              : "";
          const nationalId = row.nationalId ?? "";
          const address = row.address ?? row["العنوان"];
          const serviceRaw = normalizeString(
            readRowValue(row, [
              "serviceCode",
              "service_code",
              "serviceType",
              "service_type",
              "Service Code",
              "Service Type",
              "كود الخدمة",
              "نوع الخدمة",
            ])
          );
          const legacyServiceRaw = normalizeString(row["رقم الهوية"] || "");
          const serviceFromSheetName = extractServiceTypeFromSheetName(String(row.__sheetName ?? ""));
          const resolvedServiceRaw = serviceRaw || legacyServiceRaw || serviceFromSheetName;
          const doctorFromRow = normalizeString(
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
            ])
          );
          const doctorFromSheetName = extractDoctorFromSheetName(String(row.__sheetName ?? ""));
          const doctorToken = doctorFromRow || doctorFromSheetName;
          const lastVisit = normalizeDate(row["تاريخ فتح الملف"] ?? row["تاريخ الملف"]);
          const resolvedServiceType = parseServiceType(resolvedServiceRaw);
          const locationType = resolvedServiceType === "external" ? "external" : "center";
          return {
            patientCode: normalizeCode(patientCode),
            fullName: normalizeString(fullName),
            phone: normalizeString(phone),
            age: ageNum,
            dateOfBirth,
            gender: normalizeString(gender),
            nationalId: normalizeString(nationalId),
            address: normalizeString(address),
            serviceType: resolvedServiceType,
            locationType,
            doctorToken,
            lastVisit,
          };
        });

        const runImport = async () => {
          const stageRows = importedPatients.map((p, idx) => ({
            rowNumber: idx + 2,
            patientCode: p.patientCode || "",
            fullName: p.fullName || "",
            dateOfBirth: p.dateOfBirth || "",
            gender: (p.gender === "male" || p.gender === "female" ? p.gender : "") as "" | "male" | "female",
            phone: p.phone || "",
            address: p.address || "",
            branch: "examinations" as const,
            serviceType: (p.serviceType as any) || "consultant",
            locationType: (p.locationType as any) || "center",
            doctorCode: String((p as any).doctorToken ?? ""),
            doctorName: String((p as any).doctorToken ?? ""),
          }));
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
        };
        runImport().catch((error) =>
          toast.error(getTrpcErrorMessage(error, "خطأ في استيراد الملف"))
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        toast.error(getTrpcErrorMessage(error, "خطأ في استيراد الملف"));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdatePatient = async (patientId: number, updates: any) => {
    if (!updates.fullName?.trim()) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    if (!updates.phone?.trim()) {
      toast.error("رقم الهاتف مطلوب");
      return;
    }

    try {
      await updatePatientMutation.mutateAsync({
        patientId,
        updates,
      });
      toast.success("تم تحديث بيانات المريض");
      return true;
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث المريض");
      return false;
    }
  };

  const handleDeletePatient = async (patientId: number) => {
    if (!window.confirm("هل أنت متأكد من حذف المريض؟")) return;
    try {
      await deletePatientMutation.mutateAsync({ patientId });
      toast.success("تم حذف المريض");
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف المريض");
    }
  };

  const handleSavePatientFromForm = async (
    selectedPatient: any,
    patientDraft: any,
    selectedDoctorId: string,
    selectedSheetType: string,
    toLegacyServiceType: (value: string) => any
  ) => {
    if (!patientDraft.fullName.trim()) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    if (!patientDraft.phone.trim()) {
      toast.error("رقم الهاتف مطلوب");
      return;
    }

    if (selectedPatient?.id) {
      await updatePatientMutation.mutateAsync({
        patientId: selectedPatient.id,
        updates: {
          patientCode: patientDraft.patientCode.trim(),
          fullName: patientDraft.fullName.trim(),
          phone: patientDraft.phone.trim(),
          age: patientDraft.age ? Number(patientDraft.age) : undefined,
          dateOfBirth: patientDraft.dateOfBirth || undefined,
          address: patientDraft.address.trim(),
          occupation: patientDraft.occupation.trim(),
        },
      });
      toast.success("تم تحديث بيانات المريض");
      await patientsQuery.refetch();
      return;
    }

    const selectedDoctor = (await utils.medical.getDoctorDirectory.fetch())
      .filter((doctor: any) => doctor.isActive !== false)
      .find((doctor: any) => String(doctor.id) === String(selectedDoctorId));
    
    const selectedDoctorCode = String(selectedDoctor?.code ?? "").trim();
    const selectedDoctorIdNumeric = Number(selectedDoctorId);
    
    await createPatientMutation.mutateAsync({
      patientCode: patientDraft.patientCode.trim() || undefined,
      fullName: patientDraft.fullName.trim(),
      phone: patientDraft.phone.trim(),
      age: patientDraft.age ? Number(patientDraft.age) : undefined,
      dateOfBirth: patientDraft.dateOfBirth || undefined,
      address: patientDraft.address.trim(),
      occupation: patientDraft.occupation.trim(),
      branch: "examinations",
      serviceType: toLegacyServiceType(selectedSheetType || "consultant"),
      doctorId: Number.isFinite(selectedDoctorIdNumeric) ? selectedDoctorIdNumeric : undefined,
      ...(selectedDoctorCode ? { doctorCode: selectedDoctorCode } : {}),
    });
    toast.success("تم إضافة المريض");
  };

  return {
    createPatientMutation,
    updatePatientMutation,
    deletePatientMutation,
    saveSheetMutation,
    savePatientStateMutation,
    bulkAssignSheetMutation,
    stageImportMutation,
    applyImportMutation,
    downloadInvalidImportCsv,
    applyStagedImport,
    handleImportPatients,
    handleUpdatePatient,
    handleDeletePatient,
    handleSavePatientFromForm,
    importDateFormat,
    setImportDateFormat,
    importBatchId,
    setImportBatchId,
    importSummary,
    setImportSummary,
    importPreviewRows,
    setImportPreviewRows,
    importPreviewOpen,
    setImportPreviewOpen,
    fileInputRef,
  };
}
