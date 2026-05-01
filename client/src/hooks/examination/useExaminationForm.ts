import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface DoctorOption {
  id: string;
  username?: string;
  name: string;
  code: string;
  isActive?: boolean;
  locationType?: "center" | "external";
  doctorType?: "consultant" | "specialist" | "external";
}

const normalizeMappingCode = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const westernDigits = raw
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const noDecimal = westernDigits.replace(/\.0+$/, "");
  const compact = noDecimal.replace(/\s+/g, "").toLowerCase();
  if (/^\d+$/.test(compact)) {
    const stripped = compact.replace(/^0+/, "");
    return stripped || "0";
  }
  return compact;
};

export const normalizeDoctorTypeToSheet = (value: unknown): "consultant" | "specialist" | "external" | "" => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "consultant" || raw === "consa" || raw === "cons") return "consultant";
  if (raw === "specialist" || raw === "spec") return "specialist";
  if (raw === "external" || raw.includes("خار")) return "external";
  if (raw.includes("consult")) return "consultant";
  if (raw.includes("special")) return "specialist";
  return "";
};

export type UseExaminationFormOptions = {
  /** حوار من لوحة التحكم: لا يقرأ `patientId` من المسار، ولا يعيد التوجيه بعد الحفظ */
  embedded?: boolean;
  onEmbeddedClose?: () => void;
};

