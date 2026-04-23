import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import PatientPicker from "@/components/PatientPicker";
import PentacamFilesPanel from "@/components/PentacamFilesPanel";
import {
  Users,
  Calendar,
  FileText,
  Eye,
  ClipboardList,
  Shield,
  Settings,
  User,
  UserRound,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Activity,
  X,
  Plus,
  Search,
  Trash2,
  Save,
  Pencil,
  Pill,
  FileCheck } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { OfflinePageState } from "@/components/OfflinePageState";
import { PullToRefresh } from "@/components/PullToRefresh";
import { getCardUsage, getPanelState, getRecentPatients, pushRecentPatient, setPanelState, trackCardUsage } from "@/lib/dashboardLocalState";
import MedicalFilePanel from "@/components/MedicalFilePanel";
import SearchableCombobox from "@/components/SearchableCombobox";

const PATIENT_DATA_EDIT_PERMISSION = "/patient-data/edit";

const serviceTypeLabels: Record<string, string> = {
  consultant: "استشاري",
  specialist: "اخصائي",
  examination: "فحص",
  lasik: "ليزك",
  external: "خارجي",
  surgery: "جراحة",
};
interface DoctorServiceSheetMatch {
  doctorCode: string;
  serviceCode: string;
  sheetType: string;
  isActive?: boolean;
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

const getServiceTypeLabel = (serviceType: string | undefined) => {
  if (!serviceType) return "";
  return serviceTypeLabels[serviceType] || serviceType;
};

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [, setLocation] = useLocation();
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && user?.role !== "admin",
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const todayDateIso = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const [todayPatientsDate, setTodayPatientsDate] = useState(todayDateIso);
  const [dailyBoardOpen, setDailyBoardOpen] = useState(() => getPanelState("dailyBoardOpen", true));
  const [todayGroupVisibleCounts, setTodayGroupVisibleCounts] = useState<Record<string, number>>({});
  const [treatedPatients, setTreatedPatients] = useState<Set<number>>(new Set());
  const [recentPatients, setRecentPatients] = useState(() => getRecentPatients());
  const [patientPickerNav, setPatientPickerNav] = useState<string | null>(null);

  // Card visibility toggles - loaded from server
  const cardVisibilityQuery = trpc.medical.getDashboardCardVisibility.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Panel cards
  const [showPatientDataPanel, setShowPatientDataPanel] = useState(true);
  const [showMedicalFileCard, setShowMedicalFileCard] = useState(true);
  const [showTodayPatientsPanel, setShowTodayPatientsPanel] = useState(true);
  const [todayTab, setTodayTab] = useState("patients");
  const [queueStatusTab, setQueueStatusTab] = useState<"checkedIn" | "next" | "clinic" | "treated">("checkedIn");
  const [sheetFilter, setSheetFilter] = useState<string | null>(null);
  const [selectedTodayPatient, setSelectedTodayPatient] = useState<{ id: number; serviceType?: string } | null>(null);
  const [todayPatientMenu, setTodayPatientMenu] = useState<{ id: number; serviceType?: string; fullName?: string } | null>(null);
  const [selectedPatientForMedicalFile, setSelectedPatientForMedicalFile] = useState<number | null>(null);
  // Dashboard cards
  const [showPatients, setShowPatients] = useState(true);
  const [showPatientFile, setShowPatientFile] = useState(true);
  const [showExaminations, setShowExaminations] = useState(true);
  const [showPentacam, setShowPentacam] = useState(true);
  const [showAppointments, setShowAppointments] = useState(true);
  const [showPricingRules, setShowPricingRules] = useState(true);
  const [showMedicalReports, setShowMedicalReports] = useState(true);
  const [showPatientSummary, setShowPatientSummary] = useState(true);
  const [showPrescription, setShowPrescription] = useState(true);
  const [showRefraction, setShowRefraction] = useState(true);
  const [showRequestTests, setShowRequestTests] = useState(true);
  const [showMedicationsTests, setShowMedicationsTests] = useState(true);
  const [showVisits, setShowVisits] = useState(true);
  const [showFollowups, setShowFollowups] = useState(true);
  const [showQuickEntry, setShowQuickEntry] = useState(true);
  const [showNewCases, setShowNewCases] = useState(true);
  const [showFollowupForm, setShowFollowupForm] = useState(true);
  const [showDoctorView, setShowDoctorView] = useState(true);
  const [showSheetCopies, setShowSheetCopies] = useState(true);

  // Load visibility from server
  useEffect(() => {
    if (cardVisibilityQuery.data) {
      setShowPatientDataPanel(cardVisibilityQuery.data.showPatientDataPanel);
      setShowMedicalFileCard(cardVisibilityQuery.data.showMedicalFileCard);
      setShowTodayPatientsPanel(cardVisibilityQuery.data.showTodayPatientsPanel);
      setShowPatients(cardVisibilityQuery.data.showPatients);
      setShowPatientFile(cardVisibilityQuery.data.showPatientFile);
      setShowExaminations(cardVisibilityQuery.data.showExaminations);
      setShowPentacam(cardVisibilityQuery.data.showPentacam);
      setShowAppointments(cardVisibilityQuery.data.showAppointments);
      setShowPricingRules(cardVisibilityQuery.data.showPricingRules);
      setShowMedicalReports(cardVisibilityQuery.data.showMedicalReports);
      setShowPatientSummary(cardVisibilityQuery.data.showPatientSummary);
      setShowPrescription(cardVisibilityQuery.data.showPrescription);
      setShowRefraction(cardVisibilityQuery.data.showRefraction);
      setShowRequestTests(cardVisibilityQuery.data.showRequestTests);
      setShowMedicationsTests(cardVisibilityQuery.data.showMedicationsTests);
      setShowVisits(cardVisibilityQuery.data.showVisits);
      setShowFollowups(cardVisibilityQuery.data.showFollowups);
      setShowQuickEntry(cardVisibilityQuery.data.showQuickEntry);
      setShowNewCases(cardVisibilityQuery.data.showNewCases);
      setShowFollowupForm(cardVisibilityQuery.data.showFollowupForm);
      setShowDoctorView(cardVisibilityQuery.data.showDoctorView);
      setShowSheetCopies(cardVisibilityQuery.data.showSheetCopies);
    }
  }, [cardVisibilityQuery.data]);

  // Patient medical file accordion state
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [activeMedicalTab, setActiveMedicalTab] = useState("medical-history");

  // Log when selectedPatientId changes
  useEffect(() => {
    console.log("🎯 Dashboard selectedPatientId changed to:", selectedPatientId);
  }, [selectedPatientId]);

  // Medical file tab navigation
  const MEDICAL_TABS = ["medical-history", "measurements", "pentacam", "investigation", "diagnosis", "treatment"];
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const panelSwipeStartX = useRef<number | null>(null);
  const panelSwipeStartY = useRef<number | null>(null);

  const navigateTab = (direction: "next" | "prev") => {
    const currentIndex = MEDICAL_TABS.indexOf(activeMedicalTab);
    let newIndex = currentIndex;

    if (direction === "next") {
      newIndex = (currentIndex + 1) % MEDICAL_TABS.length;
    } else {
      newIndex = (currentIndex - 1 + MEDICAL_TABS.length) % MEDICAL_TABS.length;
    }

    setActiveMedicalTab(MEDICAL_TABS[newIndex]);
  };

  // Keyboard navigation for medical tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPatientId === null) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateTab("prev");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateTab("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPatientId, activeMedicalTab]);