export function useExaminationForm(
  patientDataEditPermission: string,
  options?: UseExaminationFormOptions,
) {
  const embedded = Boolean(options?.embedded);
  const onEmbeddedClose = options?.onEmbeddedClose;
  const EXAM_AUTO_SAVE_ENABLED = false;
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/examination/:id");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [receptionSignature, setReceptionSignature] = useState("");
  const [nurseSignature, setNurseSignature] = useState("");
  const [technicianSignature, setTechnicianSignature] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [sheetSelection, setSheetSelection] = useState("");
  const [isFollowup, setIsFollowup] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    id: 0,
    name: "",
    code: "",
  });
  const [patientDetails, setPatientDetails] = useState({
    dateOfBirth: "",
    age: "",
    address: "",
    phone: "",
    job: "",
  });
  const [locationType, setLocationType] = useState<"center" | "external">("center");
  const lastAgeSyncRef = useRef<"dob" | "age" | null>(null);
  const [medicalChecklist, setMedicalChecklist] = useState({
    generalDiseases: false,
    pregnancyOrLactation: false,
    usesAllergySupplementsSteroidsOrPressureMeds: false,
    acneTreatment: false,
    familyKeratoconus: false,
    usesTearSubstituteOrExcessTearsOrSandySensation: false,
    symptomsWorseWithAirOrAC: false,
    glaucomaTreatment: false,
  });

  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientInfo.id ?? 0, page: "examination" },
    { enabled: Boolean(patientInfo.id), refetchOnWindowFocus: false }
  );
  const serviceDirectoryQuery = trpc.medical.getServiceDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const doctorServiceMatchQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "doctor_service_sheet_match_v1" },
    { refetchOnWindowFocus: false }
  );
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const doctorsQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  const patientStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedPatientStateRef = useRef<number | null>(null);

  const [examData, setExamData] = useState<{
    autorefraction: {
      od: { s: string; c: string; axis: string; s1: string; c1: string; a1: string; s2: string; c2: string; a2: string; s3: string; c3: string; a3: string; afterS: string; afterC: string; afterA: string; ucva: string; bcva: string; iop: string; airPuff1: string; airPuff2: string; airPuff3: string };
      os: { s: string; c: string; axis: string; s1: string; c1: string; a1: string; s2: string; c2: string; a2: string; s3: string; c3: string; a3: string; afterS: string; afterC: string; afterA: string; ucva: string; bcva: string; iop: string; airPuff1: string; airPuff2: string; airPuff3: string };
    };
    glasses: {
      od: { s: string; c: string; axis: string; pd: string };
      os: { s: string; c: string; axis: string; pd: string };
    };
    pentacam: {
      od: { k1: string; k2: string; ax1: string; ax2: string; thinnest: string; apex: string; residual: string; ttt: string; ablation: string };
      os: { k1: string; k2: string; ax1: string; ax2: string; thinnest: string; apex: string; residual: string; ttt: string; ablation: string };
    };
  }>({
    autorefraction: {
      od: { s: "", c: "", axis: "", s1: "", c1: "", a1: "", s2: "", c2: "", a2: "", s3: "", c3: "", a3: "", afterS: "", afterC: "", afterA: "", ucva: "", bcva: "", iop: "", airPuff1: "", airPuff2: "", airPuff3: "" },
      os: { s: "", c: "", axis: "", s1: "", c1: "", a1: "", s2: "", c2: "", a2: "", s3: "", c3: "", a3: "", afterS: "", afterC: "", afterA: "", ucva: "", bcva: "", iop: "", airPuff1: "", airPuff2: "", airPuff3: "" },
    },
    glasses: {
      od: { s: "", c: "", axis: "", pd: "" },
      os: { s: "", c: "", axis: "", pd: "" },
    },
    pentacam: {
      od: { k1: "", k2: "", ax1: "", ax2: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" },
      os: { k1: "", k2: "", ax1: "", ax2: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" },
    },
  });

  const [refractionTableData, setRefractionTableData] = useState({
    od: { s: "", c: "", a: "", pd: "" },
    os: { s: "", c: "", a: "", pd: "" },
  });

  const saveExamMutation = trpc.medical.saveExaminationForm.useMutation();
  const linkPatientServiceToMssqlMutation = trpc.medical.linkPatientServiceToMssql.useMutation();
  const updatePatientMutation = trpc.medical.updatePatient.useMutation({
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ بيانات المريض"));
    },
  });
  const createPatientFromExamMutation = trpc.medical.createPatientFromExamination.useMutation({
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل إنشاء مريض جديد"));
    },
  });
  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation();
  const utils = trpc.useUtils();
  const lastSyncedRef = useRef<Record<string, string>>({});

  const hasPatient = Boolean(patientInfo.id);
  const normalizedRole = String((user as any)?.role ?? "").toLowerCase();
  const myPermissions = (permissionsQuery.data ?? []) as string[];
  const receptionHasPatientEditPermission =
    normalizedRole === "reception" &&
    myPermissions.includes(patientDataEditPermission);
  const canEditPatientData = normalizedRole === "admin" || receptionHasPatientEditPermission;
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [serviceCode, setServiceCode] = useState("");
  const [serviceQty, setServiceQty] = useState("2");
  const currentUserDisplayName = String((user as any)?.name ?? (user as any)?.username ?? "").trim();
  const mobileExamInputClass = "h-10 text-sm text-center border-input";
  const desktopVisionSelectClass = "h-7 w-28 text-sm text-center tabular-nums border-input";
  const desktopRefractionInputClass = "h-7 w-24 text-sm text-center tabular-nums border-input";

  // Route param -> patient id (لا يُستخدم داخل حوار مضمّن)
  useEffect(() => {
    if (embedded) return;
    const routeId = Number((routeParams as any)?.id ?? 0);
    if (!Number.isFinite(routeId) || routeId <= 0) return;
    setPatientInfo((prev) => (prev.id === routeId ? prev : { ...prev, id: routeId }));
  }, [routeParams, embedded]);

  // Mobile viewport detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobileViewport(mq.matches);
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  // Auto-fill signatures based on logged-in user role
  useEffect(() => {
    if (!currentUserDisplayName) return;
    const role = String((user as any)?.role ?? "").toLowerCase();
    if (role === "reception") {
      setReceptionSignature((prev) => prev || currentUserDisplayName);
      return;
    }
    if (role === "nurse") {
      setNurseSignature((prev) => prev || currentUserDisplayName);
      return;
    }
    if (role === "technician") {
      setTechnicianSignature((prev) => prev || currentUserDisplayName);
      return;
    }
    if (role === "doctor") {
      setDoctorName((prev) => prev || currentUserDisplayName);
    }
  }, [currentUserDisplayName, (user as any)?.role]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const doctors = (doctorsQuery.data ?? []) as DoctorOption[];

  const availableDoctors = useMemo(
    () => {
      const selectedSheet = String(sheetSelection ?? "").trim().toLowerCase();
      const targetDoctorType =
        selectedSheet === "consultant" || selectedSheet === "specialist" || selectedSheet === "external"
          ? selectedSheet
          : "";
      return doctors.filter((doctor) => {
        if (doctor.isActive === false) return false;
        if (doctor.locationType ? doctor.locationType !== locationType : locationType !== "center") return false;
        if (!targetDoctorType) return true;
        return String(doctor.doctorType ?? "").trim().toLowerCase() === targetDoctorType;
      });
    },
    [doctors, locationType, sheetSelection]
  );

  const doctorLookup = useMemo(() => {
    const map = new Map<string, string>();
    availableDoctors.forEach((doctor) => {
      const name = (doctor.name || "").trim();
      const username = (doctor.username || "").trim();
      const code = (doctor.code || "").trim();
      if (doctor.isActive === false) return;
      if (name) map.set(name.toLowerCase(), name);
      if (username) map.set(username.toLowerCase(), name || username);
      if (code) map.set(code.toLowerCase(), name || code);
    });
    return map;
  }, [availableDoctors]);

  const selectedDoctorEntry = useMemo(() => {
    const normalized = String(doctorName ?? "").trim().toLowerCase();
    if (!normalized) return null;
    return (
      availableDoctors.find((doctor) => {
        const name = String(doctor.name ?? "").trim().toLowerCase();
        const code = String(doctor.code ?? "").trim().toLowerCase();
        const username = String(doctor.username ?? "").trim().toLowerCase();
        return normalized === name || normalized === code || (username && normalized === username);
      }) ?? null
    );
  }, [availableDoctors, doctorName]);

  // Auto-set sheet type from selected doctor
  useEffect(() => {
    if (!selectedDoctorEntry || sheetSelection) return;
    const defaultSheet = normalizeDoctorTypeToSheet((selectedDoctorEntry as any)?.doctorType ?? "");
    if (defaultSheet) setSheetSelection(defaultSheet);
  }, [selectedDoctorEntry, sheetSelection]);

  const serviceOptions = useMemo(() => {
    const list = Array.isArray(serviceDirectoryQuery.data) ? (serviceDirectoryQuery.data as any[]) : [];
    const normalized = list
      .filter((item) => item && item.isActive !== false)
      .map((item) => ({
        code: String(item.code ?? "").trim(),
        normalizedCode: normalizeMappingCode(item.code),
        name: String(item.name ?? "").trim(),
        serviceType: String(item.serviceType ?? "").trim().toLowerCase(),
      }))
      .filter((item) => item.code && item.name);
    const selectedDoctorCode = normalizeMappingCode((selectedDoctorEntry as any)?.code ?? "");
    if (!selectedDoctorCode) return normalized;

    const rawMatches = (doctorServiceMatchQuery.data as any)?.value;
    const rows = Array.isArray(rawMatches) ? rawMatches : [];
    const allowedServiceCodes = new Set(
      rows
        .map((row: any) => ({
          doctorCode: normalizeMappingCode(row?.doctorCode),
          serviceCode: normalizeMappingCode(row?.serviceCode),
          isActive: row?.isActive !== false,
        }))
        .filter((row) => row.isActive !== false)
        .filter((row) => row.doctorCode === selectedDoctorCode)
        .map((row) => row.serviceCode)
    );
    if (allowedServiceCodes.size === 0) return [];
    return normalized.filter((item) => allowedServiceCodes.has(item.normalizedCode));
  }, [doctorServiceMatchQuery.data, serviceDirectoryQuery.data, selectedDoctorEntry]);

  const selectedServiceOption = useMemo(
    () => serviceOptions.find((item) => item.code === serviceCode) ?? null,
    [serviceOptions, serviceCode]
  );

  // Clear serviceCode if no longer in options
  useEffect(() => {
    if (!serviceCode) return;
    if (!serviceOptions.some((item) => item.code === serviceCode)) {
      setServiceCode("");
    }
  }, [serviceCode, serviceOptions]);

  const isPentacamService = useMemo(() => {
    const code = String(selectedServiceOption?.code ?? serviceCode ?? "").trim().toLowerCase();
    const name = String(selectedServiceOption?.name ?? "").trim().toLowerCase();
    if (!code && !name) return false;
    return (
      code === "1501" ||
      code.includes("pentacam") ||
      name.includes("pentacam") ||
      name.includes("بنتاكام")
    );
  }, [selectedServiceOption, serviceCode]);

  // Auto-set sheet type based on selected service code
  useEffect(() => {
    if (!serviceCode || !serviceDirectoryQuery.data) return;
    const allServices = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    const selectedService = (allServices as any[]).find((s) => String(s.code ?? "").trim() === serviceCode);
    if (selectedService) {
      const srvType = String(selectedService.serviceType ?? "").trim().toLowerCase();
      if (srvType && ["consultant", "specialist", "lasik", "surgery", "external"].includes(srvType)) {
        console.log(`Auto-setting sheet type to "${srvType}" for service code ${serviceCode}`);
        setSheetSelection(srvType);
      }
    }
  }, [serviceCode, serviceDirectoryQuery.data]);

  const digitsOnly = (value: string) => value.replace(/\D+/g, "");

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientInfo.id,
    { enabled: Boolean(patientInfo.id), refetchOnWindowFocus: false }
  );

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    patientCode?: string | null;
  }) => {
    setPatientInfo({
      id: patient.id,
      name: patient.fullName ?? "",
      code: patient.patientCode ?? "",
    });
    setExamData({
      autorefraction: {
        od: { s: "", c: "", axis: "", s1: "", c1: "", a1: "", s2: "", c2: "", a2: "", s3: "", c3: "", a3: "", afterS: "", afterC: "", afterA: "", ucva: "", bcva: "", iop: "", airPuff1: "", airPuff2: "", airPuff3: "" },
        os: { s: "", c: "", axis: "", s1: "", c1: "", a1: "", s2: "", c2: "", a2: "", s3: "", c3: "", a3: "", afterS: "", afterC: "", afterA: "", ucva: "", bcva: "", iop: "", airPuff1: "", airPuff2: "", airPuff3: "" },
      },
      glasses: {
        od: { s: "", c: "", axis: "", pd: "" },
        os: { s: "", c: "", axis: "", pd: "" },
      },
      pentacam: {
        od: { k1: "", k2: "", ax1: "", ax2: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" },
        os: { k1: "", k2: "", ax1: "", ax2: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" },
      },
    });
    lastSyncedRef.current = {};
  };

  // Load patient data from query
  useEffect(() => {
    if (!patientQuery.data) return;
    const data = patientQuery.data as any;
    setPatientInfo((prev) => ({
      ...prev,
      name: data.fullName ?? prev.name,
      code: data.patientCode ?? prev.code,
    }));

    const formatDateForInput = (dateInput: any): string => {
      try {
        if (!dateInput) return "";
        if (dateInput instanceof Date) {
          const yyyy = dateInput.getUTCFullYear();
          const mm = String(dateInput.getUTCMonth() + 1).padStart(2, "0");
          const dd = String(dateInput.getUTCDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }
        const str = String(dateInput).trim();
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          const [, yyyy, mm, dd] = isoMatch;
          return `${yyyy}-${mm}-${dd}`;
        }
        return "";
      } catch {
        return "";
      }
    };

    const formattedDOB = formatDateForInput(data.dateOfBirth);
    setPatientDetails({
      dateOfBirth: formattedDOB,
      age: data.age != null ? String(data.age) : "",
      address: data.address ?? "",
      phone: data.phone ?? "",
      job: data.occupation ?? "",
    });
    if (data.locationType) {
      setLocationType(data.locationType === "external" ? "external" : "center");
    }
    if (data.lastVisit) {
      const examDate = new Date(data.lastVisit);
      const examDateStr = formatDateForInput(examDate);
      setVisitDate(examDateStr);
      console.log("ExaminationForm visitDate from lastVisit:", examDateStr);
    } else {
      setVisitDate(new Date().toISOString().split("T")[0]);
    }
  }, [patientQuery.data]);

  // DOB -> age sync
  useEffect(() => {
    if (!patientDetails.dateOfBirth) return;
    if (lastAgeSyncRef.current === "age") {
      lastAgeSyncRef.current = null;
      return;
    }
    const dob = new Date(patientDetails.dateOfBirth);
    if (Number.isNaN(dob.valueOf())) return;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    lastAgeSyncRef.current = "dob";
    setPatientDetails((prev) => ({
      ...prev,
      age: Number.isFinite(age) && age >= 0 ? String(age) : prev.age,
    }));
  }, [patientDetails.dateOfBirth]);

  // Age -> DOB sync
  useEffect(() => {
    if (!patientDetails.age) return;
    if (lastAgeSyncRef.current === "dob") {
      lastAgeSyncRef.current = null;
      return;
    }
    const ageNum = Number(patientDetails.age);
    if (!Number.isFinite(ageNum) || ageNum < 0) return;
    const today = new Date();
    const year = today.getFullYear() - ageNum;
    const month = today.getMonth();
    const day = today.getDate();
    const inferred = new Date(year, month, day);
    const yyyy = inferred.getFullYear();
    const mm = String(inferred.getMonth() + 1).padStart(2, "0");
    const dd = String(inferred.getDate()).padStart(2, "0");
    const formatted = `${yyyy}-${mm}-${dd}`;
    lastAgeSyncRef.current = "age";
    setPatientDetails((prev) => ({
      ...prev,
      dateOfBirth: prev.dateOfBirth || formatted,
    }));
  }, [patientDetails.age]);

  // Load cached patient state from localStorage
  useEffect(() => {
    if (!patientInfo.id) return;
    const raw = localStorage.getItem(`patient_state_examination_${patientInfo.id}`);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.sheetSelection) setSheetSelection(data.sheetSelection);
      if (data.visitDate) setVisitDate(data.visitDate);
      if (data.doctorName !== undefined) setDoctorName(data.doctorName ?? "");
      if (data.serviceCode !== undefined) setServiceCode(String(data.serviceCode ?? ""));
      if (data.serviceQty !== undefined) setServiceQty(String(data.serviceQty ?? "2"));
      if (data.medicalChecklist) {
        setMedicalChecklist((prev) => ({ ...prev, ...data.medicalChecklist }));
      }
      if (typeof data.isFollowup === "boolean") {
        setIsFollowup(data.isFollowup);
      }
    } catch {
      // ignore bad cache
    }
  }, [patientInfo.id]);

  // Reset hydration flag on patient change
  useEffect(() => {
    hydratedPatientStateRef.current = null;
  }, [patientInfo.id]);

  // Hydrate from server patient state
  useEffect(() => {
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === patientInfo.id) return;
    if (data.sheetSelection) setSheetSelection(data.sheetSelection);
    if (data.visitDate) setVisitDate(data.visitDate);
    if (data.doctorName !== undefined) setDoctorName(data.doctorName ?? "");
    if (data.serviceCode !== undefined) setServiceCode(String(data.serviceCode ?? ""));
    if (data.serviceQty !== undefined) setServiceQty(String(data.serviceQty ?? "2"));
    if (data.medicalChecklist) {
      setMedicalChecklist((prev) => ({ ...prev, ...data.medicalChecklist }));
    }
    if (typeof data.isFollowup === "boolean") {
      setIsFollowup(data.isFollowup);
    }
    hydratedPatientStateRef.current = patientInfo.id;
  }, [patientStateQuery.data, patientInfo.id]);

  // Auto-save patient state (debounced)
  useEffect(() => {
    if (!EXAM_AUTO_SAVE_ENABLED) return;
    if (!patientInfo.id) return;
    if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    const payload = {
      sheetSelection,
      visitDate,
      doctorName,
      serviceCode,
      serviceQty,
      medicalChecklist,
      isFollowup,
    };
    localStorage.setItem(`patient_state_examination_${patientInfo.id}`, JSON.stringify(payload));
    patientStateTimerRef.current = setTimeout(() => {
      savePatientStateMutation.mutate({ patientId: patientInfo.id, page: "examination", data: payload });
    }, 800);
    return () => {
      if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    };
  }, [EXAM_AUTO_SAVE_ENABLED, patientInfo.id, sheetSelection, visitDate, doctorName, serviceCode, serviceQty, medicalChecklist, isFollowup, savePatientStateMutation]);

  // Duplicate patientDetails load from patientQuery (preserved from original)
  useEffect(() => {
    if (!patientQuery.data) return;
    const patient = patientQuery.data as any;
    setPatientDetails({
      dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "",
      age: patient.age != null ? String(patient.age) : "",
      address: patient.address ?? "",
      phone: patient.phone ?? "",
      job: patient.occupation ?? "",
    });
  }, [patientQuery.data]);

  // Auto-save sheet entries (debounced)
  useEffect(() => {
    if (!EXAM_AUTO_SAVE_ENABLED) return;
    if (!patientInfo.id) return;
    const serialized = JSON.stringify({
      patient: {
        name: patientInfo.name,
        code: patientInfo.code,
        dateOfBirth: patientDetails.dateOfBirth,
        age: patientDetails.age,
        address: patientDetails.address,
        phone: patientDetails.phone,
        job: patientDetails.job,
      },
      medicalChecklist,
      examData,
      refractionTableData,
      signatures: {
        reception: receptionSignature,
        nurse: nurseSignature,
        technician: technicianSignature,
        doctor: doctorName,
      },
    });
    const sheetTypes: Array<"consultant" | "specialist" | "lasik" | "external"> = [
      "consultant",
      "specialist",
      "lasik",
      "external",
    ];

    const timeout = setTimeout(async () => {
      try {
        const pickValue = (next: string | undefined, prev?: string) =>
          next && String(next).trim() ? next : prev;

        await Promise.all(
          sheetTypes.map(async (sheetType) => {
            if (lastSyncedRef.current[sheetType] === serialized) return;
            const existingRaw = await utils.medical.getSheetEntry.fetch({
              patientId: patientInfo.id,
              sheetType,
            });
            let existing: any = {};
            try {
              existing = existingRaw ? JSON.parse(existingRaw) : {};
            } catch {
              existing = {};
            }

            const updated = {
              ...existing,
              patient: {
                name: patientInfo.name,
                code: patientInfo.code,
                dateOfBirth: patientDetails.dateOfBirth,
                age: patientDetails.age,
                address: patientDetails.address,
                phone: patientDetails.phone,
                job: patientDetails.job,
              },
              medicalChecklist,
              examData: {
                autorefraction: {
                  od: {
                    ...(existing.examData?.autorefraction?.od ?? {}),
                    s: pickValue(refractionTableData.od.s, existing.examData?.autorefraction?.od?.s),
                    c: pickValue(refractionTableData.od.c, existing.examData?.autorefraction?.od?.c),
                    axis: pickValue(refractionTableData.od.a, existing.examData?.autorefraction?.od?.axis),
                    pd: pickValue(refractionTableData.od.pd, (existing.examData?.autorefraction?.od as any)?.pd),
                    s1: pickValue((examData.autorefraction.od as any).s1, (existing.examData?.autorefraction?.od as any)?.s1),
                    c1: pickValue((examData.autorefraction.od as any).c1, (existing.examData?.autorefraction?.od as any)?.c1),
                    a1: pickValue((examData.autorefraction.od as any).a1, (existing.examData?.autorefraction?.od as any)?.a1),
                    s2: pickValue((examData.autorefraction.od as any).s2, (existing.examData?.autorefraction?.od as any)?.s2),
                    c2: pickValue((examData.autorefraction.od as any).c2, (existing.examData?.autorefraction?.od as any)?.c2),
                    a2: pickValue((examData.autorefraction.od as any).a2, (existing.examData?.autorefraction?.od as any)?.a2),
                    s3: pickValue((examData.autorefraction.od as any).s3, (existing.examData?.autorefraction?.od as any)?.s3),
                    c3: pickValue((examData.autorefraction.od as any).c3, (existing.examData?.autorefraction?.od as any)?.c3),
                    a3: pickValue((examData.autorefraction.od as any).a3, (existing.examData?.autorefraction?.od as any)?.a3),
                    afterS: pickValue((examData.autorefraction.od as any).afterS, (existing.examData?.autorefraction?.od as any)?.afterS),
                    afterC: pickValue((examData.autorefraction.od as any).afterC, (existing.examData?.autorefraction?.od as any)?.afterC),
                    afterA: pickValue((examData.autorefraction.od as any).afterA, (existing.examData?.autorefraction?.od as any)?.afterA),
                    ucva: pickValue(examData.autorefraction.od.ucva, existing.examData?.autorefraction?.od?.ucva),
                    bcva: pickValue(examData.autorefraction.od.bcva, existing.examData?.autorefraction?.od?.bcva),
                    iop: pickValue(examData.autorefraction.od.iop, existing.examData?.autorefraction?.od?.iop),
                    airPuff1: pickValue((examData.autorefraction.od as any).airPuff1, (existing.examData?.autorefraction?.od as any)?.airPuff1),
                    airPuff2: pickValue((examData.autorefraction.od as any).airPuff2, (existing.examData?.autorefraction?.od as any)?.airPuff2),
                    airPuff3: pickValue((examData.autorefraction.od as any).airPuff3, (existing.examData?.autorefraction?.od as any)?.airPuff3),
                  },
                  os: {
                    ...(existing.examData?.autorefraction?.os ?? {}),
                    s: pickValue(refractionTableData.os.s, existing.examData?.autorefraction?.os?.s),
                    c: pickValue(refractionTableData.os.c, existing.examData?.autorefraction?.os?.c),
                    axis: pickValue(refractionTableData.os.a, existing.examData?.autorefraction?.os?.axis),
                    pd: pickValue(refractionTableData.os.pd, (existing.examData?.autorefraction?.os as any)?.pd),
                    s1: pickValue((examData.autorefraction.os as any).s1, (existing.examData?.autorefraction?.os as any)?.s1),
                    c1: pickValue((examData.autorefraction.os as any).c1, (existing.examData?.autorefraction?.os as any)?.c1),
                    a1: pickValue((examData.autorefraction.os as any).a1, (existing.examData?.autorefraction?.os as any)?.a1),
                    s2: pickValue((examData.autorefraction.os as any).s2, (existing.examData?.autorefraction?.os as any)?.s2),
                    c2: pickValue((examData.autorefraction.os as any).c2, (existing.examData?.autorefraction?.os as any)?.c2),
                    a2: pickValue((examData.autorefraction.os as any).a2, (existing.examData?.autorefraction?.os as any)?.a2),
                    s3: pickValue((examData.autorefraction.os as any).s3, (existing.examData?.autorefraction?.os as any)?.s3),
                    c3: pickValue((examData.autorefraction.os as any).c3, (existing.examData?.autorefraction?.os as any)?.c3),
                    a3: pickValue((examData.autorefraction.os as any).a3, (existing.examData?.autorefraction?.os as any)?.a3),
                    afterS: pickValue((examData.autorefraction.os as any).afterS, (existing.examData?.autorefraction?.os as any)?.afterS),
                    afterC: pickValue((examData.autorefraction.os as any).afterC, (existing.examData?.autorefraction?.os as any)?.afterC),
                    afterA: pickValue((examData.autorefraction.os as any).afterA, (existing.examData?.autorefraction?.os as any)?.afterA),
                    ucva: pickValue(examData.autorefraction.os.ucva, existing.examData?.autorefraction?.os?.ucva),
                    bcva: pickValue(examData.autorefraction.os.bcva, existing.examData?.autorefraction?.os?.bcva),
                    iop: pickValue(examData.autorefraction.os.iop, existing.examData?.autorefraction?.os?.iop),
                    airPuff1: pickValue((examData.autorefraction.os as any).airPuff1, (existing.examData?.autorefraction?.os as any)?.airPuff1),
                    airPuff2: pickValue((examData.autorefraction.os as any).airPuff2, (existing.examData?.autorefraction?.os as any)?.airPuff2),
                    airPuff3: pickValue((examData.autorefraction.os as any).airPuff3, (existing.examData?.autorefraction?.os as any)?.airPuff3),
                  },
                },
                pentacam: {
                  od: {
                    ...(existing.examData?.pentacam?.od ?? {}),
                    k1: pickValue(examData.pentacam.od.k1, existing.examData?.pentacam?.od?.k1),
                    k2: pickValue(examData.pentacam.od.k2, existing.examData?.pentacam?.od?.k2),
                    ax1: pickValue(examData.pentacam.od.ax1, existing.examData?.pentacam?.od?.ax1),
                    ax2: pickValue(examData.pentacam.od.ax2, existing.examData?.pentacam?.od?.ax2),
                    thinnest: pickValue(examData.pentacam.od.thinnest, existing.examData?.pentacam?.od?.thinnest),
                    apex: pickValue(examData.pentacam.od.apex, existing.examData?.pentacam?.od?.apex),
                    residual: pickValue(examData.pentacam.od.residual, existing.examData?.pentacam?.od?.residual),
                    ttt: pickValue(examData.pentacam.od.ttt, existing.examData?.pentacam?.od?.ttt),
                    ablation: pickValue(examData.pentacam.od.ablation, existing.examData?.pentacam?.od?.ablation),
                  },
                  os: {
                    ...(existing.examData?.pentacam?.os ?? {}),
                    k1: pickValue(examData.pentacam.os.k1, existing.examData?.pentacam?.os?.k1),
                    k2: pickValue(examData.pentacam.os.k2, existing.examData?.pentacam?.os?.k2),
                    ax1: pickValue(examData.pentacam.os.ax1, existing.examData?.pentacam?.os?.ax1),
                    ax2: pickValue(examData.pentacam.os.ax2, existing.examData?.pentacam?.os?.ax2),
                    thinnest: pickValue(examData.pentacam.os.thinnest, existing.examData?.pentacam?.os?.thinnest),
                    apex: pickValue(examData.pentacam.os.apex, existing.examData?.pentacam?.os?.apex),
                    residual: pickValue(examData.pentacam.os.residual, existing.examData?.pentacam?.os?.residual),
                    ttt: pickValue(examData.pentacam.os.ttt, existing.examData?.pentacam?.os?.ttt),
                    ablation: pickValue(examData.pentacam.os.ablation, existing.examData?.pentacam?.os?.ablation),
                  },
                },
              },
              formData: {
                ...(existing.formData ?? {}),
                ucvaOD: pickValue(examData.autorefraction.od.ucva, existing.formData?.ucvaOD),
                ucvaOS: pickValue(examData.autorefraction.os.ucva, existing.formData?.ucvaOS),
                bcvaOD: pickValue(examData.autorefraction.od.bcva, existing.formData?.bcvaOD),
                bcvaOS: pickValue(examData.autorefraction.os.bcva, existing.formData?.bcvaOS),
                iopOD: pickValue(examData.autorefraction.od.iop, existing.formData?.iopOD),
                iopOS: pickValue(examData.autorefraction.os.iop, existing.formData?.iopOS),
                pdOD: pickValue(refractionTableData.od.pd, existing.formData?.pdOD),
                pdOS: pickValue(refractionTableData.os.pd, existing.formData?.pdOS),
                refractionOD: {
                  ...(existing.formData?.refractionOD ?? {}),
                  s: pickValue(refractionTableData.od.s, existing.formData?.refractionOD?.s),
                  c: pickValue(refractionTableData.od.c, existing.formData?.refractionOD?.c),
                  a: pickValue(refractionTableData.od.a, existing.formData?.refractionOD?.a),
                },
                refractionOS: {
                  ...(existing.formData?.refractionOS ?? {}),
                  s: pickValue(refractionTableData.os.s, existing.formData?.refractionOS?.s),
                  c: pickValue(refractionTableData.os.c, existing.formData?.refractionOS?.c),
                  a: pickValue(refractionTableData.os.a, existing.formData?.refractionOS?.a),
                },
              },
              signatures: {
                reception: receptionSignature,
                nurse: nurseSignature,
                technician: technicianSignature,
                doctor: doctorName,
              },
            };

            await saveSheetMutation.mutateAsync({
              patientId: patientInfo.id,
              sheetType,
              content: JSON.stringify(updated),
            });
            lastSyncedRef.current[sheetType] = serialized;
          })
        );
      } catch {
        // ignore sync errors
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [
    EXAM_AUTO_SAVE_ENABLED,
    examData,
    refractionTableData,
    patientInfo.id,
    patientInfo.name,
    patientInfo.code,
    patientDetails.dateOfBirth,
    patientDetails.age,
    patientDetails.address,
    patientDetails.phone,
    patientDetails.job,
    medicalChecklist,
    receptionSignature,
    nurseSignature,
    technicianSignature,
    doctorName,
    saveSheetMutation,
    utils.medical,
  ]);

  const syncSelectedSheets = async (
    patientId: number,
    sheetTypes: Array<"consultant" | "specialist" | "lasik" | "external">
  ) => {
    const pickValue = (next: string | undefined, prev?: string) =>
      next && String(next).trim() ? next : prev;

    await Promise.all(
      sheetTypes.map(async (sheetType) => {
        const existingRaw = await utils.medical.getSheetEntry.fetch({ patientId, sheetType });
        let existing: any = {};
        try {
          existing = existingRaw ? JSON.parse(existingRaw) : {};
        } catch {
          existing = {};
        }

        const updated = {
          ...existing,
          patient: {
            name: patientInfo.name,
            code: patientInfo.code,
            dateOfBirth: patientDetails.dateOfBirth,
            age: patientDetails.age,
            address: patientDetails.address,
            phone: patientDetails.phone,
            job: patientDetails.job,
          },
          medicalChecklist,
          examData: {
            autorefraction: {
              od: {
                ...(existing.examData?.autorefraction?.od ?? {}),
                s: pickValue(refractionTableData.od.s, existing.examData?.autorefraction?.od?.s),
                c: pickValue(refractionTableData.od.c, existing.examData?.autorefraction?.od?.c),
                axis: pickValue(refractionTableData.od.a, existing.examData?.autorefraction?.od?.axis),
                pd: pickValue(refractionTableData.od.pd, (existing.examData?.autorefraction?.od as any)?.pd),
                s1: pickValue((examData.autorefraction.od as any).s1, (existing.examData?.autorefraction?.od as any)?.s1),
                c1: pickValue((examData.autorefraction.od as any).c1, (existing.examData?.autorefraction?.od as any)?.c1),
                a1: pickValue((examData.autorefraction.od as any).a1, (existing.examData?.autorefraction?.od as any)?.a1),
                s2: pickValue((examData.autorefraction.od as any).s2, (existing.examData?.autorefraction?.od as any)?.s2),
                c2: pickValue((examData.autorefraction.od as any).c2, (existing.examData?.autorefraction?.od as any)?.c2),
                a2: pickValue((examData.autorefraction.od as any).a2, (existing.examData?.autorefraction?.od as any)?.a2),
                s3: pickValue((examData.autorefraction.od as any).s3, (existing.examData?.autorefraction?.od as any)?.s3),
                c3: pickValue((examData.autorefraction.od as any).c3, (existing.examData?.autorefraction?.od as any)?.c3),
                a3: pickValue((examData.autorefraction.od as any).a3, (existing.examData?.autorefraction?.od as any)?.a3),
                ucva: pickValue(examData.autorefraction.od.ucva, existing.examData?.autorefraction?.od?.ucva),
                bcva: pickValue(examData.autorefraction.od.bcva, existing.examData?.autorefraction?.od?.bcva),
                iop: pickValue(examData.autorefraction.od.iop, existing.examData?.autorefraction?.od?.iop),
                afterS: pickValue((examData.autorefraction.od as any).afterS, (existing.examData?.autorefraction?.od as any)?.afterS),
                afterC: pickValue((examData.autorefraction.od as any).afterC, (existing.examData?.autorefraction?.od as any)?.afterC),
                afterA: pickValue((examData.autorefraction.od as any).afterA, (existing.examData?.autorefraction?.od as any)?.afterA),
                airPuff1: pickValue((examData.autorefraction.od as any).airPuff1, (existing.examData?.autorefraction?.od as any)?.airPuff1),
                airPuff2: pickValue((examData.autorefraction.od as any).airPuff2, (existing.examData?.autorefraction?.od as any)?.airPuff2),
                airPuff3: pickValue((examData.autorefraction.od as any).airPuff3, (existing.examData?.autorefraction?.od as any)?.airPuff3),
              },
              os: {
                ...(existing.examData?.autorefraction?.os ?? {}),
                s: pickValue(refractionTableData.os.s, existing.examData?.autorefraction?.os?.s),
                c: pickValue(refractionTableData.os.c, existing.examData?.autorefraction?.os?.c),
                axis: pickValue(refractionTableData.os.a, existing.examData?.autorefraction?.os?.axis),
                pd: pickValue(refractionTableData.os.pd, (existing.examData?.autorefraction?.os as any)?.pd),
                s1: pickValue((examData.autorefraction.os as any).s1, (existing.examData?.autorefraction?.os as any)?.s1),
                c1: pickValue((examData.autorefraction.os as any).c1, (existing.examData?.autorefraction?.os as any)?.c1),
                a1: pickValue((examData.autorefraction.os as any).a1, (existing.examData?.autorefraction?.os as any)?.a1),
                s2: pickValue((examData.autorefraction.os as any).s2, (existing.examData?.autorefraction?.os as any)?.s2),
                c2: pickValue((examData.autorefraction.os as any).c2, (existing.examData?.autorefraction?.os as any)?.c2),
                a2: pickValue((examData.autorefraction.os as any).a2, (existing.examData?.autorefraction?.os as any)?.a2),
                s3: pickValue((examData.autorefraction.os as any).s3, (existing.examData?.autorefraction?.os as any)?.s3),
                c3: pickValue((examData.autorefraction.os as any).c3, (existing.examData?.autorefraction?.os as any)?.c3),
                a3: pickValue((examData.autorefraction.os as any).a3, (existing.examData?.autorefraction?.os as any)?.a3),
                ucva: pickValue(examData.autorefraction.os.ucva, existing.examData?.autorefraction?.os?.ucva),
                bcva: pickValue(examData.autorefraction.os.bcva, existing.examData?.autorefraction?.os?.bcva),
                iop: pickValue(examData.autorefraction.os.iop, existing.examData?.autorefraction?.os?.iop),
                afterS: pickValue((examData.autorefraction.os as any).afterS, (existing.examData?.autorefraction?.os as any)?.afterS),
                afterC: pickValue((examData.autorefraction.os as any).afterC, (existing.examData?.autorefraction?.os as any)?.afterC),
                afterA: pickValue((examData.autorefraction.os as any).afterA, (existing.examData?.autorefraction?.os as any)?.afterA),
                airPuff1: pickValue((examData.autorefraction.os as any).airPuff1, (existing.examData?.autorefraction?.os as any)?.airPuff1),
                airPuff2: pickValue((examData.autorefraction.os as any).airPuff2, (existing.examData?.autorefraction?.os as any)?.airPuff2),
                airPuff3: pickValue((examData.autorefraction.os as any).airPuff3, (existing.examData?.autorefraction?.os as any)?.airPuff3),
              },
            },
            pentacam: {
              od: {
                ...(existing.examData?.pentacam?.od ?? {}),
                k1: pickValue(examData.pentacam.od.k1, existing.examData?.pentacam?.od?.k1),
                k2: pickValue(examData.pentacam.od.k2, existing.examData?.pentacam?.od?.k2),
                ax1: pickValue(examData.pentacam.od.ax1, existing.examData?.pentacam?.od?.ax1),
                ax2: pickValue(examData.pentacam.od.ax2, existing.examData?.pentacam?.od?.ax2),
                thinnest: pickValue(examData.pentacam.od.thinnest, existing.examData?.pentacam?.od?.thinnest),
                apex: pickValue(examData.pentacam.od.apex, existing.examData?.pentacam?.od?.apex),
                residual: pickValue(examData.pentacam.od.residual, existing.examData?.pentacam?.od?.residual),
                ttt: pickValue(examData.pentacam.od.ttt, existing.examData?.pentacam?.od?.ttt),
                ablation: pickValue(examData.pentacam.od.ablation, existing.examData?.pentacam?.od?.ablation),
              },
              os: {
                ...(existing.examData?.pentacam?.os ?? {}),
                k1: pickValue(examData.pentacam.os.k1, existing.examData?.pentacam?.os?.k1),
                k2: pickValue(examData.pentacam.os.k2, existing.examData?.pentacam?.os?.k2),
                ax1: pickValue(examData.pentacam.os.ax1, existing.examData?.pentacam?.os?.ax1),
                ax2: pickValue(examData.pentacam.os.ax2, existing.examData?.pentacam?.os?.ax2),
                thinnest: pickValue(examData.pentacam.os.thinnest, existing.examData?.pentacam?.os?.thinnest),
                apex: pickValue(examData.pentacam.os.apex, existing.examData?.pentacam?.os?.apex),
                residual: pickValue(examData.pentacam.os.residual, existing.examData?.pentacam?.os?.residual),
                ttt: pickValue(examData.pentacam.os.ttt, existing.examData?.pentacam?.os?.ttt),
                ablation: pickValue(examData.pentacam.os.ablation, existing.examData?.pentacam?.os?.ablation),
              },
            },
          },
          formData: {
            ...(existing.formData ?? {}),
            ucvaOD: pickValue(examData.autorefraction.od.ucva, existing.formData?.ucvaOD),
            ucvaOS: pickValue(examData.autorefraction.os.ucva, existing.formData?.ucvaOS),
            bcvaOD: pickValue(examData.autorefraction.od.bcva, existing.formData?.bcvaOD),
            bcvaOS: pickValue(examData.autorefraction.os.bcva, existing.formData?.bcvaOS),
            iopOD: pickValue(examData.autorefraction.od.iop, existing.formData?.iopOD),
            iopOS: pickValue(examData.autorefraction.os.iop, existing.formData?.iopOS),
            pdOD: pickValue(refractionTableData.od.pd, existing.formData?.pdOD),
            pdOS: pickValue(refractionTableData.os.pd, existing.formData?.pdOS),
            refractionOD: {
              ...(existing.formData?.refractionOD ?? {}),
              s: pickValue(refractionTableData.od.s, existing.formData?.refractionOD?.s),
              c: pickValue(refractionTableData.od.c, existing.formData?.refractionOD?.c),
              a: pickValue(refractionTableData.od.a, existing.formData?.refractionOD?.a),
            },
            refractionOS: {
              ...(existing.formData?.refractionOS ?? {}),
              s: pickValue(refractionTableData.os.s, existing.formData?.refractionOS?.s),
              c: pickValue(refractionTableData.os.c, existing.formData?.refractionOS?.c),
              a: pickValue(refractionTableData.os.a, existing.formData?.refractionOS?.a),
            },
          },
          signatures: {
            reception: receptionSignature,
            nurse: nurseSignature,
            technician: technicianSignature,
            doctor: doctorName,
          },
        };

        await saveSheetMutation.mutateAsync({
          patientId,
          sheetType,
          content: JSON.stringify(updated),
        });
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasAutoInput =
      Object.values(examData.autorefraction.od).some((v) => String(v || "").trim()) ||
      Object.values(examData.autorefraction.os).some((v) => String(v || "").trim()) ||
      Object.values(refractionTableData.od).some((v) => String(v || "").trim()) ||
      Object.values(refractionTableData.os).some((v) => String(v || "").trim());
    const hasPentacamInput =
      Object.values(examData.pentacam.od).some((v) => String(v || "").trim()) ||
      Object.values(examData.pentacam.os).some((v) => String(v || "").trim());

    if (hasAutoInput && !nurseSignature.trim()) {
      toast.error("يرجى إدخال توقيع التمريض");
      return;
    }
    if (hasPentacamInput && !technicianSignature.trim() && !nurseSignature.trim()) {
      toast.error("يرجى إدخال توقيع الفني");
      return;
    }
    setLoading(true);
    try {
      let effectivePatientId = patientInfo.id;
      if (!effectivePatientId) {
        if (!canEditPatientData) {
          toast.error("Please search and select an existing patient.");
          return;
        }
        if (!patientInfo.name.trim()) {
          toast.error("يرجى إدخال اسم المريض");
          return;
        }
        const doctorCode = selectedDoctorEntry ? String((selectedDoctorEntry as any)?.code ?? "").trim() : "";
        console.log(`[ExaminationForm] Creating patient with doctor code: "${doctorCode}"`);

        const created = await createPatientFromExamMutation.mutateAsync({
          patientCode: patientInfo.code || undefined,
          fullName: patientInfo.name.trim(),
          dateOfBirth: patientDetails.dateOfBirth || undefined,
          age: patientDetails.age ? Number(patientDetails.age) : undefined,
          phone: patientDetails.phone || undefined,
          address: patientDetails.address || undefined,
          occupation: patientDetails.job || undefined,
          serviceType: (sheetSelection as any) || "consultant",
          locationType,
          ...(doctorCode ? { doctorCode } : {}),
          ...(serviceCode ? { serviceCode } : {}),
        });
        effectivePatientId = created.id;
        setPatientInfo((prev) => ({
          ...prev,
          id: effectivePatientId,
          code: created.patientCode || prev.code,
        }));
      } else if (canEditPatientData) {
        await updatePatientMutation.mutateAsync({
          patientId: effectivePatientId,
          updates: {
            fullName: patientInfo.name,
            patientCode: patientInfo.code,
            dateOfBirth: patientDetails.dateOfBirth || null,
            age: patientDetails.age ? Number(patientDetails.age) : null,
            address: patientDetails.address,
            phone: patientDetails.phone,
            occupation: patientDetails.job,
            serviceType: sheetSelection || undefined,
            locationType,
            status: isFollowup ? "followup" : undefined,
          },
        });
      }
      const form = formRef.current;
      const formData = form ? new FormData(form) : new FormData();
      const payload: Record<string, any> = {};
      formData.forEach((value, key) => {
        payload[key] = String(value);
      });
      payload["medical-general-diseases"] = medicalChecklist.generalDiseases ? "yes" : "";
      payload["medical-pregnancy-lactation"] = medicalChecklist.pregnancyOrLactation ? "yes" : "";
      payload["medical-allergy-supplements-steroids-pressure"] = medicalChecklist.usesAllergySupplementsSteroidsOrPressureMeds ? "yes" : "";
      payload["medical-acne-treatment"] = medicalChecklist.acneTreatment ? "yes" : "";
      payload["medical-family-keratoconus"] = medicalChecklist.familyKeratoconus ? "yes" : "";
      payload["medical-tear-substitute-excess-tears-sandy"] = medicalChecklist.usesTearSubstituteOrExcessTearsOrSandySensation ? "yes" : "";
      payload["medical-symptoms-air-ac"] = medicalChecklist.symptomsWorseWithAirOrAC ? "yes" : "";
      payload["medical-glaucoma-treatment"] = medicalChecklist.glaucomaTreatment ? "yes" : "";

      if (examData.autorefraction?.od) {
        payload["autoref-od"] = examData.autorefraction.od;
      }
      if (examData.autorefraction?.os) {
        payload["autoref-os"] = examData.autorefraction.os;
      }
      if (examData.glasses?.od || examData.glasses?.os) {
        payload["glasses"] = examData.glasses;
      }
      if (examData.pentacam?.od || examData.pentacam?.os) {
        payload["pentacam"] = examData.pentacam;
      }

      await savePatientStateMutation.mutateAsync({
        patientId: effectivePatientId,
        page: "examination",
        data: {
          sheetSelection,
          visitDate,
          doctorName,
          serviceCode,
          serviceQty,
          medicalChecklist,
          isFollowup,
        },
      });

      if (!isFollowup && patientInfo.id && serviceCode.trim()) {
        const isNewPatient = !patientQuery.data;
        if (isNewPatient) {
          const singleServiceCode = String(serviceCode)
            .split(/[,\s]+/)
            .map((v) => v.trim())
            .filter(Boolean)[0] ?? "";
          if (singleServiceCode) {
            const parsedQty = Number.parseInt(serviceQty, 10);
            const quantity = isPentacamService
              ? (Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 2)
              : 1;
            try {
              await linkPatientServiceToMssqlMutation.mutateAsync({
                patientId: effectivePatientId,
                serviceCode: singleServiceCode,
                quantity,
                doctorCode: String((selectedDoctorEntry as any)?.code ?? "").trim() || undefined,
                doctorName: String((selectedDoctorEntry as any)?.name ?? doctorName ?? "").trim() || undefined,
              });
            } catch (error) {
              console.warn("MSSQL sync failed for new case:", error);
            }
          }
        }
      }

      await saveExamMutation.mutateAsync({
        patientId: effectivePatientId,
        visitDate: visitDate || new Date().toISOString().split("T")[0],
        visitType: isFollowup ? "followup" : "examination",
        data: payload,
      });

      const preferredType = (isFollowup
        ? "consultant"
        : (sheetSelection || "consultant")) as
        | "consultant"
        | "specialist"
        | "lasik"
        | "external";
      const allSheetTypes: Array<"consultant" | "specialist" | "lasik" | "external"> = [
        preferredType,
        "consultant",
        "specialist",
        "lasik",
        "external",
      ].filter((v, i, arr) => arr.indexOf(v) === i) as Array<
        "consultant" | "specialist" | "lasik" | "external"
      >;
      await syncSelectedSheets(effectivePatientId, allSheetTypes);
      toast.success("تم حفظ البيانات بنجاح");
      if (embedded) {
        onEmbeddedClose?.();
      } else if (sheetSelection) {
        const target = isFollowup ? "consultant" : sheetSelection;
        const suffix = isFollowup ? "?tab=followup" : "";
        setLocation(`/sheets/${target}/${effectivePatientId}${suffix}`);
      } else {
        setLocation("/patients");
      }
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء حفظ البيانات"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (embedded) {
      onEmbeddedClose?.();
      return;
    }
    setLocation("/patients");
  };

  return {
    isAuthenticated,
    formRef,
    loading,
    visitDate,
    setVisitDate,
    receptionSignature,
    setReceptionSignature,
    nurseSignature,
    setNurseSignature,
    technicianSignature,
    setTechnicianSignature,
    doctorName,
    setDoctorName,
    sheetSelection,
    setSheetSelection,
    isFollowup,
    setIsFollowup,
    patientInfo,
    setPatientInfo,
    patientDetails,
    setPatientDetails,
    locationType,
    setLocationType,
    medicalChecklist,
    setMedicalChecklist,
    examData,
    setExamData,
    refractionTableData,
    setRefractionTableData,
    canEditPatientData,
    availableDoctors,
    selectedDoctorEntry,
    serviceOptions,
    serviceCode,
    setServiceCode,
    serviceQty,
    setServiceQty,
    isPentacamService,
    handleSelectPatient,
    handleSubmit,
    handleCancel,
    hasPatient,
    isMobileViewport,
    mobileExamInputClass,
    desktopVisionSelectClass,
    desktopRefractionInputClass,
    digitsOnly,
    normalizeDoctorTypeToSheet,
    patientQuery,
  };
}

export type UseExaminationFormResult = ReturnType<typeof useExaminationForm>;