  // Touch/swipe navigation for medical tabs
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (selectedPatientId === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        navigateTab("prev");
      } else {
        navigateTab("next");
      }
    }
  };

  const handlePanelSwipeStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    panelSwipeStartX.current = t.clientX;
    panelSwipeStartY.current = t.clientY;
  };

  const handlePanelSwipeEnd = (e: React.TouchEvent) => {
    if (panelSwipeStartX.current === null || panelSwipeStartY.current === null) return;
    const t = e.changedTouches[0];
    const startX = panelSwipeStartX.current;
    const startY = panelSwipeStartY.current;
    const deltaX = startX - t.clientX;
    const deltaY = Math.abs(startY - t.clientY);
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;

    // Horizontal swipe only.
    if (Math.abs(deltaX) < 60 || deltaY > 60) {
      panelSwipeStartX.current = null;
      panelSwipeStartY.current = null;
      return;
    }

    // Open by swiping in from right screen edge when closed.
    if (!dailyBoardOpen && startX > viewportWidth - 40 && deltaX > 0) {
      setDailyBoardOpen(true);
    }

    // Close by swiping right when open.
    if (dailyBoardOpen && deltaX < 0) {
      setDailyBoardOpen(false);
    }

    panelSwipeStartX.current = null;
    panelSwipeStartY.current = null;
  };

  const [patientFormData, setPatientFormData] = useState({
    medicalHistory: "",
    symptoms: [] as number[],
    measurements: {
      autoref: { od: { s: "", c: "", axis: "", ucva: "", bcva: "" }, os: { s: "", c: "", axis: "", ucva: "", bcva: "" } },
      iop: { od: "", os: "" },
    },
    glasses: { od: { s: "", c: "", axis: "", pd: "", bcva: "" }, os: { s: "", c: "", axis: "", pd: "", bcva: "" } },
    pentacam: { od: { k1: "", k2: "", axis: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" }, os: { k1: "", k2: "", axis: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" } },
    tests: [] as number[],
    treatment: [] as number[],
    diagnosis: "",
    diseases: [] as number[],
    recommendations: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [pentacamImagesOpen, setPentacamImagesOpen] = useState(false);
  const [refractionTableData, setRefractionTableData] = useState({
    od: { distBcva: "", distS: "", distC: "", distAx: "" },
    os: { distBcva: "", distS: "", distC: "", distAx: "" },
    near: "",
  });
  const [selectedTestRequestId, setSelectedTestRequestId] = useState<number | null>(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | null>(null);
  const [examinationDate, setExaminationDate] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedExaminationId, setSelectedExaminationId] = useState<number | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search states
  const [medicationSearchText, setMedicationSearchText] = useState("");
  const [testSearchText, setTestSearchText] = useState("");
  const [diseaseSearchText, setDiseaseSearchText] = useState("");

  // Saved Templates selection states
  const [selectedTestRequestIds, setSelectedTestRequestIds] = useState<string[]>([]);
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<string[]>([]);
  const [movePrescriptionTabTarget, setMovePrescriptionTabTarget] = useState<string>("");

  // Prescription tabs (same as WritePrescription page)
  const READY_TABS = [
    "Tracoma",
    "بديل دموع",
    "مضاد حيوي",
    "عياده",
    "تصحيح ابصار",
    "جلوكوما",
    "التهاب قرنيه",
    "أخرى 1",
    "أخرى 2",
    "أخرى 3",
  ];
  const [prescriptionTab, setPrescriptionTab] = useState<string>("أخرى 1");
  const [testRequestTab, setTestRequestTab] = useState<string>("أخرى 1");

  // Helper function to extract category from template name
  const readTemplateCategory = (value: string) => {
    const match = String(value ?? "").match(/^\[(.+?)\]\s*/);
    if (!match) return "";
    return READY_TABS.includes(match[1]) ? match[1] : "";
  };

  const getTemplateCategory = (templateName: string) => {
    const category = readTemplateCategory(templateName);
    return category || "أخرى 1";
  };

  const todayPatientsQuery = trpc.medical.getTodayPatientsBySheet.useQuery(
    { date: todayPatientsDate || todayDateIso },
    {
      enabled: Boolean(user?.id), // Allow all authenticated users to see today's patients
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      refetchOnReconnect: false,
      }
  );

  const operationsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: todayPatientsDate || todayDateIso },
    {
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Queue status patients query
  const queuePatientsQuery = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    {
      date: todayPatientsDate || todayDateIso,
      queueStatus: queueStatusTab,
    },
    {
      enabled: Boolean(user?.id) && todayTab === "patients",
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      refetchOnReconnect: false,
    }
  );

  // Update queue status mutation
  const updateQueueMutation = trpc.medical.updateVisitQueueStatus.useMutation({
    onSuccess: () => {
      void utils.medical.getTodayPatientsByQueueStatus.invalidate();
    },
    onError: () => {
      void utils.medical.getTodayPatientsByQueueStatus.invalidate();
    },
  });

  const deleteAllPatientsMutation = trpc.medical.deleteAllPatients.useMutation({
    onSuccess: () => {
      toast.success("تم حذف جميع المرضى بنجاح");
      queuePatientsQuery.refetch();
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error) || "فشل حذف المرضى");
    },
  });

  // Queries for accordion data - these load global lists that are cached
  const symptomsQuery = trpc.medical.getAllSymptoms.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const diseasesQuery = trpc.medical.getAllDiseases.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });

  // Get selected patient data
  const selectedPatientQuery = trpc.patient.getPatient.useQuery(
    selectedPatientId ?? 0,
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 }
  );

  // Get examinations for selected patient
  const selectedPatientExaminationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    {
      enabled: Boolean(selectedPatientId),
      refetchOnWindowFocus: false,
    }
  );

  // Get visits for selected patient
  const selectedPatientVisitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    {
      enabled: Boolean(selectedPatientId),
      refetchOnWindowFocus: false,
    }
  );

  // Get pentacam results for selected patient
  const pentacamResultsQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false }
  );

  // Get ready test templates (blank templates from Request Tests page)
  const testRequestsQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "tests" },
    { refetchOnWindowFocus: false, staleTime: 60 * 60 * 1000 }
  );

  // Get ready prescriptions (ready prescriptions from Prescriptions page)
  const prescriptionsQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "prescription" },
    { refetchOnWindowFocus: false, staleTime: 60 * 60 * 1000 }
  );

  // Get doctor reports for selected patient
  const doctorReportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false }
  );

  // Mutation for saving medical visit data
  const saveMedicalVisitMutation = trpc.medical.saveMedicalVisit.useMutation();

  // Mutation for updating visit date
  const updateVisitDateMutation = trpc.medical.updateVisitDate.useMutation();

  // Mutation for deleting examination/visit
  const deleteVisitMutation = trpc.medical.deleteVisitWithAllData.useMutation({
    onSuccess: () => {
      void selectedPatientExaminationsQuery.refetch();
      setSelectedExaminationId(null);
      toast.success("تم حذف الزيارة بنجاح");
    },
    onError: (error) => {
      console.error("Delete visit error:", error);
      toast.error(getTrpcErrorMessage(error) || "فشل حذف الزيارة");
    },
  });

  const deleteExaminationDirectMutation = trpc.medical.deleteExaminationDirect.useMutation({
    onSuccess: () => {
      void selectedPatientExaminationsQuery.refetch();
      setSelectedExaminationId(null);
      toast.success("تم حذف الفحص بنجاح");
    },
    onError: (error) => {
      console.error("Delete examination error:", error);
      toast.error(getTrpcErrorMessage(error) || "فشل حذف الفحص");
    },
  });

  // Helper function to handle measurement changes
  const handleMeasurementChange = (
    section: "autoref" | "iop",
    eye: "od" | "os",
    field: string,
    value: string
  ) => {
    setPatientFormData((prev) => {
      const newData = { ...prev };
      if (section === "iop") {
        // IOP has a simple structure: { od: "", os: "" }
        (newData.measurements.iop as any)[eye] = value;
      } else if (section === "autoref") {
        // Autoref has a nested structure: { od: { s: "", c: "", ... }, os: { ... } }
        (newData.measurements.autoref[eye] as any)[field] = value;
      }
      return newData;
    });
  };

  // Helper function to toggle checkboxes
  const toggleCheckbox = (type: "symptoms" | "tests" | "treatment", id: number) => {
    setPatientFormData((prev) => {
      const items = prev[type] || [];
      if (items.includes(id)) {
        return { ...prev, [type]: items.filter((item) => item !== id) };
      } else {
        return { ...prev, [type]: [...items, id] };
      }
    });
  };

  // Handle moving selected prescriptions to another tab
  const handleMoveSelectedPrescriptions = async () => {
    if (!movePrescriptionTabTarget || selectedPrescriptionIds.length === 0) return;

    try {
      const idsToMove = selectedPrescriptionIds;
      for (const templateId of idsToMove) {
        const template = prescriptionsQuery.data?.[templateId];
        if (template) {
          const currentName = template.name || templateId;
          const newName = `[${movePrescriptionTabTarget}] ${currentName.replace(/^\[[^\]]*\]\s*/, "")}`;
          // Here you would call the update mutation if available
          // For now, just clear the selection
        }
      }
      setSelectedPrescriptionIds([]);
      setMovePrescriptionTabTarget("");
      toast.success(`تم نقل ${idsToMove.length} روشتة`);
    } catch (error) {
      toast.error("فشل نقل الروشتات");
    }
  };

  // Filter functions for search
  const filteredMedications = useMemo(() => {
    if (!medicationsQuery.data) return [];
    const query = medicationSearchText.toLowerCase();
    return (medicationsQuery.data ?? []).filter((med: any) =>
      !((patientFormData.treatment || []).includes(med.id)) &&
      med.name.toLowerCase().includes(query)
    );
  }, [medicationsQuery.data, medicationSearchText, patientFormData.treatment]);

  const filteredTests = useMemo(() => {
    if (!testsQuery.data) return [];
    const query = testSearchText.toLowerCase();
    return (testsQuery.data ?? []).filter((test: any) =>
      !((patientFormData.tests || []).includes(test.id)) &&
      test.name.toLowerCase().includes(query)
    );
  }, [testsQuery.data, testSearchText, patientFormData.tests]);

  const filteredDiseases = useMemo(() => {
    if (!diseasesQuery.data) return [];
    const query = diseaseSearchText.toLowerCase();
    return (diseasesQuery.data ?? []).filter((disease: any) =>
      !((patientFormData.diseases || []).includes(disease.id)) &&
      disease.name.toLowerCase().includes(query)
    );
  }, [diseasesQuery.data, diseaseSearchText, patientFormData.diseases]);

  // Load patient data when selected
  useEffect(() => {
    console.log("🔍 Main effect running - selectedPatientId:", selectedPatientId);
    console.log("   Query states:", {
      patientLoading: selectedPatientQuery.isLoading,
      examsLoading: selectedPatientExaminationsQuery.isLoading,
      visitsLoading: selectedPatientVisitsQuery.isLoading,
      patientData: selectedPatientQuery.data ? "yes" : "no"
    });
    if (!selectedPatientQuery.data) return;
    const patient = selectedPatientQuery.data;
    const examinations = selectedPatientExaminationsQuery.data ?? [];

    // Get visits data early
    const visits = selectedPatientVisitsQuery.data ?? [];

    // DEBUG: Log examination data
    console.log("📋 Examinations loaded:", {
      count: examinations.length,
      patientId: selectedPatientId,
      isLoading: selectedPatientExaminationsQuery.isLoading,
      isError: selectedPatientExaminationsQuery.isError,
      exams: examinations.map((e: any) => ({ id: e.id, visitId: e.visitId, date: e.examinationDate }))
    });
    console.log("📅 Visits loaded:", {
      count: visits.length,
      patientId: selectedPatientId,
      isLoading: selectedPatientVisitsQuery.isLoading,
      isError: selectedPatientVisitsQuery.isError,
      visits: visits.slice(0, 3).map((v: any) => ({ id: v.id, visitDate: v.visitDate }))
    });

    // Set default selected examination to latest if not set
    if (examinations.length > 0 && !selectedExaminationId) {
      setSelectedExaminationId(examinations[0].id);
    }

    // Get selected examination or latest
    const selectedExam = selectedExaminationId
      ? examinations.find((e: any) => e.id === selectedExaminationId)
      : (examinations.length > 0 ? examinations[0] : null);

    const doctorReports = doctorReportsQuery.data ?? [];
    const latestReport = doctorReports.length > 0 ? doctorReports[0] : null;
    const pentacamResults = pentacamResultsQuery.data ?? [];

    // Get pentacam for selected exam's visit
    const selectedPentacam = selectedExam && pentacamResults.length > 0
      ? pentacamResults.find((p: any) => p.visitId === selectedExam.visitId)
      : (pentacamResults.length > 0 ? pentacamResults[0] : null);

    // Initialize empty state
    let measurements: any = {
      autoref: { od: { s: "", c: "", axis: "", ucva: "", bcva: "" }, os: { s: "", c: "", axis: "", ucva: "", bcva: "" } },
      iop: { od: "", os: "" },
    };
    let glasses: any = { od: { s: "", c: "", axis: "", pd: "" }, os: { s: "", c: "", axis: "", pd: "" } };
    let pentacam: any = { od: { k1: "", k2: "", axis: "", thinnest: "", apex: "" }, os: { k1: "", k2: "", axis: "", thinnest: "", apex: "" } };
    let symptoms: number[] = [];
    let tests: number[] = [];
    let treatment: number[] = [];

    // Load AutoRef/IOP data from selected examination
    if (selectedExam) {
      measurements.autoref.od.s = selectedExam.sphereOD || "";
      measurements.autoref.od.c = selectedExam.cylinderOD || "";
      measurements.autoref.od.axis = selectedExam.axisOD || "";
      measurements.autoref.od.ucva = selectedExam.ucvaOD || "";
      measurements.autoref.od.bcva = selectedExam.bcvaOD || "";
      measurements.autoref.os.s = selectedExam.sphereOS || "";
      measurements.autoref.os.c = selectedExam.cylinderOS || "";
      measurements.autoref.os.axis = selectedExam.axisOS || "";
      measurements.autoref.os.ucva = selectedExam.ucvaOS || "";
      measurements.autoref.os.bcva = selectedExam.bcvaOS || "";
      measurements.iop.od = selectedExam.iopOD || "";
      measurements.iop.os = selectedExam.iopOS || "";

      // Load glasses data from JSON field if available
      if (selectedExam.glassesData) {
        try {
          const glassesJsonData = JSON.parse(selectedExam.glassesData);
          if (glassesJsonData.od) {
            glasses.od = { ...glasses.od, ...glassesJsonData.od };
          }
          if (glassesJsonData.os) {
            glasses.os = { ...glasses.os, ...glassesJsonData.os };
          }
        } catch {
          // Keep default empty glasses
        }
      }

      // Load refraction data from patient page state
      if ((selectedExam as any)?.pageStateData) {
        try {
          const pageState = typeof (selectedExam as any).pageStateData === 'string' ? JSON.parse((selectedExam as any).pageStateData) : (selectedExam as any).pageStateData;
          if (pageState?.refraction) {
            const refData = pageState.refraction;
            setRefractionTableData({
              od: {
                distBcva: refData.od?.distBcva || "",
                distS: refData.od?.distS || "",
                distC: refData.od?.distC || "",
                distAx: refData.od?.distAx || "",
              },
              os: {
                distBcva: refData.os?.distBcva || "",
                distS: refData.os?.distS || "",
                distC: refData.os?.distC || "",
                distAx: refData.os?.distAx || "",
              },
              near: refData.near || "",
            });
          }
        } catch {
          // Keep default empty refraction
          setRefractionTableData({
            od: { distBcva: "", distS: "", distC: "", distAx: "" },
            os: { distBcva: "", distS: "", distC: "", distAx: "" },
            near: "",
          });
        }
      }
    }

    // Load Pentacam data from selected pentacam results
    if (selectedPentacam) {
      pentacam.od.k1 = selectedPentacam.k1OD || "";
      pentacam.od.k2 = selectedPentacam.k2OD || "";
      pentacam.od.axis = selectedPentacam.axisOD || "";
      pentacam.od.thinnest = selectedPentacam.thinnestPointOD || "";
      pentacam.od.apex = selectedPentacam.apexOD || "";
      pentacam.os.k1 = selectedPentacam.k1OS || "";
      pentacam.os.k2 = selectedPentacam.k2OS || "";
      pentacam.os.axis = selectedPentacam.axisOS || "";
      pentacam.os.thinnest = selectedPentacam.thinnestPointOS || "";
      pentacam.os.apex = selectedPentacam.apexOS || "";
    }

    // Parse tests and treatment from radiologyLabsNotes
    if (selectedExam?.radiologyLabsNotes) {
      try {
        const radiologyData = JSON.parse(selectedExam.radiologyLabsNotes);
        tests = Array.isArray(radiologyData?.tests) ? radiologyData.tests : [];
        treatment = Array.isArray(radiologyData?.treatment) ? radiologyData.treatment : [];
        symptoms = Array.isArray(radiologyData?.symptoms) ? radiologyData.symptoms : [];
      } catch {
        tests = [];
        treatment = [];
        symptoms = [];
      }
    }

    // Parse diseases from doctor report
    let diseases: number[] = [];
    if (latestReport?.diseases) {
      try {
        const parsed = JSON.parse(latestReport.diseases);
        diseases = Array.isArray(parsed) ? parsed : [];
      } catch {
        diseases = [];
      }
    }

    // Load form data - prioritize page state over patient data/reports
    let formData: any = {
      medicalHistory: patient.medicalHistory || "",
      symptoms: symptoms,
      measurements: measurements,
      glasses: glasses,
      pentacam: pentacam,
      tests: tests,
      treatment: treatment,
      diagnosis: latestReport?.diagnosis || "",
      diseases: diseases,
      recommendations: latestReport?.recommendations || "",
    };

    // Override with page state data if available
    if ((selectedExam as any)?.pageStateData) {
      try {
        const pageState = typeof (selectedExam as any).pageStateData === 'string' ? JSON.parse((selectedExam as any).pageStateData) : (selectedExam as any).pageStateData;
        if (pageState?.medicalHistory) formData.medicalHistory = pageState.medicalHistory;
        if (pageState?.symptoms) formData.symptoms = pageState.symptoms;
        if (pageState?.measurements) formData.measurements = pageState.measurements;
        if (pageState?.glasses) formData.glasses = pageState.glasses;
        if (pageState?.pentacam) formData.pentacam = pageState.pentacam;
        if (pageState?.tests) formData.tests = pageState.tests;
        if (pageState?.treatment) formData.treatment = pageState.treatment;
        if (pageState?.diagnosis) formData.diagnosis = pageState.diagnosis;
        if (pageState?.diseases) formData.diseases = pageState.diseases;
        if (pageState?.recommendations) formData.recommendations = pageState.recommendations;
      } catch {
        // Keep defaults from patient data/reports
      }
    }

    setPatientFormData(formData);

    // Helper to format date to YYYY-MM-DD - handle multiple formats including Date objects
    const formatDateToInput = (dateInput: any): string => {
      try {
        console.log("🔍 Exam raw input:", dateInput, "type:", typeof dateInput);

        // If it's a Date object, use UTC components
        if (dateInput instanceof Date) {
          const yyyy = dateInput.getUTCFullYear();
          const mm = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(dateInput.getUTCDate()).padStart(2, '0');
          const formatted = `${yyyy}-${mm}-${dd}`;
          console.log("✅ Converted exam Date object:", formatted);
          return formatted;
        }

        const str = String(dateInput).trim();

        // ISO format: "2026-04-01T23:05:36" or "2026-04-01 23:05:36" or "2026-04-01"
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          const [, yyyy, mm, dd] = isoMatch;
          const formatted = `${yyyy}-${mm}-${dd}`;
          console.log("✅ Extracted ISO exam date:", formatted);
          return formatted;
        }

        // Fallback: mm/dd/yyyy format
        const mmDdYyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmDdYyyyMatch) {
          const [, mm, dd, yyyy] = mmDdYyyyMatch;
          const formatted = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
          console.log("✅ Extracted mm/dd/yyyy exam date:", formatted);
          return formatted;
        }

        console.warn("⚠️ Could not parse exam date:", str);
        return "";
      } catch (e) {
        console.error("❌ Exam date format error:", e, dateInput);
        return "";
      }
    };

    // Set examination date from selected examination createdAt (read-only - for display only)
    if (selectedExam && selectedExam.createdAt) {
      const formattedDate = formatDateToInput(selectedExam.createdAt);
      console.log("✓ Exam found:", { id: selectedExam.id, createdAt: selectedExam.createdAt, formatted: formattedDate });
      if (formattedDate) {
        setExaminationDate(formattedDate);
        setVisitDate(formattedDate);
        console.log("✅ Exam date set:", formattedDate);
      } else {
        setVisitDate(new Date().toISOString().split("T")[0]);
      }
    } else if (examinations.length > 0 && !selectedExam && selectedExaminationId) {
      // If selected exam ID doesn't match any exam, try to find it
      const foundExam = examinations.find((e: any) => e.id === selectedExaminationId);
      if (foundExam?.createdAt) {
        const formattedDate = formatDateToInput(foundExam.createdAt);
        if (formattedDate) {
          setExaminationDate(formattedDate);
          setVisitDate(formattedDate);
          console.log("✅ Found exam by ID, date set:", formattedDate);
        } else {
          setVisitDate(new Date().toISOString().split("T")[0]);
        }
      } else {
        setVisitDate(new Date().toISOString().split("T")[0]);
      }
    } else {
      // No exams - use patient.lastVisit (TR_DT from MSSQL) as fallback
      if (patient?.lastVisit) {
        const formattedDate = formatDateToInput(patient.lastVisit);
        if (formattedDate) {
          setExaminationDate(formattedDate);
          setVisitDate(formattedDate);
          console.log("✅ Using patient.lastVisit (TR_DT from MSSQL):", formattedDate);
        } else {
          setVisitDate(new Date().toISOString().split("T")[0]);
        }
      }
      // Also set visitDate from manually entered visit if available
      else if (visits.length > 0) {
        const firstVisit = visits[0];
        if (firstVisit?.visitDate) {
          const formattedDate = formatDateToInput(firstVisit.visitDate);
          if (formattedDate) {
            setVisitDate(formattedDate);
            console.log("✅ Using visit visitDate (manually entered):", formattedDate);
          } else {
            setVisitDate(new Date().toISOString().split("T")[0]);
          }
        } else {
          setVisitDate(new Date().toISOString().split("T")[0]);
        }
      } else {
        // Default to today if nothing available
        console.log("⚠️ No visit data or lastVisit");
        setVisitDate(new Date().toISOString().split("T")[0]);
      }
    }
  }, [selectedPatientQuery.data, selectedPatientExaminationsQuery.data, selectedPatientVisitsQuery.data, pentacamResultsQuery.data, doctorReportsQuery.data, selectedExaminationId]);

  // Auto-save disabled - manual save only
  // useEffect(() => {
  //   if (!selectedPatientId) return;
  //   if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  //   saveTimeoutRef.current = setTimeout(async () => {
  //     try {
  //       setIsSaving(true);
  //       await saveMedicalVisitMutation.mutateAsync({
  //         patientId: selectedPatientId,
  //         // Measurements - split into autoref and iop
  //         autoref: patientFormData.measurements?.autoref,
  //         iop: patientFormData.measurements?.iop,
  //         // Other measurements
  //         glasses: patientFormData.glasses,
  //         pentacam: patientFormData.pentacam,
  //         // Symptoms and clinical notes
  //         symptoms: (patientFormData.symptoms || []).length > 0 ? JSON.stringify(patientFormData.symptoms) : undefined,
  //         // Tests and treatment
  //         tests: (patientFormData.tests || []).length > 0 ? JSON.stringify(patientFormData.tests) : undefined,
  //         treatment: (patientFormData.treatment || []).length > 0 ? JSON.stringify(patientFormData.treatment) : undefined,
  //         // Diagnosis and recommendations
  //         diagnosis: patientFormData.diagnosis || undefined,
  //         diseases: (patientFormData.diseases || []).length > 0 ? JSON.stringify(patientFormData.diseases) : undefined,
  //         recommendations: patientFormData.recommendations || undefined,
  //       });
  //       setLastSaveTime(new Date());
  //       await selectedPatientExaminationsQuery.refetch();
  //     } catch (error) {
  //       console.error("Auto-save failed:", error);
  //     } finally {
  //       setIsSaving(false);
  //     }
  //   }, 800);

  //   return () => {
  //     if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  //   };
  // }, [patientFormData, selectedPatientId, saveMedicalVisitMutation, selectedPatientExaminationsQuery]);

  useEffect(() => {
    setTodayGroupVisibleCounts({});
  }, [todayPatientsDate]);
  useEffect(() => {
    setPanelState("dailyBoardOpen", dailyBoardOpen);
  }, [dailyBoardOpen]);
  useEffect(() => {
    setRecentPatients(getRecentPatients());
  }, []);
  const allowedPaths = useMemo(() => {
    return (permissionsQuery.data ?? []) as string[];
  }, [permissionsQuery.data]);

  const canAccess = (path: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (!allowedPaths.length) return false;
    return allowedPaths.some((permission) => {
      if (!permission) return false;
      if (permission === path) return true;
      if (permission.includes("/:")) {
        const base = permission.split("/:")[0];
        return path.startsWith(`${base}/`);
      }
      return false;
    });
  };
  const canOpenPricingRules =
    user?.role === "admin" ||
    allowedPaths.includes("/admin/settings/pricing-rules") ||
    allowedPaths.includes("appointments_pricing_v1");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-right">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            مركز عيون الشروق
          </h1>
          <Button onClick={() => setLocation("/")} className="bg-primary">
            العودة إلى الصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };
  const prefetchPathData = (path: string) => {
    if (!path) return;
    if (path === "/patients") {
      void utils.medical.getDoctorDirectory.prefetch(undefined);
      void utils.medical.getServiceDirectory.prefetch(undefined);
      void utils.medical.getUserPageState.prefetch({ page: "patients" });
      return;
    }
    if (path === "/examination" || path === "/admin/sheets") {
      void utils.medical.getDoctorDirectory.prefetch(undefined);
      void utils.medical.getServiceDirectory.prefetch(undefined);
    }
  };
  const prefetchPatientContext = (patientId: number) => {
    if (!patientId) return;
    void utils.patient.getPatient.prefetch(patientId);
    void utils.medical.getPatientPageState.prefetch({ patientId, page: "examination" });
  };
  const openTrackedPath = (path: string) => {
    prefetchPathData(path);
    trackCardUsage(path);
    setLocation(path);
  };

  const getDashboardCards = () => {
    const cards = [];
    const adminCards = [];


    if (showPatientFile && (user?.role === "admin" || canAccess("/patient-file")) && (user?.role === "admin" || user)) {
      cards.push({
        title: "Patient File",
        description: "فتح ملف المريض الشامل",
        icon: UserRound,
        color: "bg-emerald-500",
        action: () => setPatientPickerNav("/patient-file/:id"),
        path: "/patient-file",
      });
    }

    if (showExaminations && (user?.role === "admin" || canAccess("/examination"))) {
      cards.push({
        title: "الفحوصات",
        description: "إدخال بيانات الفحوصات",
        icon: Eye,
        color: "bg-cyan-500",
        action: () => setLocation("/examination"),
        path: "/examination",
      });
    }

    if (showPentacam && (user?.role === "admin" || canAccess("/sheets/pentacam/:id"))) {
      cards.push({
        title: "بنتاكام",
        description: "عرض صور وملفات البنتاكام",
        icon: Eye,
        color: "bg-indigo-500",
        action: () => setLocation("/sheets/pentacam"),
        path: "/sheets/pentacam",
      });
    }

    if (showAppointments && (user?.role === "admin" || canAccess("/operations"))) {
      cards.push({
        title: "العمليات",
        description: "لست العمليات",
        icon: Calendar,
        color: "bg-amber-500",
        action: () => setLocation("/operations"),
        path: "/operations",
      });
    }

    if (showPricingRules && canOpenPricingRules) {
      cards.push({
        title: "تسعير العمليات",
        description: "عرض وتعديل قواعد الأسعار",
        icon: Settings,
        color: "bg-slate-600",
        action: () => setLocation("/admin/settings/pricing-rules"),
        path: "/admin/settings/pricing-rules",
      });
    }

    if (showMedicalReports && (user?.role === "admin" || canAccess("/medical-reports"))) {
      cards.push({
        title: "التقارير",
        description: "كتابة وعرض التقارير الطبية",
        icon: FileText,
        color: "bg-purple-500",
        action: () => setPatientPickerNav("/medical-reports/:id"),
        path: "/medical-reports",
      });
    }


    if (showPrescription && (user?.role === "admin" || canAccess("/prescription"))) {
      cards.push({
        title: "كتابة الروشتة",
        description: "إنشاء وطباعة روشتات طبية",
        icon: FileText,
        color: "bg-orange-500",
        action: () => setPatientPickerNav("/prescription/:id"),
        path: "/prescription",
      });
    }

    if (showRefraction && user) {
      cards.push({
        title: "مقاس النظاره",
        description: "فتح وتعديل مقاس النظاره",
        icon: Eye,
        color: "bg-emerald-600",
        action: () => setPatientPickerNav("/refraction/:id"),
        path: "/refraction",
      });
    }

    if (showRequestTests && (user?.role === "admin" || canAccess("/request-tests"))) {
      cards.push({
        title: "طلب الفحوصات",
        description: "إنشاء وطباعة طلبات فحوصات",
        icon: ClipboardList,
        color: "bg-cyan-600",
        action: () => setPatientPickerNav("/request-tests/:id"),
        path: "/request-tests",
      });
    }



    if (["admin"].includes(user?.role || "")) {
      adminCards.push({
        title: "Sheets",
        description: "All Sheets + Sheet Designer",
        icon: FileText,
        color: "bg-blue-700",
        action: () => setLocation("/admin/sheets"),
        path: "/admin/sheets",
      });
    }

    if (["admin"].includes(user?.role || "")) {
      adminCards.push({
        title: "User Management",
        description: "Users + Doctors + Permissions",
        icon: Shield,
        color: "bg-indigo-600",
        action: () => setLocation("/admin/users"),
        path: "/admin/users",
      });
    }

    if (["admin"].includes(user?.role || "")) {
      adminCards.push({
        title: "إعدادات النظام",
        description: "الإعدادات + حالة النظام + APIs + الترحيلات",
        icon: Settings,
        color: "bg-slate-700",
        action: () => setLocation("/admin/settings"),
        path: "/admin/settings",
      });
    }

    return { cards, adminCards };
  };

  const { cards, adminCards } = getDashboardCards();
  const isReception = user?.role === "reception";
  const isAdmin = user?.role === "admin";
  const canEditPatientData =
    user?.role === "admin" ||
    (user?.role === "reception" && allowedPaths.includes(PATIENT_DATA_EDIT_PERMISSION));
  const canSeeTodayPatients = true; // Allow all users to see today's patients
  const [todayPatientsExpanded, setTodayPatientsExpanded] = useState(() => getPanelState("todayPatientsExpanded", user?.role !== "admin"));
  useEffect(() => {
    setPanelState("todayPatientsExpanded", todayPatientsExpanded);
  }, [todayPatientsExpanded]);
  const roleMainOrderMap: Record<string, string[]> = {
    admin: ["المرضى", "Patient File", "الفحوصات", "بنتاكام", "التقرير المجمع", "التقارير", "كتابة الروشتة", "العمليات", "طلب الفحوصات", "الأدوية والفحوصات", "مقاس النظاره", "نسخة الشيتات"],
    manager: ["المرضى", "Patient File", "الفحوصات", "التقرير المجمع", "العمليات", "التقارير", "طلب الفحوصات", "الأدوية والفحوصات", "مقاس النظاره", "بنتاكام"],
    doctor: ["الفحوصات", "المرضى", "Patient File", "التقرير المجمع", "التقارير", "كتابة الروشتة", "بنتاكام", "طلب الفحوصات", "العمليات", "مقاس النظاره"],
    nurse: ["الفحوصات", "المرضى", "Patient File", "التقرير المجمع", "طلب الفحوصات", "بنتاكام", "مقاس النظاره"],
    technician: ["الفحوصات", "بنتاكام", "المرضى", "Patient File", "التقرير المجمع", "مقاس النظاره", "طلب الفحوصات"],
    reception: ["المرضى", "Patient File", "التقرير المجمع", "مقاس النظاره", "التقارير", "طلب الفحوصات", "الفحوصات", "الأدوية والفحوصات", "العمليات", "بنتاكام"],
  };
  const mainOrder = roleMainOrderMap[user?.role ?? ""] ?? [
    "المرضى",
    "Patient File",
    "الفحوصات",
    "بنتاكام",
    "التقرير المجمع",
    "العمليات",
    "التقارير",
    "كتابة الروشتة",
    "مقاس النظاره",
    "طلب الفحوصات",
    "الأدوية والفحوصات",
    "نسخة الشيتات",
  ];
  const adminOrder = [
    "Sheets",
    "User Management",
    "إعدادات النظام",
  ];
  const orderMap = new Map(mainOrder.map((name, idx) => [name, idx]));
  const adminOrderMap = new Map(adminOrder.map((name, idx) => [name, idx]));
  const sortedCards = [...cards].sort((a, b) => {
    const usageDelta = getCardUsage(b.path) - getCardUsage(a.path);
    if (usageDelta !== 0) return usageDelta;
    const aIdx = orderMap.get(a.title) ?? Number.MAX_SAFE_INTEGER;
    const bIdx = orderMap.get(b.title) ?? Number.MAX_SAFE_INTEGER;
    return aIdx - bIdx;
  });
  const sortedAdminCards = [...adminCards].sort((a, b) => {
    const usageDelta = getCardUsage(b.path) - getCardUsage(a.path);
    if (usageDelta !== 0) return usageDelta;
    const aIdx = adminOrderMap.get(a.title) ?? Number.MAX_SAFE_INTEGER;
    const bIdx = adminOrderMap.get(b.title) ?? Number.MAX_SAFE_INTEGER;
    return aIdx - bIdx;
  });
  const mainCardsWithoutPatients = sortedCards.filter((card) => card.path !== "/examination");
  const displayMainCards = isReception ? mainCardsWithoutPatients : sortedCards;
  const roleQuickAccessCards = displayMainCards.slice(0, 3);
  const todayGroupsAll = (((todayPatientsQuery.data as any)?.groups ?? []) as Array<{
    serviceType: string;
    total: number;
    patients: Array<{ id: number; patientCode: string; fullName: string }>;
  }>).slice().sort((a, b) => b.total - a.total);
  const todayGroups = todayGroupsAll
    .filter((group) => {
      const key = String(group.serviceType ?? "").toLowerCase();
      return key !== "surgery" && key !== "surgery_center" && key !== "surgery_external";
    })
    .slice();
  const surgeryTodayPatients = todayGroupsAll
    .filter((group) => {
      const key = String(group.serviceType ?? "").toLowerCase();
      return key === "surgery" || key === "surgery_center" || key === "surgery_external";
    })
    .flatMap((group) => group.patients ?? []);
  const todayTotal = Number((todayPatientsQuery.data as any)?.total ?? 0);
  const activeTodayGroups = todayGroups.filter((group) => group.total > 0);

  // Get operation lists for selected date
  const todayOperations = useMemo(() => {
    return (operationsQuery.data ?? []) as any[];
  }, [operationsQuery.data]);

  // Group by doctor tab
  const operationsByDoctor = useMemo(() => {
    const groups: Record<string, any[]> = {};

    todayOperations.forEach((list) => {
      const doctorTab = list.doctorTab || "بدون تصنيف";
      if (!groups[doctorTab]) {
        groups[doctorTab] = [];
      }
      groups[doctorTab].push(list);
    });
    return groups;
  }, [todayOperations]);

  const sheetLabel = (serviceType: string) => {
    const key = String(serviceType ?? "").toLowerCase();
    if (key === "consultant") return "استشاري";
    if (key === "specialist") return "اخصائي";
    if (key === "pentacam_c") return "Pentacam C";
    if (key === "pentacam_ex") return "Pentacam Ex";
    if (key === "pentacam_ex_c") return "Pentacam Ex.C";
    if (key === "pentacam" || key === "pentacam_center" || key === "pentacam_external" || key === "radiology_center" || key === "radiology_external") return "بنتاكام";
    if (key === "lasik") return "فحوصات الليزك";
    if (key === "external") return "خارجي";
    if (key === "surgery") return "عمليات";
    return key || "غير محدد";
  };
  const sheetPathForPatient = (serviceType: string, patientId: number) => {
    const key = String(serviceType ?? "").toLowerCase();
    if (key === "consultant") return `/sheets/consultant/${patientId}`;
    if (key === "specialist") return `/sheets/specialist/${patientId}`;
    if (key === "pentacam_c") return `/sheets/lasik/${patientId}`;
    if (key === "pentacam_ex" || key === "pentacam_ex_c") return `/sheets/external/${patientId}`;
    if (key === "pentacam" || key === "pentacam_center" || key === "radiology_center") return `/sheets/pentacam/${patientId}`;
    if (key === "pentacam_external" || key === "radiology_external") return `/sheets/external/${patientId}`;
    if (key === "lasik") return `/sheets/lasik/${patientId}`;
    if (key === "external") return `/sheets/external/${patientId}`;
    if (key === "surgery" || key === "surgery_center") return `/sheets/operation/${patientId}`;
    if (key === "surgery_external") return `/sheets/external/${patientId}`;
    return `/patients/${patientId}`;
  };

  const busiestTodayGroup = activeTodayGroups.length > 0 ? activeTodayGroups[0] : null;
  const todaySummaryStats = [
    { label: "الدور", value: user?.role || "-" },
    { label: "حالات اليوم", value: String(todayTotal) },
    { label: "الأقسام النشطة", value: String(activeTodayGroups.length) },
    {
      label: "أكثر خدمة اليوم",
      value: busiestTodayGroup ? `${sheetLabel(busiestTodayGroup.serviceType)} (${busiestTodayGroup.total})` : "-",
    },
  ];

  const PatientNavDialog = () => (
    <Dialog open={Boolean(patientPickerNav)} onOpenChange={(open) => { if (!open) setPatientPickerNav(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>اختر مريضاً</DialogTitle>
        </DialogHeader>
        <PatientPicker
          onSelect={(patient) => {
            if (!patientPickerNav) return;
            const path = patientPickerNav.replace(":id", String(patient.id));
            pushRecentPatient({ id: patient.id, name: patient.fullName, code: patient.patientCode ?? "" });
            setRecentPatients(getRecentPatients());
            setPatientPickerNav(null);
            setLocation(path);
          }}
        />
      </DialogContent>
    </Dialog>
  );

  const TodayPatientMenuDialog = () => (
    <Dialog open={Boolean(todayPatientMenu)} onOpenChange={(open) => { if (!open) setTodayPatientMenu(null); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>ملفات المريض {todayPatientMenu?.fullName ? `- ${todayPatientMenu.fullName}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "الملف الطبي", action: () => setSelectedPatientForMedicalFile(todayPatientMenu?.id ?? null) },
            { label: "الملف المجمع", path: () => `/patient-file/${todayPatientMenu?.id}` },
            { label: "الشيت", path: () => sheetPathForPatient(String(todayPatientMenu?.serviceType || ""), todayPatientMenu?.id ?? 0) },
            { label: "الملف الشامل", path: () => `/patient-summary/${todayPatientMenu?.id}` },
            { label: "بنتاكام", path: () => `/sheets/pentacam/${todayPatientMenu?.id}` },
            { label: "قياس و فحص", path: () => `/examination/${todayPatientMenu?.id}` },
            { label: "الروشته", path: () => `/prescription/${todayPatientMenu?.id}` },
            { label: "تحاليل و اشعه", path: () => `/request-tests/${todayPatientMenu?.id}` },
            { label: "تشخيص/تقرير", path: () => `/medical-reports/${todayPatientMenu?.id}` },
            { label: "الزيارات", path: () => `/visits/${todayPatientMenu?.id}` },
          ].map(({ label, action, path }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="sm"
              className="text-xs justify-center"
              onClick={() => {
                if (!todayPatientMenu) return;
                if (typeof action === "function") action();
                if (typeof path === "function") openTrackedPath(path());
                setTodayPatientMenu(null);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderCard = (card: any, index: number, extraClassName = "") => {
    const Icon = card.icon;
    return (
      <Card
        key={`${card.path}-${index}`}
        className={`group overflow-hidden border-slate-200/80 bg-white/90 transition-all duration-150 hover:shadow-md hover:border-slate-300 cursor-pointer ${extraClassName}`}
        onMouseEnter={() => prefetchPathData(card.path)}
        onClick={() => {
          trackCardUsage(card.path);
          card.action();
        }}
      >
        <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
          <div className={`${card.color} rounded-xl p-2.5 shadow-sm transition-transform duration-150 group-hover:scale-105`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-medium text-slate-800 leading-tight">{card.title}</span>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <PatientNavDialog />
      <TodayPatientMenuDialog />

      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([permissionsQuery.refetch(), todayPatientsQuery.refetch()]);
        }}
        className="min-h-screen"
      >
        <main
          className="w-full max-w-full overflow-x-hidden py-8"
          dir="rtl"
          onTouchStart={handlePanelSwipeStart}
          onTouchEnd={handlePanelSwipeEnd}
        >
          {(permissionsQuery.isError || todayPatientsQuery.isError) && (
            <div>
              <OfflinePageState
                title="الاتصال بالخادم غير مستقر"
                body="بعض بيانات لوحة التحكم المباشرة غير متاحة الآن. يمكنك المتابعة بالوظائف الأساسية ثم إعادة المحاولة."
                onRetry={() => {
                  void permissionsQuery.refetch();
                  void todayPatientsQuery.refetch();
                }}
              />
            </div>
          )}

          {/* Main content area - full width */}
          <div className="w-full px-3 sm:px-4 md:px-6 grid gap-4 sm:gap-6 items-start grid-cols-1">
            {/* Main Content Area - Full Width */}
            <div className="w-full col-span-1">

              {/* Today's Patients - Inline Section */}
              {canSeeTodayPatients && (
                <div className="mb-6">
                  <Card className="border-slate-200/80 bg-white/95 shadow-sm">
                    <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.95))] p-3 md:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-base md:text-lg text-slate-900">مرضى اليوم</CardTitle>
                        <CardDescription className="text-xs text-slate-600">
                          {todayPatientsDate || todayDateIso} | الإجمالي: {todayTotal}
                        </CardDescription>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Tabs value={todayTab} onValueChange={setTodayTab} className="flex-1 w-full sm:min-w-[180px]" dir="rtl">
                            <TabsList className="w-full grid grid-cols-2 h-9 bg-slate-100/90 p-1 rounded-lg">
                              <TabsTrigger value="patients" className="text-xs sm:text-sm rounded-md">المرضى</TabsTrigger>
                              <TabsTrigger value="operations" className="text-xs sm:text-sm rounded-md">العمليات</TabsTrigger>
                            </TabsList>
                          </Tabs>
                          <Input type="date" value={todayPatientsDate} onChange={(e) => setTodayPatientsDate(e.target.value)} className="w-36 text-xs" />
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setTodayPatientsDate(todayDateIso)}>اليوم</Button>
                          <Button type="button" variant="outline" size="sm" className="text-xs border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100" onClick={() => setLocation("/patients")}>المرضى</Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setTodayPatientsExpanded((prev) => !prev)}
                            title={todayPatientsExpanded ? "إخفاء مرضى اليوم" : "عرض مرضى اليوم"}
                          >
                            {todayPatientsExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                            {todayPatientsExpanded ? "إخفاء" : "عرض"}
                          </Button>
                          {user?.role === "admin" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={deleteAllPatientsMutation.isPending}
                              className="text-xs border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
                              onClick={() => {
                                if (window.confirm("حذف جميع المرضى؟ لن يؤثر على السجلات الأخرى.")) {
                                  deleteAllPatientsMutation.mutate();
                                }
                              }}
                              title="حذف جميع المرضى"
                            >
                              <Trash2 className="h-3 w-3 ml-1" />
                              حذف المرضى
                            </Button>
                          )}
                        </div>
                        {todayTab === "patients" && (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 py-1 w-full" dir="rtl">
                              {[
                                { value: "checkedIn", label: "تسجيل", active: "bg-blue-100 text-blue-700 border-blue-300", base: "border-slate-200 bg-white text-slate-600" },
                                { value: "next", label: "التالي", active: "bg-yellow-100 text-yellow-700 border-yellow-300", base: "border-slate-200 bg-white text-slate-600" },
                                { value: "clinic", label: "العيادة", active: "bg-orange-100 text-orange-700 border-orange-300", base: "border-slate-200 bg-white text-slate-600" },
                                { value: "treated", label: "معالج", active: "bg-green-100 text-green-700 border-green-300", base: "border-slate-200 bg-white text-slate-600" },
                              ].map(({ value, label, active, base }) => (
                                <button key={value} type="button" onClick={() => setQueueStatusTab(value as any)}
                                  className={`text-xs sm:text-sm px-2 py-1.5 rounded-md border font-medium transition text-center ${queueStatusTab === value ? active : base}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1 py-1 w-full" dir="rtl">
                              {[
                                { value: null, label: "الكل" },
                                { value: "consultant", label: "استشاري" },
                                { value: "specialist", label: "أخصائي" },
                                { value: "lasik", label: "ليزك" },
                                { value: "external", label: "خارجي" },
                              ].map(({ value, label }) => (
                                <button key={label} type="button" onClick={() => setSheetFilter(value)}
                                  className={`text-xs sm:text-sm px-2.5 py-1 rounded-full border transition whitespace-nowrap ${sheetFilter === value ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                            {/* Moved to popup menu on patient press/select */}
                            {false && <div className={`grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-nowrap md:overflow-x-auto gap-1 mt-2 pt-2 border-t border-slate-200 py-1 md:scrollbar-none md:-mx-3 md:px-3 lg:-mx-4 lg:px-4 transition-opacity ${selectedTodayPatient ? "opacity-100" : "opacity-30 pointer-events-none"}`} dir="rtl" style={{WebkitOverflowScrolling:"touch"}}>
                              {[
                                { label: "الملف الطبي", color: "text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100", action: () => setSelectedPatientForMedicalFile(selectedTodayPatient?.id ?? null) },
                                { label: "الملف المجمع", color: "text-slate-700 border-slate-200 bg-slate-50 hover:bg-slate-100", path: () => `/patient-file/${selectedTodayPatient?.id}` },
                                { label: "الشيت", color: "text-cyan-700 border-cyan-200 bg-cyan-50 hover:bg-cyan-100", path: () => sheetPathForPatient(String(selectedTodayPatient?.serviceType || ""), selectedTodayPatient?.id ?? 0) },
                                { label: "الملف الشامل", color: "text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100", path: () => `/patient-summary/${selectedTodayPatient?.id}` },
                                { label: "بنتاكام", color: "text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100", path: () => `/sheets/pentacam/${selectedTodayPatient?.id}` },
                                { label: "قياس و فحص", color: "text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100", path: () => `/examination/${selectedTodayPatient?.id}` },
                                { label: "الروشته", color: "text-green-700 border-green-200 bg-green-50 hover:bg-green-100", path: () => `/prescription/${selectedTodayPatient?.id}` },
                                { label: "تحاليل و اشعه", color: "text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100", path: () => `/request-tests/${selectedTodayPatient?.id}` },
                                { label: "تشخيص/تقرير", color: "text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100", path: () => `/medical-reports/${selectedTodayPatient?.id}` },
                                { label: "الزيارات", color: "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100", path: () => `/visits/${selectedTodayPatient?.id}` },
                              ].map(({ label, color, path, action }) => (
                                <button key={label} type="button"
                                  onClick={() => {
                                    if (!selectedTodayPatient) return;
                                    if (typeof action === "function") { action(); return; }
                                    if (typeof path === "function") openTrackedPath(path());
                                  }}
                                  className={`text-xs px-2 py-1 rounded border font-medium transition text-center ${color}`}>
                                  {label}
                                </button>
                              ))}
                            </div>}
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 md:p-3 max-h-[480px] overflow-y-auto">
                      {todayTab === "patients" && todayPatientsExpanded ? (
                        queuePatientsQuery.isLoading ? (
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                              <div key={index} className="space-y-2">
                                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                                <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5" dir="rtl">
                            {(!queuePatientsQuery.data || queuePatientsQuery.data.length === 0) ? (
                              <div className="col-span-full text-xs text-muted-foreground text-center py-4">لا توجد حالات</div>
                            ) : (
                              [...(queuePatientsQuery.data || [])]
                                .filter((p) => {
                                  const key = String(p.serviceType ?? "").toLowerCase();
                                  return key !== "surgery" && key !== "surgery_center" && key !== "surgery_external";
                                })
                                .filter((p) => !sheetFilter || p.serviceType === sheetFilter)
                                .map((p) => {
                                  const pid = Number((p as any).patientId ?? p.id);
                                  return (
                                <div
                                  key={`${p.id}-${pid}`}
                                  className={`rounded-lg border p-2.5 space-y-2 transition shadow-sm min-h-[118px] flex flex-col justify-between ${selectedTodayPatient?.id === pid ? "border-slate-500 bg-slate-100 ring-1 ring-slate-400" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <button
                                      type="button"
                                      className="text-xs sm:text-sm font-semibold text-right flex items-center justify-end gap-1 leading-tight line-clamp-2 min-h-[2.5rem] underline-offset-2 hover:underline text-slate-800"
                                      title="فتح ملفات المريض"
                                      onClick={() => {
                                        setSelectedTodayPatient({ id: pid, serviceType: p.serviceType });
                                        setTodayPatientMenu({ id: pid, serviceType: p.serviceType, fullName: p.fullName });
                                      }}
                                    >
                                      <span aria-hidden="true" className="text-slate-500">⋯</span>
                                      <span>{p.fullName}</span>
                                    </button>
                                  </div>
                                  {(p.doctorName || p.serviceType) && (
                                    <div className="text-[11px] sm:text-xs text-slate-600 text-right line-clamp-1 min-h-[1rem]">
                                      {p.doctorName || getServiceTypeLabel(p.serviceType)}
                                    </div>
                                  )}
                                  <div className="pt-1.5 border-t border-slate-200 space-y-1.5 mt-auto" dir="rtl">
                                    {p.checkedInAt && (
                                      <div className="text-[11px] sm:text-xs text-slate-500">
                                        {p.checkedInTime || new Date(p.checkedInAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                    )}
                                  <div className="flex items-center gap-1 flex-wrap" dir="ltr">
                                    {queueStatusTab !== "treated" && p.visitId && (

                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={updateQueueMutation.isPending}
                                        className="h-6 w-6 p-0 border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
                                        title="معالج"
                                        onClick={() => {
                                          utils.medical.getTodayPatientsByQueueStatus.setData(
                                            { date: todayPatientsDate || todayDateIso, queueStatus: queueStatusTab },
                                            (old: any) => (old ?? []).filter((x: any) => x.id !== p.id)
                                          );
                                          updateQueueMutation.mutate({
                                            visitId: p.visitId,
                                            queueStatus: "treated",
                                            patientId: pid,
                                            date: todayPatientsDate || todayDateIso,
                                          });
                                        }}
                                      >
                                        ✓
                                      </Button>
                                    )}
                                  </div>
                                  </div>
                                </div>
                              );
                              })
                            )}
                          </div>
                        )
                      ) : todayTab === "operations" && todayPatientsExpanded ? (
                        operationsQuery.isLoading ? (
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                              <div key={index} className="space-y-2">
                                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                                <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
                              </div>
                            ))}
                          </div>
                        ) : operationsQuery.isError ? (
                          <div className="text-xs text-red-600 text-center py-4">خطأ في تحميل العمليات</div>
                        ) : (
                          <div className="space-y-3">
                            {!operationsQuery.data || todayOperations.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-4">لا توجد عمليات</div>
                            ) : (
                              todayOperations.map((list: any) => (
                                <div key={list.id} className="space-y-2">
                                  <div className="text-xs font-semibold text-slate-700 border-b pb-1">
                                    الطبيب المعالج: {list.doctorFullName || list.doctorName || list.doctorTab || "بدون تصنيف"}
                                  </div>
                                  <div className="space-y-1">
                                    {(list.items ?? []).slice(0, 20).map((item: any) => (
                                      <div key={item.id} className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 space-y-0.5">
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-slate-600">{item.operation || item.code || "عملية"}</div>
                                        <div className="text-slate-500">{item.code || "بدون كود"}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {activeTodayGroups.length === 0 ? (
                            <div className="text-xs text-muted-foreground w-full text-center">لا توجد حالات</div>
                          ) : (
                            activeTodayGroups.map((group) => (
                              <div
                                key={group.serviceType}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                {sheetLabel(group.serviceType)} {group.total}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {showPatientDataPanel && (
                <div className="mb-6">
                  <ReceptionPatientInfoPanel
                    canEditPatientData={canEditPatientData}
                    onOpenExamination={() => setLocation("/examination")}
                    onSetSelectedPatientId={setSelectedPatientId}
                    examinationDate={examinationDate}
                    onExaminationDateChange={setExaminationDate}
                  />
                </div>
              )}

              {showMedicalFileCard && (
              <div className="w-full rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
                {selectedPatientId ? (
                  // Patient Medical File Accordion
                  <div className="flex flex-col max-h-[calc(100vh-200px)]">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 border-b">
                      <h2 className="text-lg font-semibold">
                        {selectedPatientQuery.isLoading ? "جاري التحميل..." : selectedPatientQuery.data?.fullName ?? "بدون اسم"}
                      </h2>
                      <button
                        onClick={() => {
                          setSelectedPatientId(null);
                          setPatientFormData({
                            medicalHistory: "",
                            symptoms: [],
                            measurements: {
                              autoref: { od: { s: "", c: "", axis: "", ucva: "", bcva: "" }, os: { s: "", c: "", axis: "", ucva: "", bcva: "" } },
                              iop: { od: "", os: "" },
                            },
                            glasses: { od: { s: "", c: "", axis: "", pd: "", bcva: "" }, os: { s: "", c: "", axis: "", pd: "", bcva: "" } },
                            pentacam: { od: { k1: "", k2: "", axis: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" }, os: { k1: "", k2: "", axis: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" } },
                            tests: [],
                            treatment: [],
                            diagnosis: "",
                            diseases: [],
                            recommendations: "",
                          });
                        }}
                        className="text-2xl text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Examination Selector */}
                    {selectedPatientExaminationsQuery.data && selectedPatientExaminationsQuery.data.length > 0 && (
                      <div className="px-4 py-3 border-b bg-slate-50">
                        <Label className="text-sm font-medium block mb-2">اختر الفحص</Label>
                        <div className="flex gap-2">
                          <Select value={String(selectedExaminationId)} onValueChange={(val) => setSelectedExaminationId(Number(val))}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="اختر فحص" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedPatientExaminationsQuery.data.map((exam: any) => (
                                <SelectItem key={exam.id} value={String(exam.id)}>
                                  {new Date(exam.createdAt).toLocaleDateString("ar-EG")} - {new Date(exam.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {user?.role === "admin" && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="min-w-[100px]"
                              disabled={!selectedExaminationId || deleteVisitMutation.isPending || deleteExaminationDirectMutation.isPending}
                              onClick={() => {
                                console.log("🗑️ Delete clicked. selectedExaminationId:", selectedExaminationId);
                                console.log("📋 All exams:", selectedPatientExaminationsQuery.data);
                                const selectedExam = selectedPatientExaminationsQuery.data?.find((e: any) => e.id === selectedExaminationId);
                                console.log("✓ Selected exam:", selectedExam);
                                console.log("📍 visitId:", selectedExam?.visitId);
                                if (!selectedExam) {
                                  console.error("❌ No examination selected!");
                                  toast.error("لم يتم العثور على الفحص المحدد");
                                  return;
                                }
                                if (window.confirm("هل أنت متأكد من حذف هذا الفحص والبيانات المرتبطة به؟")) {
                                  // Use deleteExaminationDirect if visitId is invalid, otherwise delete the visit
                                  if (selectedExam.visitId && selectedExam.visitId > 0) {
                                    console.log("✅ Deleting via visit with visitId:", selectedExam.visitId);
                                    deleteVisitMutation.mutate({ visitId: selectedExam.visitId });
                                  } else {
                                    console.log("✅ Deleting examination directly with examinationId:", selectedExam.id);
                                    deleteExaminationDirectMutation.mutate({ examinationId: selectedExam.id });
                                  }
                                }
                              }}
                            >
                              {deleteVisitMutation.isPending || deleteExaminationDirectMutation.isPending ? "جاري الحذف..." : "حذف"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Accordion */}
                    <div className="flex-1 overflow-y-auto py-6">
                      <div className="flex-1 overflow-y-auto">
                        {/* TABS SECTION */}
                        {/* Visits List */}
                        <div className="border-b pb-4 pt-2 mb-4">
                          <h3 className="text-base font-semibold mb-3">الزيارات</h3>
                          {selectedPatientVisitsQuery.isLoading ? (
                            <div className="space-y-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                              ))}
                            </div>
                          ) : selectedPatientVisitsQuery.isError ? (
                            <div className="text-sm text-red-600">خطأ في تحميل الزيارات</div>
                          ) : (selectedPatientVisitsQuery.data ?? []).length === 0 ? (
                            <div className="text-sm text-slate-500">لا توجد زيارات</div>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {(selectedPatientVisitsQuery.data ?? []).map((visit: any) => (
                                <div key={visit.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-mono text-slate-600">#{visit.id}</span>
                                    <span className="text-xs text-slate-500">
                                      {new Date(visit.visitDate).toLocaleDateString("ar-EG")}
                                    </span>
                                  </div>
                                  <div className="text-sm font-medium text-slate-800">
                                    {visit.visitType || "زيارة"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* PROFILE DATA - Only visible when medical-history tab is active */}
                        {activeMedicalTab === "medical-history" && (
                          <div className="border-b pb-6 pt-1 mb-6">
                            <h3 className="text-base font-semibold mb-6">Profile Data</h3>
                            <div className="grid grid-cols-2 gap-4">
                              {/* Row 1: Name | Age */}
                              <div>
                                <Label>الاسم</Label>
                                <Input value={selectedPatientQuery.data?.fullName ?? ""} disabled className="mt-1 text-xs" />
                              </div>
                              <div>
                                <Label>السن</Label>
                                <Input value={selectedPatientQuery.data?.age ?? ""} disabled className="mt-1 text-xs" />
                              </div>

                              {/* Row 2: ExamDate | VisitDate */}
                              <div>
                                <Label>تاريخ الفحص</Label>
                                <Input type="date" value={examinationDate} onChange={(e) => setExaminationDate(e.target.value)} disabled className="mt-1 text-xs" />
                              </div>
                              <div>
                                <Label>تاريخ الزيارة</Label>
                                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="mt-1 text-xs" />
                              </div>
                            </div>
                          </div>
                        )}

                        <Tabs value={activeMedicalTab} onValueChange={setActiveMedicalTab} dir="rtl" className="w-full" ref={tabsContainerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                          <TabsList className="w-full justify-start gap-1 overflow-x-auto flex-nowrap border-b">
                            <TabsTrigger value="medical-history" className="text-sm whitespace-nowrap">التاريخ المرضي</TabsTrigger>
                            <TabsTrigger value="measurements" className="text-sm whitespace-nowrap">القياسات</TabsTrigger>
                            <TabsTrigger value="pentacam" className="text-sm whitespace-nowrap">بنتاكام</TabsTrigger>
                            <TabsTrigger value="investigation" className="text-sm whitespace-nowrap">التحاليل و الأشعة</TabsTrigger>
                            <TabsTrigger value="diagnosis" className="text-sm whitespace-nowrap">التشخيص</TabsTrigger>
                            <TabsTrigger value="treatment" className="text-sm whitespace-nowrap">العلاج</TabsTrigger>
                          </TabsList>

                          {/* Medical History Tab */}
                          <TabsContent value="medical-history" className="mt-6 space-y-4">
                            <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                              <h3 className="text-base font-semibold mb-5">التاريخ المرضي</h3>
                              <div>
                                <Textarea
                                  value={patientFormData.medicalHistory}
                                  onChange={(e) =>
                                    setPatientFormData((prev) => ({ ...prev, medicalHistory: e.target.value }))
                                  }
                                  placeholder="اكتب التاريخ المرضي هنا..."
                                  className="mt-1"
                                  rows={4}
                                />
                              </div>
                            </div>
                          </TabsContent>

                          {/* Measurements Tab (AutoRef | IOP + Refraction) */}
                          <TabsContent value="measurements" className="mt-6">
                            {/* Desktop: 2-column grid, Mobile: stacked */}
                            <div className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                              {/* AutoRef | IOP - Responsive Cards */}
                              <div className="border-b pb-2 pt-1 md:border-b-0 flex-1 flex flex-col">
                              <h3 className="text-base font-semibold mb-6">AutoRef | IOP</h3>
                              <div className="hidden md:block overflow-x-auto rounded-xl border border-blue-200">
                                <table className="w-full border-collapse text-center text-xs sm:text-sm" dir="ltr">
                                  <thead className="bg-blue-50">
                                    <tr>
                                      <th className="border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">Eye</th>
                                      <th className="border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">UCVA</th>
                                      <th className="border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">S</th>
                                      <th className="border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">C</th>
                                      <th className="border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">Axis</th>
                                      <th className="border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">IOP</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {["od", "os"].map((eye) => (
                                      <tr key={eye} className="bg-white hover:bg-blue-50">
                                        <td className="border border-blue-200 px-3 py-2 font-bold">{eye === "od" ? "OD" : "OS"}</td>
                                        <td className="border border-blue-200 px-3 py-2">
                                          {(patientFormData.measurements?.autoref?.[eye as "od" | "os"]?.ucva ?? "—") as string}
                                        </td>
                                        <td className="border border-blue-200 px-3 py-2">
                                          {(patientFormData.measurements?.autoref?.[eye as "od" | "os"]?.s ?? "—") as string}
                                        </td>
                                        <td className="border border-blue-200 px-3 py-2">
                                          {(patientFormData.measurements?.autoref?.[eye as "od" | "os"]?.c ?? "—") as string}
                                        </td>
                                        <td className="border border-blue-200 px-3 py-2">
                                          {(patientFormData.measurements?.autoref?.[eye as "od" | "os"]?.axis ?? "—") as string}
                                        </td>
                                        <td className="border border-blue-200 px-3 py-2">
                                          {(patientFormData.measurements?.iop?.[eye as "od" | "os"] ?? "—") as string}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {/* Mobile Card - Refraction-style layout */}
                              <div className="md:hidden border border-blue-200 rounded-lg p-4 bg-blue-50">
                                <div className="mb-4">
                                  <div className="text-xs font-semibold text-blue-700 mb-2">UCVA</div>
                                  <div className="flex gap-2">
                                    <Input
                                      value={patientFormData.measurements?.autoref?.od?.ucva || ""}
                                      onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements.autoref, od: { ...prev.measurements.autoref.od, ucva: e.target.value } } } }))}
                                      placeholder="OD"
                                      className="h-8 w-20 text-xs text-center border-input"
                                    />
                                    <span className="text-slate-400">/</span>
                                    <Input
                                      value={patientFormData.measurements?.autoref?.os?.ucva || ""}
                                      onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements.autoref, os: { ...prev.measurements.autoref.os, ucva: e.target.value } } } }))}
                                      placeholder="OS"
                                      className="h-8 w-20 text-xs text-center border-input"
                                    />
                                  </div>
                                </div>
                                <div className="overflow-x-auto rounded border border-blue-200">
                                  <table className="w-full border-collapse text-center text-xs" dir="ltr">
                                    <thead className="bg-blue-50">
                                      <tr>
                                        <th className="border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700"></th>
                                        <th className="border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700">IOP</th>
                                        <th className="border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700">S</th>
                                        <th className="border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700">C</th>
                                        <th className="border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700">AX</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="bg-white hover:bg-blue-50">
                                        <td className="border border-blue-200 px-2 py-1 font-bold text-xs">OD</td>
                                        <td className="border border-blue-200 px-2 py-1">
                                          <Input value={patientFormData.measurements?.iop?.od || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, iop: { ...prev.measurements.iop, od: e.target.value } } }))} className="h-7 w-full text-xs text-center border-input" placeholder="—" />
                                        </td>
                                        <td className="border border-blue-200 px-2 py-1">
                                          <Input value={patientFormData.measurements?.autoref?.od?.s || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements.autoref, od: { ...prev.measurements.autoref.od, s: e.target.value } } } }))} className="h-7 w-full text-xs text-center border-input" placeholder="—" />
                                        </td>
                                        <td className="border border-blue-200 px-2 py-1">
                                          <Input value={patientFormData.measurements?.autoref?.od?.c || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements.autoref, od: { ...prev.measurements.autoref.od, c: e.target.value } } } }))} className="h-7 w-full text-xs text-center border-input" placeholder="—" />
                                        </td>
                                        <td className="border border-blue-200 px-2 py-1">
                                          <Input value={patientFormData.measurements?.autoref?.od?.axis || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements.autoref, od: { ...prev.measurements.autoref.od, axis: e.target.value } } } }))} className="h-7 w-full text-xs text-center border-input" placeholder="—" />
                                        </td>
                                      </tr>
                                      <tr className="bg-white hover:bg-blue-50">
                                        <td className="border border-blue-200 px-2 py-1 font-bold text-xs">OS</td>
                                        <td className="border border-blue-200 px-2 py-1">
                                          <Input value={patientFormData.measurements?.iop?.os || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, iop: { ...prev.measurements.iop, os: e.target.value } } }))} className="h-7 w-full text-xs text-center border-input" placeholder="—" />
                                        </td>
                                        <td className="border border-blue-200 px-2 py-1">
                                          <Input value={patientFormData.measurements?.autoref?.os?.s || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements.autoref, os: { ...prev.measurements.autoref.os, s: e.target.value } } } }))} className="h-7 w-full text-xs text-center border-input" placeholder="—" />
                                        </td>
                                        <td className="border border-blue-200 px-2 py-1">
                                          <Input value={patientFormData.measurements?.autoref?.os?.c || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements.autoref, os: { ...prev.measurements.autoref.os, c: e.target.value } } } }))} className="h-7 w-full text-xs text-center border-input" placeholder="—" />
                                        </td>
                                        <td className="border border-blue-200 px-2 py-1">
                                          <Input value={patientFormData.measurements?.autoref?.os?.axis || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements.autoref, os: { ...prev.measurements.autoref.os, axis: e.target.value } } } }))} className="h-7 w-full text-xs text-center border-input" placeholder="—" />
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>

                            {/* Refraction */}
                            <div className="border-b pb-2 pt-1 md:border-b-0 flex-1 flex flex-col">
                              <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-base font-semibold">👓 Refraction</h3>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-semibold text-slate-600">BCVA</label>
                                  <div className="flex gap-2">
                                    <Input
                                      value={refractionTableData.od.distBcva}
                                      onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, distBcva: e.target.value } }))}
                                      placeholder="OD"
                                      className="h-8 w-20 text-xs text-center border-input"
                                    />
                                    <span className="text-slate-400">/</span>
                                    <Input
                                      value={refractionTableData.os.distBcva}
                                      onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, distBcva: e.target.value } }))}
                                      placeholder="OS"
                                      className="h-8 w-20 text-xs text-center border-input"
                                    />
                                  </div>
                                </div>
                              </div>
                              {/* Desktop Table */}
                              <div className="hidden md:block overflow-x-auto rounded-xl border border-green-200">
                                <table className="w-full border-collapse text-center text-xs sm:text-sm" dir="ltr">
                                  <thead className="bg-green-50">
                                    {/* Eye headers */}
                                    <tr>
                                      <th className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700"></th>
                                      <th colSpan={3} className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700">OD</th>
                                      <th colSpan={3} className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700">OS</th>
                                    </tr>
                                    {/* S C AX headers */}
                                    <tr>
                                      <th className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700"></th>
                                      <th className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700">S</th>
                                      <th className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700">C</th>
                                      <th className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700">AX</th>
                                      <th className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700">S</th>
                                      <th className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700">C</th>
                                      <th className="border border-green-200 px-2 py-2 text-xs font-semibold text-green-700">AX</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* DIST row */}
                                    <tr className="bg-white hover:bg-green-50">
                                      <td className="border border-green-200 px-2 py-2 font-bold">DIST</td>
                                      <td className="border border-green-200 px-2 py-2">
                                        <Input
                                          value={refractionTableData.od.distS}
                                          onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, distS: e.target.value } }))}
                                          className="h-8 w-full text-xs text-center border-input"
                                          placeholder="—"
                                        />
                                      </td>
                                      <td className="border border-green-200 px-2 py-2">
                                        <Input
                                          value={refractionTableData.od.distC}
                                          onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, distC: e.target.value } }))}
                                          className="h-8 w-full text-xs text-center border-input"
                                          placeholder="—"
                                        />
                                      </td>
                                      <td className="border border-green-200 px-2 py-2">
                                        <Input
                                          value={refractionTableData.od.distAx}
                                          onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, distAx: e.target.value } }))}
                                          className="h-8 w-full text-xs text-center border-input"
                                          placeholder="—"
                                        />
                                      </td>
                                      <td className="border border-green-200 px-2 py-2">
                                        <Input
                                          value={refractionTableData.os.distS}
                                          onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, distS: e.target.value } }))}
                                          className="h-8 w-full text-xs text-center border-input"
                                          placeholder="—"
                                        />
                                      </td>
                                      <td className="border border-green-200 px-2 py-2">
                                        <Input
                                          value={refractionTableData.os.distC}
                                          onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, distC: e.target.value } }))}
                                          className="h-8 w-full text-xs text-center border-input"
                                          placeholder="—"
                                        />
                                      </td>
                                      <td className="border border-green-200 px-2 py-2">
                                        <Input
                                          value={refractionTableData.os.distAx}
                                          onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, distAx: e.target.value } }))}
                                          className="h-8 w-full text-xs text-center border-input"
                                          placeholder="—"
                                        />
                                      </td>
                                    </tr>
                                    {/* NEAR row */}
                                    <tr className="bg-white hover:bg-green-50">
                                      <td className="border border-green-200 px-2 py-2 font-bold">NEAR</td>
                                      <td colSpan={6} className="border border-green-200 px-2 py-2">
                                        <Input
                                          value={refractionTableData.near}
                                          onChange={(e) => setRefractionTableData((prev) => ({ ...prev, near: e.target.value }))}
                                          placeholder="Enter NEAR values..."
                                          className="h-8 w-full text-xs text-center border-input"
                                        />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Cards */}
                              <div className="md:hidden space-y-3">
                                {/* DIST Card */}
                                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                                  <div className="font-bold text-sm mb-3 text-green-900">DIST</div>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-xs font-semibold text-green-700 mb-2">OD</div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <Label className="text-xs text-green-600">S</Label>
                                          <Input value={refractionTableData.od.distS} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, distS: e.target.value } }))} className="h-8 text-xs text-center border-input" placeholder="—" />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-green-600">C</Label>
                                          <Input value={refractionTableData.od.distC} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, distC: e.target.value } }))} className="h-8 text-xs text-center border-input" placeholder="—" />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-green-600">AX</Label>
                                          <Input value={refractionTableData.od.distAx} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, distAx: e.target.value } }))} className="h-8 text-xs text-center border-input" placeholder="—" />
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-green-700 mb-2">OS</div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <Label className="text-xs text-green-600">S</Label>
                                          <Input value={refractionTableData.os.distS} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, distS: e.target.value } }))} className="h-8 text-xs text-center border-input" placeholder="—" />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-green-600">C</Label>
                                          <Input value={refractionTableData.os.distC} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, distC: e.target.value } }))} className="h-8 text-xs text-center border-input" placeholder="—" />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-green-600">AX</Label>
                                          <Input value={refractionTableData.os.distAx} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, distAx: e.target.value } }))} className="h-8 text-xs text-center border-input" placeholder="—" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {/* NEAR Card */}
                                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                                  <Label className="text-sm font-bold text-green-900 block mb-2">NEAR</Label>
                                  <Input value={refractionTableData.near} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, near: e.target.value }))} placeholder="Enter NEAR values..." className="h-8 w-full text-xs text-center border-input" />
                                </div>
                              </div>
                            </div>
                            </div>
                          </TabsContent>

                          {/* Pentacam Tab */}
                          <TabsContent value="pentacam" className="mt-6 space-y-4">
                            <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                              <h3 className="text-base font-semibold mb-6">🔬 بنتاكام</h3>
                              <div className="space-y-4">
                                <Button
                                  type="button"
                                  onClick={() => setPentacamImagesOpen(true)}
                                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
                                >
                                  <Eye className="h-4 w-4 ml-2" />
                                  عرض صور البنتاكام
                                </Button>
                              </div>
                              {/* Desktop Table */}
                              <div className="hidden md:block rounded-[1.25rem] border border-slate-200 bg-white overflow-x-auto">
                                <table className="w-full border-collapse text-center text-xs sm:text-sm" dir="ltr">
                                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                                    <tr>
                                      <th className="border px-3 py-3">Eye</th>
                                      <th className="border px-3 py-3">K1</th>
                                      <th className="border px-3 py-3">K2</th>
                                      <th className="border px-3 py-3">Thinnest</th>
                                      <th className="border px-3 py-3">Apex</th>
                                      <th className="border px-3 py-3">Residual</th>
                                      <th className="border px-3 py-3">TTT</th>
                                      <th className="border px-3 py-3">Ablation</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="bg-white text-sm font-medium text-slate-800">
                                      <td className="border px-3 py-3 font-bold">OD</td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.od?.k1 || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, k1: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.od?.k2 || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, k2: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.od?.thinnest || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, thinnest: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.od?.apex || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, apex: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.od?.residual || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, residual: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.od?.ttt || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, ttt: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.od?.ablation || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, ablation: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                    </tr>
                                    <tr className="bg-white text-sm font-medium text-slate-800">
                                      <td className="border px-3 py-3 font-bold">OS</td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.os?.k1 || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, k1: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.os?.k2 || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, k2: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.os?.thinnest || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, thinnest: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.os?.apex || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, apex: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.os?.residual || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, residual: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.os?.ttt || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, ttt: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                      <td className="border px-3 py-3">
                                        <Input type="number" value={patientFormData.pentacam?.os?.ablation || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, ablation: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Cards */}
                              <div className="md:hidden grid grid-cols-1 gap-3">
                                {["od", "os"].map((eye) => (
                                  <div key={eye} className="border border-slate-200 rounded-lg p-4 bg-white">
                                    <div className="font-bold text-sm mb-4 text-slate-900">{eye === "od" ? "OD (Right Eye)" : "OS (Left Eye)"}</div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs text-slate-500">K1</Label>
                                        <Input type="number" value={patientFormData.pentacam?.[eye as "od" | "os"]?.k1 || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], k1: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-xs text-center border-slate-300" />
                                      </div>
                                      <div>
                                        <Label className="text-xs text-slate-500">K2</Label>
                                        <Input type="number" value={patientFormData.pentacam?.[eye as "od" | "os"]?.k2 || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], k2: e.target.value } } }))} placeholder="—" className="h-8 text-xs text-center border-slate-300" />
                                      </div>
                                      <div>
                                        <Label className="text-xs text-slate-500">Thinnest</Label>
                                        <Input type="number" value={patientFormData.pentacam?.[eye as "od" | "os"]?.thinnest || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], thinnest: e.target.value } } }))} placeholder="—" className="h-8 text-xs text-center border-slate-300" />
                                      </div>
                                      <div>
                                        <Label className="text-xs text-slate-500">Apex</Label>
                                        <Input type="number" value={patientFormData.pentacam?.[eye as "od" | "os"]?.apex || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], apex: e.target.value } } }))} placeholder="—" className="h-8 text-xs text-center border-slate-300" />
                                      </div>
                                      <div>
                                        <Label className="text-xs text-slate-500">Residual</Label>
                                        <Input type="number" value={patientFormData.pentacam?.[eye as "od" | "os"]?.residual || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], residual: e.target.value } } }))} placeholder="—" className="h-8 text-xs text-center border-slate-300" />
                                      </div>
                                      <div>
                                        <Label className="text-xs text-slate-500">TTT</Label>
                                        <Input type="number" value={patientFormData.pentacam?.[eye as "od" | "os"]?.ttt || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], ttt: e.target.value } } }))} placeholder="—" className="h-8 text-xs text-center border-slate-300" />
                                      </div>
                                      <div className="col-span-2">
                                        <Label className="text-xs text-slate-500">Ablation</Label>
                                        <Input type="number" value={patientFormData.pentacam?.[eye as "od" | "os"]?.ablation || ""} onChange={(e) => setPatientFormData(prev => ({ ...prev, pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], ablation: e.target.value } } }))} placeholder="—" dir="ltr" className="h-8 text-xs text-center border-slate-300" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TabsContent>

                          {/* Investigation Tab */}
                          <TabsContent value="investigation" className="mt-6 space-y-4">
                            <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                              <h3 className="text-base font-semibold mb-6">التحاليل و الأشعة</h3>
                              <div className="space-y-6">
                                {/* Saved Test Requests Templates */}
                                <div>
                                  <div className="font-semibold text-slate-900 mb-3 text-sm">Saved Test Requests</div>
                                  {testRequestsQuery.isLoading ? (
                                    <div className="text-slate-500 text-sm">جاري التحميل...</div>
                                  ) : testRequestsQuery.isError ? (
                                    <div className="text-red-500 text-sm">خطأ في تحميل الطلبات</div>
                                  ) : !testRequestsQuery.data || Object.keys(testRequestsQuery.data).length === 0 ? (
                                    <div className="text-slate-500 text-xs">لا توجد طلبات محفوظة</div>
                                  ) : (
                                    <div className="space-y-2">
                                      {Object.entries(testRequestsQuery.data ?? {}).map(([templateId, template]: [string, any]) => (
                                        <div key={templateId} className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            type="button"
                                            className="justify-start flex-1 px-2 py-1 text-xs"
                                            onClick={() => {
                                              setSelectedTestRequestId(Number(templateId));
                                            }}
                                          >
                                            {template.name || templateId}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Search Tests */}
                                <div className="border-t border-slate-200 pt-4">
                                  <label className="font-semibold text-slate-900 text-sm block mb-2">Tests</label>
                                  <div className="relative mb-3">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                      placeholder="ابحث عن الفحوصات..."
                                      value={testSearchText}
                                      onChange={(e) => setTestSearchText(e.target.value)}
                                      className="pl-10 text-xs"
                                    />
                                  </div>
                                  {testSearchText && (
                                    <>
                                      {testsQuery.isLoading ? (
                                        <div className="text-slate-500 text-xs">جاري التحميل...</div>
                                      ) : testsQuery.isError ? (
                                        <div className="text-red-500 text-xs">خطأ في تحميل الفحوصات</div>
                                      ) : (
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded p-2">
                                          {(testsQuery.data ?? []).filter((test: any) => test.name.toLowerCase().includes(testSearchText.toLowerCase())).length === 0 ? (
                                            <div className="text-slate-500 text-xs">لا توجد نتائج</div>
                                          ) : (
                                            (testsQuery.data ?? []).filter((test: any) => test.name.toLowerCase().includes(testSearchText.toLowerCase())).map((test: any) => (
                                              <div key={test.id} className="flex items-center gap-2">
                                                <Checkbox
                                                  id={`test-${test.id}`}
                                                  checked={(patientFormData.tests || []).includes(test.id)}
                                                  onCheckedChange={() => toggleCheckbox("tests", test.id)}
                                                />
                                                <Label htmlFor={`test-${test.id}`} className="cursor-pointer text-xs flex-1">
                                                  {test.name}
                                                </Label>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          {/* Diagnosis Tab (Diagnosis + Diseases + Recommendations) */}
                          <TabsContent value="diagnosis" className="mt-6 space-y-4">
                            <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                              <h3 className="text-base font-semibold mb-6">التشخيص</h3>
                              <div className="flex flex-col gap-4">
                                {/* Top Row: Diagnosis & Diseases */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Diagnosis Text */}
                                  <div>
                                    <Label htmlFor="diagnosis" className="text-sm font-medium">Diagnosis</Label>
                                    <textarea
                                      id="diagnosis"
                                      value={patientFormData.diagnosis}
                                      onChange={(e) => setPatientFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                                      className="w-full min-h-32 mt-2 p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                                      placeholder="Enter diagnosis details..."
                                    />
                                  </div>

                                  {/* Diseases */}
                                  <div>
                                    <Label className="text-sm font-medium block mb-2">Diseases</Label>
                                  {(patientFormData.diseases || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      {(patientFormData.diseases || []).map((diseaseId) => {
                                        const disease = diseasesQuery.data?.find((d: any) => d.id === diseaseId);
                                        return disease ? (
                                          <div key={diseaseId} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-2">
                                            {disease.name}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setPatientFormData((prev) => ({
                                                  ...prev,
                                                  diseases: (prev.diseases || []).filter((d) => d !== diseaseId)
                                                }));
                                              }}
                                              className="font-bold text-sm"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ) : null;
                                      })}
                                    </div>
                                  )}
                                  <div className="relative mb-3">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                      placeholder="ابحث عن الأمراض..."
                                      value={diseaseSearchText}
                                      onChange={(e) => setDiseaseSearchText(e.target.value)}
                                      className="pl-10 text-xs"
                                    />
                                  </div>
                                  {diseaseSearchText && (
                                    <>
                                      {diseasesQuery.isLoading ? (
                                        <div className="text-slate-500 text-xs">جاري التحميل...</div>
                                      ) : diseasesQuery.isError ? (
                                        <div className="text-red-500 text-xs">خطأ في تحميل الأمراض</div>
                                      ) : (
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded p-2">
                                          {(diseasesQuery.data ?? []).filter((disease: any) => disease.name.toLowerCase().includes(diseaseSearchText.toLowerCase())).length === 0 ? (
                                            <div className="text-slate-500 text-xs">لا توجد نتائج</div>
                                          ) : (
                                            (diseasesQuery.data ?? []).filter((disease: any) => disease.name.toLowerCase().includes(diseaseSearchText.toLowerCase())).map((disease: any) => (
                                              <div key={disease.id} className="flex items-center gap-2">
                                                <Checkbox
                                                  id={`disease-${disease.id}`}
                                                  checked={(patientFormData.diseases || []).includes(disease.id)}
                                                  onCheckedChange={() => {
                                                    setPatientFormData((prev) => {
                                                      const diseases = prev.diseases || [];
                                                      if (diseases.includes(disease.id)) {
                                                        return { ...prev, diseases: diseases.filter((d) => d !== disease.id) };
                                                      } else {
                                                        return { ...prev, diseases: [...diseases, disease.id] };
                                                      }
                                                    });
                                                  }}
                                                />
                                                <Label htmlFor={`disease-${disease.id}`} className="cursor-pointer text-xs flex-1">
                                                  {disease.name}
                                                </Label>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  </div>
                                </div>

                                {/* Recommendations */}
                                <div className="border-t pt-4">
                                  <Label htmlFor="recommendations" className="text-sm font-medium block mb-2">Recommendations</Label>
                                  <textarea
                                    id="recommendations"
                                    value={patientFormData.recommendations}
                                    onChange={(e) => setPatientFormData((prev) => ({ ...prev, recommendations: e.target.value }))}
                                    className="w-full min-h-32 p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                                    placeholder="Enter recommendations..."
                                  />
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          {/* Treatment Tab */}
                          <TabsContent value="treatment" className="mt-6 space-y-4">
                            <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                              <h3 className="text-base font-semibold mb-6">العلاج</h3>
                              <div className="space-y-6">
                                {/* Saved Prescriptions Templates */}
                                <div>
                                  <div className="font-semibold text-slate-900 mb-3 text-sm">Saved Prescriptions</div>
                                  {prescriptionsQuery.isLoading ? (
                                    <div className="text-slate-500 text-sm">جاري التحميل...</div>
                                  ) : prescriptionsQuery.isError ? (
                                    <div className="text-red-500 text-sm">خطأ في تحميل الوصفات</div>
                                  ) : !prescriptionsQuery.data || Object.keys(prescriptionsQuery.data).length === 0 ? (
                                    <div className="text-slate-500 text-xs">لا توجد وصفات محفوظة</div>
                                  ) : (
                                    <>
                                      <Tabs value={prescriptionTab} onValueChange={setPrescriptionTab} dir="rtl" className="mb-3">
                                        <TabsList className="w-full justify-start gap-2 overflow-x-auto flex-nowrap">
                                          {READY_TABS.map((tab) => (
                                            <TabsTrigger key={tab} value={tab} className="text-xs whitespace-nowrap">
                                              {tab}
                                            </TabsTrigger>
                                          ))}
                                        </TabsList>
                                      </Tabs>
                                      {(() => {
                                        const filteredTemplates = Object.entries(prescriptionsQuery.data ?? {}).filter(
                                          ([_, template]: [string, any]) => getTemplateCategory(template.name || "") === prescriptionTab
                                        );
                                        const filteredTemplateIds = filteredTemplates.map(([id]) => id);
                                        const allFiltered = filteredTemplateIds.length > 0 && filteredTemplateIds.every(id => selectedPrescriptionIds.includes(id));

                                        return (
                                          <>
                                            <div className="flex flex-wrap items-center gap-2 rounded border p-2 mb-3">
                                              <label className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                  checked={allFiltered}
                                                  onCheckedChange={(checked) => {
                                                    if (Boolean(checked)) {
                                                      setSelectedPrescriptionIds(prev =>
                                                        Array.from(new Set([...prev, ...filteredTemplateIds]))
                                                      );
                                                    } else {
                                                      setSelectedPrescriptionIds(prev =>
                                                        prev.filter(id => !filteredTemplateIds.includes(id))
                                                      );
                                                    }
                                                  }}
                                                />
                                                تحديد الكل
                                              </label>
                                              <Select value={movePrescriptionTabTarget} onValueChange={setMovePrescriptionTabTarget}>
                                                <SelectTrigger className="w-[220px]">
                                                  <SelectValue placeholder="نقل إلى تاب" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {READY_TABS.map((tab) => (
                                                    <SelectItem key={`move-${tab}`} value={tab}>
                                                      {tab}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleMoveSelectedPrescriptions()}
                                                disabled={selectedPrescriptionIds.length === 0 || !movePrescriptionTabTarget}
                                              >
                                                نقل المحدد
                                              </Button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
                                              {filteredTemplates.map(([templateId, template]: [string, any]) => (
                                                <div key={templateId} className="flex items-center gap-1 text-xs">
                                                  <Checkbox
                                                    id={`presc-${templateId}`}
                                                    checked={selectedPrescriptionIds.includes(templateId)}
                                                    onCheckedChange={(checked) => {
                                                      setSelectedPrescriptionIds(prev =>
                                                        Boolean(checked)
                                                          ? [...prev, templateId]
                                                          : prev.filter(id => id !== templateId)
                                                      );
                                                    }}
                                                  />
                                                  <Button
                                                    variant="outline"
                                                    type="button"
                                                    className="justify-start flex-1 h-7 px-2 text-xs"
                                                    onClick={() => {
                                                      setSelectedPrescriptionId(Number(templateId));
                                                    }}
                                                  >
                                                    {template.name || templateId}
                                                  </Button>
                                                </div>
                                              ))}
                                              {filteredTemplates.length === 0 ? (
                                                <div className="col-span-full text-center text-xs text-slate-500 py-4">
                                                  لا توجد وصفات في هذا التاب
                                                </div>
                                              ) : null}
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </>
                                  )}
                                </div>

                                {/* Search Medications */}
                                <div className="border-t border-slate-200 pt-4">
                                  <label className="font-semibold text-slate-900 text-sm block mb-2">Medications</label>
                                  <div className="relative mb-3">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                      placeholder="ابحث عن الأدوية..."
                                      value={medicationSearchText}
                                      onChange={(e) => setMedicationSearchText(e.target.value)}
                                      className="pl-10 text-xs"
                                    />
                                  </div>
                                  {medicationSearchText && (
                                    <>
                                      {medicationsQuery.isLoading ? (
                                        <div className="text-slate-500 text-xs">جاري التحميل...</div>
                                      ) : medicationsQuery.isError ? (
                                        <div className="text-red-500 text-xs">خطأ في تحميل العلاجات</div>
                                      ) : (
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded p-2">
                                          {(medicationsQuery.data ?? []).filter((med: any) => med.name.toLowerCase().includes(medicationSearchText.toLowerCase())).length === 0 ? (
                                            <div className="text-slate-500 text-xs">لا توجد نتائج</div>
                                          ) : (
                                            (medicationsQuery.data ?? []).filter((med: any) => med.name.toLowerCase().includes(medicationSearchText.toLowerCase())).map((med: any) => (
                                              <div key={med.id} className="flex items-center gap-2">
                                                <Checkbox
                                                  id={`med-${med.id}`}
                                                  checked={(patientFormData.treatment || []).includes(med.id)}
                                                  onCheckedChange={() => toggleCheckbox("treatment", med.id)}
                                                />
                                                <Label htmlFor={`med-${med.id}`} className="cursor-pointer text-xs flex-1">
                                                  {med.name}
                                                </Label>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>

                      {/* Medical File Footer with Close Button */}
                      <div className="border-t p-4 bg-slate-50 flex justify-end gap-2 flex-shrink-0">
                        <Button variant="outline" onClick={() => setSelectedPatientId(null)}>
                          إغلاق
                        </Button>
                      </div>
                    </div>

                    {/* Save Status - Auto-save disabled */}
                    {/* <div className="text-xs text-muted-foreground px-2 py-2 border-t">
                      {isSaving ? "جاري الحفظ..." : lastSaveTime ? `آخر حفظ: ${lastSaveTime.toLocaleTimeString("ar-EG")}` : ""}
                    </div> */}

                    {/* Pentacam Images Modal */}
                    <Dialog open={pentacamImagesOpen} onOpenChange={setPentacamImagesOpen}>
                      <DialogContent className="max-h-[90vh] w-[96vw] max-w-4xl overflow-hidden p-0 flex flex-col">
                        <DialogHeader className="border-b px-6 py-4">
                          <DialogTitle className="text-base sm:text-lg">صور البنتاكام</DialogTitle>
                        </DialogHeader>
                        <div className="overflow-y-auto flex-1">
                          <div className="px-6 py-4">
                            {selectedPatientId && (
                              <PentacamFilesPanel
                                patientId={selectedPatientId}
                                compact={false}
                                active={pentacamImagesOpen}
                              />
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : null}
              </div>
              )}

            </div>

          </div>

          {/* Floating Side Panel - Dashboard Cards */}
          <>
            {dailyBoardOpen && (
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setDailyBoardOpen(false)} />
            )}
            <div className={`fixed top-0 right-0 h-screen w-80 sm:w-96 z-50 transition-transform duration-300 ${dailyBoardOpen ? "translate-x-0" : "translate-x-full"}`}>
              <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-2xl h-full rounded-none flex flex-col">
                <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.95))] p-3 md:p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base md:text-lg text-slate-900">القائمة</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDailyBoardOpen(false)}
                      className="h-8 w-8 p-0 hover:bg-slate-100"
                      title="إغلاق"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 overflow-y-auto flex-1">
                  {user?.role !== "admin" && permissionsQuery.isSuccess && displayMainCards.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">لا توجد صلاحيات مفعلة لهذا المستخدم</div>
                  ) : permissionsQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="space-y-2">
                          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
                          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {displayMainCards.map((card: any, index: number) => renderCard(card, index))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>

        </main>
      </PullToRefresh>

      {/* Medical File Panel Modal */}
      {selectedPatientForMedicalFile && (
        <MedicalFilePanel
          patientId={selectedPatientForMedicalFile}
          onClose={() => setSelectedPatientForMedicalFile(null)}
        />
      )}
    </div>
  );
}

function ReceptionPatientInfoPanel({
  canEditPatientData,
  onOpenExamination,
  onSetSelectedPatientId,
  examinationDate,
  onExaminationDateChange,
}: {
  canEditPatientData: boolean;
  onOpenExamination: () => void;
  onSetSelectedPatientId: (id: number) => void;
  examinationDate?: string;
  onExaminationDateChange?: (date: string) => void;
}) {
  const mapSheetTypeToLegacyService = (
    value: unknown
  ): "consultant" | "specialist" | "lasik" | "surgery" | "external" => {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === "pentacam_c" || raw === "pentacam_center" || raw === "pentacam" || raw === "radiology_center") return "lasik";
    if (
      raw === "pentacam_ex" ||
      raw === "pentacam_ex_c" ||
      raw === "pentacam_external" ||
      raw === "radiology_external" ||
      raw === "surgery_external"
    ) {
      return "external";
    }
    if (raw === "specialist" || raw === "lasik" || raw === "surgery" || raw === "external") return raw;
    return "consultant";
  };
  const normalizeServiceType = (
    value: unknown
  ):
    | "consultant"
    | "specialist"
    | "lasik"
    | "surgery"
    | "external"
    | "pentacam_c"
    | "pentacam_ex"
    | "pentacam_ex_c" => {
    const raw = String(value ?? "").trim().toLowerCase();
    if (
      raw === "specialist" ||
      raw === "lasik" ||
      raw === "surgery" ||
      raw === "external" ||
      raw === "pentacam_c" ||
      raw === "pentacam_ex" ||
      raw === "pentacam_ex_c"
    ) {
      return raw;
    }
    if (raw === "pentacam" || raw === "pentacam_center" || raw === "radiology_center") return "pentacam_c";
    if (raw === "pentacam_external" || raw === "radiology_external") return "pentacam_ex";
    return "consultant";
  };
  const normalizeDoctorTypeToSheet = (value: unknown): "consultant" | "specialist" | "external" => {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === "specialist" || raw === "spec" || raw.includes("special")) return "specialist";
    if (raw === "external" || raw.includes("خار")) return "external";
    return "consultant";
  };
  const formatPatientCode = (value: string) => {
    const raw = String(value ?? "").trim().toUpperCase();
    if (!raw) return "";
    if (/^\d+$/.test(raw)) return raw.padStart(4, "0");
    return raw.replace(/\s+/g, "");
  };
  const calculateAgeFromDob = (dob: string) => {
    const raw = String(dob ?? "").trim();
    if (!raw) return "";
    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.valueOf())) return "";
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
      age -= 1;
    }
    return age >= 0 ? String(age) : "";
  };
  const utils = trpc.useUtils();
  const [patientInfo, setPatientInfo] = useState({ id: 0, name: "", code: "" });
  const [patientDetails, setPatientDetails] = useState({
    dateOfBirth: "",
    age: "",
    address: "",
    phone: "",
    job: "",
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [serviceType, setServiceType] = useState<
    | "consultant"
    | "specialist"
    | "lasik"
    | "surgery"
    | "external"
    | "pentacam_c"
    | "pentacam_ex"
    | "pentacam_ex_c"
  >("consultant");
  const [serviceCode, setServiceCode] = useState("");
  const [serviceQty, setServiceQty] = useState("2");
  const [serviceFlags, setServiceFlags] = useState({
    consultation: false,
    examination: false,
    imaging: false,
  });
  const [serviceNotes, setServiceNotes] = useState({
    consultation: "",
    examination: "",
    imaging: "",
  });
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [patientPanelOpen, setPatientPanelOpen] = useState(() => getPanelState("patientPanelOpen", true));
  const [patientFormData, setPatientFormData] = useState<any>({
    medicalHistory: "", symptoms: [], measurements: { autoref: { od: { s: "", c: "", axis: "", ucva: "", bcva: "" }, os: { s: "", c: "", axis: "", ucva: "", bcva: "" } }, iop: { od: "", os: "" } },
    glasses: { od: { s: "", c: "", axis: "", pd: "", bcva: "" }, os: { s: "", c: "", axis: "", pd: "", bcva: "" } },
    pentacam: { od: { k1: "", k2: "", axis: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" }, os: { k1: "", k2: "", axis: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" } },
    tests: [], treatment: [], diagnosis: "", diseases: [], recommendations: "",
  });
  const [refractionTableData, setRefractionTableData] = useState<any>({ od: { distBcva: "", distS: "", distC: "", distAx: "" }, os: { distBcva: "", distS: "", distC: "", distAx: "" }, near: "" });
  const [selectedExaminationId, setSelectedExaminationId] = useState<number | null>(null);

  // Sync examinationDate from parent when it changes
  useEffect(() => {
    console.log("🔄 ReceptionPatientInfoPanel examinationDate changed:", examinationDate);
    if (examinationDate && examinationDate !== "") {
      setVisitDate(examinationDate);
      console.log("✅ Synced visitDate from parent examinationDate:", examinationDate);
    }
  }, [examinationDate]);

  // Log when patientInfo is updated
  useEffect(() => {
    console.log("👤 ReceptionPatientInfoPanel patientInfo:", { id: patientInfo.id, name: patientInfo.name });
  }, [patientInfo.id]);

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientInfo.id,
    { enabled: Boolean(patientInfo.id), refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, refetchOnReconnect: false }
  );
  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientInfo.id, page: "examination" },
    { enabled: Boolean(patientInfo.id), refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, refetchOnReconnect: false }
  );
  const createPatientMutation = trpc.medical.createPatient.useMutation();
  const updatePatientMutation = trpc.medical.updatePatient.useMutation();
  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  const updateExaminationMutation = trpc.medical.updateExamination.useMutation();
  const linkPatientServiceToMssqlMutation = trpc.medical.linkPatientServiceToMssql.useMutation();
  const hydratedPatientStateRef = useRef<number | null>(null);
  const serviceDirectoryQuery = trpc.medical.getServiceDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const doctorServiceMatchQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "doctor_service_sheet_match_v1" },
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, refetchOnReconnect: false }
  );
  const doctorsQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const availableDoctors = useMemo(
    () =>
      ((doctorsQuery.data ?? []) as Array<{ id: string; name: string; code: string; username?: string; doctorType?: string; isActive?: boolean }>)
        .filter((doctor) => doctor.isActive !== false)
        .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? ""), "en", { numeric: true })),
    [doctorsQuery.data]
  );
  const selectedDoctorEntry = useMemo(() => {
    if (!selectedDoctorId) return null;
    return availableDoctors.find((d) => d.id === selectedDoctorId) ?? null;
  }, [availableDoctors, selectedDoctorId]);
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
  useEffect(() => {
    if (!selectedDoctorEntry) return;
    setServiceType(normalizeDoctorTypeToSheet((selectedDoctorEntry as any)?.doctorType ?? ""));
  }, [selectedDoctorEntry]);
  const selectedServiceOption = useMemo(
    () => serviceOptions.find((item) => item.code === serviceCode) ?? null,
    [serviceOptions, serviceCode]
  );
  useEffect(() => {
    if (!serviceCode) return;
    if (!serviceOptions.some((item) => item.code === serviceCode)) {
      setServiceCode("");
    }
  }, [serviceCode, serviceOptions]);
  // Auto-set sheet type based on selected service code
  useEffect(() => {
    if (!serviceCode || !serviceDirectoryQuery.data) return;
    const allServices = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    const selectedService = allServices.find((s) => String(s.code ?? "").trim() === serviceCode);
    if (selectedService) {
      const srvType = String(selectedService.serviceType ?? "").trim().toLowerCase();
      const mappedSrvType = normalizeServiceType(srvType);
      if (mappedSrvType) {
        console.log(`🔄 Auto-setting sheet type to "${mappedSrvType}" for service code ${serviceCode}`);
        setServiceType(mappedSrvType as any);
      }
    }
  }, [serviceCode, serviceDirectoryQuery.data]);
  useEffect(() => {
    setPanelState("patientPanelOpen", patientPanelOpen);
  }, [patientPanelOpen]);
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

  useEffect(() => {
    if (!patientQuery.data) return;
    const p = patientQuery.data as any;
    setPatientInfo({
      id: p.id ?? 0,
      name: p.fullName ?? "",
      code: p.patientCode ?? "",
    });
    // Helper to format date to YYYY-MM-DD - handle multiple date formats
    const formatDateForInput = (dateInput: any): string => {
      try {
        console.log("🔍 DOB raw input:", dateInput, "type:", typeof dateInput);

        // If it's already a Date object, use UTC components to avoid timezone issues
        if (dateInput instanceof Date) {
          const yyyy = dateInput.getUTCFullYear();
          const mm = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(dateInput.getUTCDate()).padStart(2, '0');
          const formatted = `${yyyy}-${mm}-${dd}`;
          console.log("✅ Converted Date object:", { input: dateInput.toString(), output: formatted });
          return formatted;
        }

        const str = String(dateInput).trim();

        // ISO format: "2005-09-27" or "2005-09-27T00:00:00" or "2005-09-27 12:34:56"
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          const [, yyyy, mm, dd] = isoMatch;
          const formatted = `${yyyy}-${mm}-${dd}`;
          console.log("✅ Extracted ISO date:", formatted);
          return formatted;
        }

        // mm/dd/yyyy format
        const mmDdYyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmDdYyyyMatch) {
          const [, mm, dd, yyyy] = mmDdYyyyMatch;
          const formatted = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
          console.log("✅ Extracted mm/dd/yyyy:", formatted);
          return formatted;
        }

        console.warn("⚠️ Could not parse date:", str);
        return "";
      } catch (e) {
        console.error("❌ DOB format error:", e, dateInput);
        return "";
      }
    };

    const formattedDOB = p.dateOfBirth ? formatDateForInput(p.dateOfBirth) : "";
    console.log("👤 Patient details loaded:", { dob: p.dateOfBirth, formatted: formattedDOB });
    setPatientDetails({
      dateOfBirth: formattedDOB,
      age: p.age != null ? String(p.age) : "",
      address: p.address ?? "",
      phone: p.phone ?? "",
      job: p.occupation ?? "",
    });
  }, [patientQuery.data]);

  useEffect(() => {
    hydratedPatientStateRef.current = null;
    // Sync patientInfo.id to selectedPatientId so medical queries can load
    if (patientInfo.id) {
      onSetSelectedPatientId(patientInfo.id);
      console.log("🔗 Synced selectedPatientId to:", patientInfo.id);
    }
  }, [patientInfo.id, onSetSelectedPatientId]);

  useEffect(() => {
    const stateData = (patientStateQuery.data as any)?.data;
    if (!stateData) return;
    if (hydratedPatientStateRef.current === patientInfo.id) return;
    const doctorFromState =
      String(stateData.doctorName ?? "").trim() ||
      String(stateData.signatures?.doctor ?? "").trim();
    if (doctorFromState) {
      // Look up doctor by name and set selectedDoctorId
      const matchedDoctor = availableDoctors.find((d) => {
        const dName = String(d.name ?? "").trim().toLowerCase();
        const inputName = doctorFromState.toLowerCase();
        return dName === inputName || dName.includes(inputName) || inputName.includes(dName);
      });
      if (matchedDoctor) {
        setSelectedDoctorId(matchedDoctor.id);
      }
    }
    const visitFromState = String(stateData.visitDate ?? "").trim();
    if (visitFromState) setVisitDate(visitFromState);
    if (stateData.serviceCode !== undefined) {
      setServiceCode(String(stateData.serviceCode ?? ""));
    }
    if (stateData.serviceQty !== undefined) {
      setServiceQty(String(stateData.serviceQty ?? "2") || "2");
    }
    const flags = stateData.serviceFlags;
    if (flags && typeof flags === "object") {
      setServiceFlags({
        consultation: Boolean((flags as any).consultation),
        examination: Boolean((flags as any).examination),
        imaging: Boolean((flags as any).imaging),
      });
    }
    const notes = stateData.serviceNotes;
    if (notes && typeof notes === "object") {
      setServiceNotes({
        consultation: String((notes as any).consultation ?? ""),
        examination: String((notes as any).examination ?? ""),
        imaging: String((notes as any).imaging ?? ""),
      });
    }
    hydratedPatientStateRef.current = patientInfo.id;
  }, [patientStateQuery.data, patientInfo.id]);

  useEffect(() => {
    setPatientDetails((prev) => ({
      ...prev,
      age: calculateAgeFromDob(prev.dateOfBirth),
    }));
  }, [patientDetails.dateOfBirth]);

  const handleSave = async () => {
    try {
      let targetPatientId = Number(patientInfo.id ?? 0);
      if (!targetPatientId) {
        if (!canEditPatientData) {
          toast.error("ليس لديك صلاحية تعديل بيانات المريض");
          return;
        }
        const fullName = String(patientInfo.name ?? "").trim();
        const phone = String(patientDetails.phone ?? "").trim();
        if (!fullName) {
          toast.error("Enter patient name first");
          return;
        }
        if (!phone) {
          toast.error("Enter patient phone first");
          return;
        }
        // Extract doctor code from selected doctor
        const doctorCode = selectedDoctorEntry ? String((selectedDoctorEntry as any)?.code ?? "").trim() : "";
        console.log(`[Dashboard] Selected doctor code: "${doctorCode}"`);

        const mutationInput: any = {
          fullName,
          patientCode: formatPatientCode(patientInfo.code) || undefined,
          dateOfBirth: patientDetails.dateOfBirth || undefined,
          age: patientDetails.age ? Number(patientDetails.age) : undefined,
          phone,
          address: patientDetails.address || undefined,
          occupation: patientDetails.job || undefined,
          branch: "examinations",
          serviceType: mapSheetTypeToLegacyService(serviceType),
          serviceCode: serviceCode || undefined,
          locationType: "center",
          lastVisit: visitDate || undefined,
          ...(doctorCode ? { doctorCode } : {}),
        };

        const created = await createPatientMutation.mutateAsync(mutationInput);
        targetPatientId = Number((created as any)?.patientId ?? 0);
        if (!targetPatientId) {
          toast.error("Failed to create patient");
          return;
        }
        setPatientInfo((prev) => ({
          ...prev,
          id: targetPatientId,
          code: String((created as any)?.patientCode ?? prev.code ?? ""),
        }));
      } else if (canEditPatientData) {
        await updatePatientMutation.mutateAsync({
          patientId: targetPatientId,
          updates: {
            patientCode: formatPatientCode(patientInfo.code) || undefined,
            fullName: patientInfo.name || undefined,
            dateOfBirth: patientDetails.dateOfBirth || null,
            age: patientDetails.age ? Number(patientDetails.age) : null,
            address: patientDetails.address || null,
            phone: patientDetails.phone || null,
            occupation: patientDetails.job || null,
            serviceType: mapSheetTypeToLegacyService(serviceType),
          },
        });
      }
      // Prepare common data object for both page state and examination
      const commonExamData = {
        doctorName: selectedDoctorEntry ? String(selectedDoctorEntry.name ?? "") : "",
        visitDate,
        serviceType: mapSheetTypeToLegacyService(serviceType),
        serviceCode,
        serviceQty,
        serviceFlags,
        serviceNotes,
        signatures: { doctor: selectedDoctorEntry ? String(selectedDoctorEntry.name ?? "") : "" },
        // Medical measurements
        medicalHistory: patientFormData.medicalHistory || undefined,
        symptoms: patientFormData.symptoms && patientFormData.symptoms.length > 0 ? patientFormData.symptoms : undefined,
        measurements: patientFormData.measurements || undefined,
        glasses: patientFormData.glasses || undefined,
        pentacam: patientFormData.pentacam || undefined,
        tests: patientFormData.tests && patientFormData.tests.length > 0 ? patientFormData.tests : undefined,
        treatment: patientFormData.treatment && patientFormData.treatment.length > 0 ? patientFormData.treatment : undefined,
        diagnosis: patientFormData.diagnosis || undefined,
        diseases: patientFormData.diseases && patientFormData.diseases.length > 0 ? patientFormData.diseases : undefined,
        recommendations: patientFormData.recommendations || undefined,
        // Refraction measurements
        refraction: {
          od: {
            distBcva: refractionTableData.od.distBcva,
            distS: refractionTableData.od.distS,
            distC: refractionTableData.od.distC,
            distAx: refractionTableData.od.distAx,
          },
          os: {
            distBcva: refractionTableData.os.distBcva,
            distS: refractionTableData.os.distS,
            distC: refractionTableData.os.distC,
            distAx: refractionTableData.os.distAx,
          },
          near: refractionTableData.near,
        },
      };

      // Save to page state
      await savePatientStateMutation.mutateAsync({
        patientId: targetPatientId,
        page: "examination",
        data: commonExamData,
      });

      // Also update examination record if one is selected (for ExaminationForm to see changes)
      if (selectedExaminationId) {
        try {
          await updateExaminationMutation.mutateAsync({
            examinationId: selectedExaminationId,
            updates: {
              pageStateData: JSON.stringify(commonExamData),
              radiologyLabsNotes: JSON.stringify({
                ...patientFormData,
                refraction: commonExamData.refraction,
              }),
            },
          });
        } catch (error) {
          console.warn("Failed to update examination record:", error);
          // Continue anyway - page state was saved successfully
        }
      }
      const normalizedService = String(serviceCode ?? "").trim();
      if (normalizedService) {
        let patientCodeForMssql =
          formatPatientCode(patientInfo.code) ||
          String((patientQuery.data as any)?.patientCode ?? "").trim();

        if (!patientCodeForMssql && targetPatientId) {
          try {
            const freshPatient = await utils.patient.getPatient.fetch(targetPatientId);
            patientCodeForMssql = String((freshPatient as any)?.patientCode ?? "").trim();
            if (patientCodeForMssql) {
              setPatientInfo((prev) => ({ ...prev, code: patientCodeForMssql }));
            }
          } catch (error) {
            toast.error(getTrpcErrorMessage(error, "تعذر جلب كود المريض تلقائيًا"));
          }
        }

        if (!patientCodeForMssql) {
          toast.error("لم يتم العثور على كود المريض لتسجيل الخدمة في الحسابات");
        } else {
          const singleServiceCode =
            normalizedService
              .split(/[,\s]+/)
              .map((value) => value.trim())
              .filter(Boolean)[0] ?? "";
          if (singleServiceCode) {
            const parsedQty = Number.parseInt(String(serviceQty ?? ""), 10);
            const quantity = isPentacamService
              ? (Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 2)
              : 1;
            // No MSSQL sync for Dashboard (followups and existing patients)
            // await linkPatientServiceToMssqlMutation.mutateAsync({
            //   patientId: targetPatientId,
            //   serviceCode: singleServiceCode,
            //   quantity,
            //   doctorCode: String((selectedDoctorEntry as any)?.code ?? "").trim() || undefined,
            //   doctorName: String((selectedDoctorEntry as any)?.name ?? doctorName ?? "").trim() || undefined,
            // });
          }
        }
      }
      toast.success("Patient saved");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save patient"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">بيانات المريض</CardTitle>
            <CardDescription>حقول الفحص مع المدخلات</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setPatientPanelOpen((prev) => !prev)}
            title={patientPanelOpen ? "إغلاق بيانات المريض" : "فتح بيانات المريض"}
            aria-label={patientPanelOpen ? "إغلاق بيانات المريض" : "فتح بيانات المريض"}
          >
            {patientPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {patientPanelOpen ? (
      <CardContent className="space-y-4" dir="rtl">
        <div className="mb-2 flex justify-end">
          <PatientPicker
            onSelect={(patient) =>
              setPatientInfo({
                id: patient.id,
                name: patient.fullName ?? "",
                code: formatPatientCode(patient.patientCode ?? ""),
              })
            }
          />
        </div>

        <div className="space-y-3 text-xs" dir="rtl" style={{ textAlign: "center" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">الاسم</Label>
              <Input
                className="text-xs border-0 flex-1 min-w-0"
                style={{ textAlign: "right" }}
                value={patientInfo.name}
                onChange={(e) => setPatientInfo((p) => ({ ...p, name: e.target.value }))}
                readOnly={patientInfo.id > 0 || !canEditPatientData}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">تاريخ الميلاد</Label>
              <Input
                className="text-xs border-0 flex-1 min-w-0"
                style={{ textAlign: "right" }}
                type="date"
                value={patientDetails.dateOfBirth}
                onChange={(e) => setPatientDetails((p) => ({ ...p, dateOfBirth: e.target.value }))}
                readOnly={patientInfo.id > 0 || !canEditPatientData}
                disabled={patientInfo.id > 0 || !canEditPatientData}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">السن</Label>
              <Input className="text-xs border-0 flex-1 min-w-0" style={{ textAlign: "right" }} value={patientDetails.age} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">العنوان</Label>
              <Input
                className="text-xs border-0 flex-1 min-w-0"
                style={{ textAlign: "right" }}
                value={patientDetails.address}
                onChange={(e) => setPatientDetails((p) => ({ ...p, address: e.target.value }))}
                readOnly={!canEditPatientData}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">الموبايل</Label>
              <Input
                className="text-xs border-0 flex-1 min-w-0"
                style={{ textAlign: "right" }}
                value={patientDetails.phone}
                onChange={(e) => setPatientDetails((p) => ({ ...p, phone: e.target.value.replace(/\D+/g, "") }))}
                readOnly={!canEditPatientData}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">كود العميل</Label>
              <Input
                className="text-xs border-0 flex-1 min-w-0"
                style={{ textAlign: "right" }}
                value={patientInfo.code}
                onChange={(e) => setPatientInfo((p) => ({ ...p, code: formatPatientCode(e.target.value) }))}
                onBlur={(e) => setPatientInfo((p) => ({ ...p, code: formatPatientCode(e.target.value) }))}
                dir="ltr"
                readOnly={!canEditPatientData}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">الوظيفة</Label>
              <Input
                className="text-xs border-0 flex-1 min-w-0"
                style={{ textAlign: "right" }}
                value={patientDetails.job}
                onChange={(e) => setPatientDetails((p) => ({ ...p, job: e.target.value }))}
                readOnly={!canEditPatientData}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">الطبيب</Label>
              <SearchableCombobox
                value={selectedDoctorId}
                onChange={(value) => {
                  setSelectedDoctorId(value);
                  const doctor = availableDoctors.find((item) => item.id === value);
                  if (doctor) {
                    setServiceType(normalizeDoctorTypeToSheet(doctor.doctorType ?? ""));
                  }
                }}
                disabled={patientInfo.id > 0}
                options={availableDoctors.map((doctor) => ({
                  value: doctor.id,
                  label: `${doctor.code} - ${doctor.name}`,
                  keywords: `${doctor.code} ${doctor.name} ${doctor.username ?? ""}`,
                }))}
                placeholder={doctorsQuery.isLoading ? "Loading doctors..." : "اختر الطبيب"}
                searchPlaceholder="ابحث عن طبيب..."
                className="border-0 w-full sm:w-56 min-w-0"
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">تاريخ الكشف</Label>
              <Input
                className="text-xs border-0 flex-1 min-w-0"
                style={{ textAlign: "right" }}
                type="date"
                value={visitDate}
                onChange={(e) => {
                  setVisitDate(e.target.value);
                  onExaminationDateChange?.(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <Label className="font-bold">نوع الشيت</Label>
              <Select value={serviceType} onValueChange={(value) => setServiceType(normalizeServiceType(value))}>
                <SelectTrigger className="text-xs border-0 w-full min-w-0" style={{ textAlign: "right" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultant">استشاري</SelectItem>
                  <SelectItem value="specialist">اخصائي</SelectItem>
                  <SelectItem value="pentacam_c">Pentacam C</SelectItem>
                  <SelectItem value="pentacam_ex">Pentacam Ex</SelectItem>
                  <SelectItem value="pentacam_ex_c">Pentacam Ex.C</SelectItem>
                  <SelectItem value="lasik">ليزك</SelectItem>
                  <SelectItem value="surgery">عمليات</SelectItem>
                  <SelectItem value="external">خارجي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-3 flex-wrap">
              <label className="inline-flex items-center gap-1 text-sm whitespace-nowrap flex-row-reverse">
                <Checkbox
                  checked={serviceFlags.consultation}
                  onCheckedChange={(checked) =>
                    setServiceFlags((prev) => ({ ...prev, consultation: Boolean(checked) }))
                  }
                />
                كشف
                <Input
                  value={serviceNotes.consultation}
                  onChange={(e) =>
                    setServiceNotes((prev) => ({ ...prev, consultation: e.target.value }))
                  }
                  className="h-8 w-32 mr-1"
                  placeholder="تفاصيل كشف"
                />
              </label>
              <label className="inline-flex items-center gap-1 text-sm whitespace-nowrap flex-row-reverse">
                <Checkbox
                  checked={serviceFlags.examination}
                  onCheckedChange={(checked) =>
                    setServiceFlags((prev) => ({ ...prev, examination: Boolean(checked) }))
                  }
                />
                فحص
                <Input
                  value={serviceNotes.examination}
                  onChange={(e) =>
                    setServiceNotes((prev) => ({ ...prev, examination: e.target.value }))
                  }
                  className="h-8 w-32 mr-1"
                  placeholder="تفاصيل فحص"
                />
              </label>
              <label className="inline-flex items-center gap-1 text-sm whitespace-nowrap flex-row-reverse">
                <Checkbox
                  checked={serviceFlags.imaging}
                  onCheckedChange={(checked) =>
                    setServiceFlags((prev) => ({ ...prev, imaging: Boolean(checked) }))
                  }
                />
                اشعه
                <Input
                  value={serviceNotes.imaging}
                  onChange={(e) =>
                    setServiceNotes((prev) => ({ ...prev, imaging: e.target.value }))
                  }
                  className="h-8 w-32 mr-1"
                  placeholder="تفاصيل اشعه"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <Label htmlFor="srv-code" className="font-bold">الخدمة</Label>
              <SearchableCombobox
                value={serviceCode}
                onChange={(value) => setServiceCode(value)}
                options={[
                  { value: "", label: "—" },
                  ...serviceOptions.map((opt) => ({
                    value: opt.code,
                    label: `${opt.code} - ${opt.name}`,
                    keywords: `${opt.code} ${opt.name}`,
                  })),
                ]}
                placeholder="اختر الخدمة"
                searchPlaceholder="ابحث عن خدمة..."
                emptyText="لا توجد خدمات مطابقة للطبيب"
                className="border-0 w-full sm:w-64 min-w-0"
              />
            </div>
            {isPentacamService ? (
              <div className="flex items-center gap-2 min-w-0">
                <Label htmlFor="srv-qty" className="font-bold">الكمية</Label>
                <Select value={serviceQty || "2"} onValueChange={(value) => setServiceQty(value)}>
                  <SelectTrigger id="srv-qty" className="text-xs border-0 w-full sm:w-32 min-w-0">
                    <SelectValue placeholder="الكمية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </div>

          <div className="flex flex-wrap gap-2">
          <Button
            className="bg-sky-600 text-white hover:bg-sky-700"
            onClick={handleSave}
            disabled={createPatientMutation.isPending || updatePatientMutation.isPending || savePatientStateMutation.isPending}
          >
             حفظ
           </Button>
          <Button
            variant="outline"
            className="border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100"
            onClick={onOpenExamination}
          >
            فتح شاشة الفحص
          </Button>
          </div>
      </CardContent>
      ) : null}
    </Card>
  );
}
















