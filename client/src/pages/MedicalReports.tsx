import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Plus, Download, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import { OfflinePageState } from "@/components/OfflinePageState";

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatDisplayValue(item)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const maybeFundus = value as Record<string, unknown>;
    const fundusText = [
      maybeFundus.discStatus,
      maybeFundus.cupDiscRatio,
      maybeFundus.macuaStatus,
      maybeFundus.vesselStatus,
      maybeFundus.otherFindings,
    ]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join(", ");
    if (fundusText) return fundusText;
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

export default function MedicalReports() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/medical-reports/:id");
  const initialPatientId = params?.id ? Number(params.id) : 0;
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(initialPatientId > 0 ? initialPatientId : null);
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false }
  );
  const userStateQuery = trpc.medical.getUserPageState.useQuery(
    { page: "medical_reports" },
    { refetchOnWindowFocus: false }
  );
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();
  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHydrateUserStateRef = useRef(false);
  const patientQuery = trpc.patient.getPatient.useQuery(
    selectedPatientId ?? 0,
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false }
  );
  const prescriptionsQuery = trpc.medical.getPrescriptionsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false }
  );
  const prescriptionsWithItemsQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false }
  );
  const sheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: selectedPatientId ?? 0, sheetType: "consultant" },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false }
  );
  const createReportMutation = trpc.medical.createMedicalReport.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء التقرير بنجاح");
      reportsQuery.refetch();
    },
  });
  const updateReportMutation = trpc.medical.updateMedicalReport.useMutation({
    onSuccess: () => {
      toast.success("تم تعديل التقرير");
      reportsQuery.refetch();
    },
  });
  const deleteReportMutation = trpc.medical.deleteMedicalReport.useMutation({
    onSuccess: () => {
      toast.success("تم حذف التقرير");
      reportsQuery.refetch();
    },
  });
  const diseasesQuery = trpc.medical.getAllDiseases.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [diseaseSearch, setDiseaseSearch] = useState("");
  const [expandedDiseaseGroups, setExpandedDiseaseGroups] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    patientName: "",
    patientCode: "",
    phone: "",
    age: "",
    address: "",
    visitDate: new Date().toISOString().split("T")[0],
    operationType: "",
    diagnosis: "",
    diseases: [] as string[],
    recommendation: "",
    prescription: "",
    notes: "",
  });

  const buildPrescriptionTextFromRecord = (record: any): string => {
    if (!record) return "";
    const items = Array.isArray(record.items) ? record.items : [];
    const lines = items
      .map((item: any) => {
        const name = String(item?.medicationName ?? "").trim();
        const instructions = String(item?.instructions ?? "").trim();
        const parts = [
          String(item?.dosage ?? "").trim(),
          String(item?.frequency ?? "").trim(),
          String(item?.duration ?? "").trim(),
        ].filter(Boolean);
        const details = instructions || parts.join(" / ");
        if (!name && !details) return "";
        if (name && details) return `${name} - ${details}`;
        return name || details;
      })
      .filter(Boolean);
    if (lines.length > 0) return lines.join("\n");
    return String(record?.notes ?? "").trim();
  };
  const getPrescriptionCandidates = (recordsWithItems: any[], simpleRecords: any[]) => {
    const candidates: Array<{ id: string; date: string; text: string }> = [];
    const withItemsList = Array.isArray(recordsWithItems) ? recordsWithItems : [];
    for (const record of withItemsList) {
      const text = buildPrescriptionTextFromRecord(record);
      if (!text) continue;
      candidates.push({
        id: String(record?.id ?? ""),
        date: formatDateLabel(String(record?.prescriptionDate ?? "").split("T")[0]),
        text,
      });
    }
    if (candidates.length > 0) return candidates;
    const simpleList = Array.isArray(simpleRecords) ? simpleRecords : [];
    for (const record of simpleList) {
      const text = String(record?.notes ?? "").trim();
      if (!text) continue;
      candidates.push({
        id: String(record?.id ?? ""),
        date: formatDateLabel(String(record?.prescriptionDate ?? "").split("T")[0]),
        text,
      });
    }
    return candidates;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const fromRoute = Number(params?.id ?? 0);
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      setSelectedPatientId(fromRoute);
    }
  }, [params?.id]);

  useEffect(() => {
    const raw = localStorage.getItem("user_state_medical_reports");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.expandedDiseaseGroups)) setExpandedDiseaseGroups(data.expandedDiseaseGroups);
      if (typeof data.diseaseSearch === "string") setDiseaseSearch(data.diseaseSearch);
    } catch {
      // ignore bad cache
    }
  }, []);

  useEffect(() => {
    const data = (userStateQuery.data as any)?.data;
    if (!data) return;
    if (didHydrateUserStateRef.current) return;
    if (Array.isArray(data.expandedDiseaseGroups)) setExpandedDiseaseGroups(data.expandedDiseaseGroups);
    if (typeof data.diseaseSearch === "string") setDiseaseSearch(data.diseaseSearch);
    didHydrateUserStateRef.current = true;
  }, [userStateQuery.data]);

  useEffect(() => {
    const payload = {
      expandedDiseaseGroups,
      diseaseSearch,
    };
    localStorage.setItem("user_state_medical_reports", JSON.stringify(payload));
    if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    userStateTimerRef.current = setTimeout(() => {
      saveUserStateMutation.mutate({ page: "medical_reports", data: payload });
    }, 800);
    return () => {
      if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    };
  }, [expandedDiseaseGroups, diseaseSearch, saveUserStateMutation]);

  if (!isAuthenticated) return null;

  const canWriteReports = ["doctor", "admin"].includes(user?.role || "");
  const canDeleteReports = ["admin", "manager"].includes(user?.role || "");
  type ReportRow = {
    id: number;
    patientName: string;
    patientCode: string;
    patientAge?: string;
    date: string;
    doctor: string;
    diagnosis: string;
    diseases?: string[];
    recommendation: string;
    prescription?: string;
    notes?: string;
    operationType?: string;
    visitDate?: string;
  };

  const handleCreateReport = async () => {
    if (!selectedPatientId) {
      toast.error("يرجى اختيار المريض أولاً");
      return;
    }
    if (!formData.patientName || formData.diseases.length === 0) {
      toast.error("يرجى اختيار الأمراض");
      return;
    }

    try {
      if (selectedReport) {
        await updateReportMutation.mutateAsync({
          reportId: selectedReport.id,
          visitDate: formData.visitDate,
          diagnosis: formData.diagnosis,
          diseases: formData.diseases,
          prescription: formData.prescription,
          recommendations: formData.recommendation,
          clinicalOpinion: formData.notes,
          operationType: formData.operationType,
          additionalNotes: formData.notes,
        });
      } else {
        await createReportMutation.mutateAsync({
        patientId: selectedPatientId,
        visitDate: formData.visitDate,
        diagnosis: formData.diagnosis,
        diseases: formData.diseases,
        clinicalOpinion: formData.notes,
        recommendations: formData.recommendation,
        operationType: formData.operationType,
        prescription: formData.prescription,
        additionalNotes: formData.notes,
        });
      }
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء إنشاء التقرير"));
      return;
    }

    setFormData({
      patientName: "",
      patientCode: "",
      phone: "",
      age: "",
      address: "",
      visitDate: new Date().toISOString().split("T")[0],
      operationType: "",
      diagnosis: "",
      diseases: [],
      recommendation: "",
      prescription: "",
      notes: "",
    });
    setIsDialogOpen(false);
    setSelectedReport(null);
  };

  const handleDeleteReport = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف التقرير؟")) return;
    try {
      await deleteReportMutation.mutateAsync({ reportId: id });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء حذف التقرير"));
    }
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setFormData({
      patientName: report.patientName || "",
      patientCode: report.patientCode || "",
      phone: "",
      age: report.patientAge || "",
      address: "",
      visitDate: report.visitDate || new Date().toISOString().split("T")[0],
      operationType: report.operationType || "",
      diagnosis: report.diagnosis || "",
      diseases: report.diseases || [],
      recommendation: report.recommendation || "",
      prescription: report.prescription || "",
      notes: report.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDownloadReportPdf = (report?: ReportRow | null) => {
    if (report) {
      setSelectedReport(report);
    }
    window.setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    patientCode?: string | null;
  }) => {
    setSelectedPatientId(patient.id);
    setLocation(`/medical-reports/${patient.id}`);
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? "",
      patientCode: patient.patientCode ?? "",
    }));
  };

  useEffect(() => {
    const patient = patientQuery.data as any;
    if (!patient) return;
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? prev.patientName,
      patientCode: patient.patientCode ?? prev.patientCode,
      phone: patient.phone ?? "",
      age: patient.age != null ? String(patient.age) : "",
      address: patient.address ?? "",
    }));
  }, [patientQuery.data]);

  useEffect(() => {
    const diagnosisFromDiseases = formData.diseases.join("، ");
    if (formData.diagnosis === diagnosisFromDiseases) return;
    setFormData((prev) => ({
      ...prev,
      diagnosis: diagnosisFromDiseases,
    }));
  }, [formData.diseases, formData.diagnosis]);

  useEffect(() => {
    if (!sheetQuery.data) return;
    try {
      const parsed = JSON.parse(sheetQuery.data);
      if (parsed?.examData?.autorefraction) {
        const auto = parsed.examData.autorefraction;
        const summary = [
          `UCVA OD: ${auto?.od?.ucva ?? "-"}`,
          `UCVA OS: ${auto?.os?.ucva ?? "-"}`,
          `BCVA OD: ${auto?.od?.bcva ?? "-"}`,
          `BCVA OS: ${auto?.os?.bcva ?? "-"}`,
          `IOP OD: ${auto?.od?.iop ?? "-"}`,
          `IOP OS: ${auto?.os?.iop ?? "-"}`,
        ].join(" | ");
        setFormData((prev) => ({
          ...prev,
          notes: prev.notes ? prev.notes : summary,
        }));
      }
    } catch {
      // ignore
    }
  }, [sheetQuery.data]);

  useEffect(() => {
    const candidates = getPrescriptionCandidates(
      (prescriptionsWithItemsQuery.data ?? []) as any[],
      (prescriptionsQuery.data ?? []) as any[]
    );
    const latestText = candidates[0]?.text ?? "";
    if (!latestText) return;
    setFormData((prev) => ({
      ...prev,
      prescription: prev.prescription || latestText,
    }));
  }, [prescriptionsWithItemsQuery.data, prescriptionsQuery.data]);

  const handleLoadPrescriptionFromPage = () => {
    const candidates = getPrescriptionCandidates(
      (prescriptionsWithItemsQuery.data ?? []) as any[],
      (prescriptionsQuery.data ?? []) as any[]
    );
    if (candidates.length === 0) {
      toast.error("لا توجد روشتة محفوظة لهذا المريض");
      return;
    }
    if (candidates.length === 1) {
      setFormData((prev) => ({ ...prev, prescription: candidates[0].text }));
      toast.success("تم تحميل الروشتة من صفحة الروشتة");
      return;
    }
    const menu = candidates
      .map((item, index) => {
        const preview = item.text.replace(/\s+/g, " ").slice(0, 60);
        return `${index + 1}) ${item.date || "بدون تاريخ"} - ${preview}`;
      })
      .join("\n");
    const selectedRaw = window.prompt(`اختر رقم الروشتة:\n${menu}`, "1");
    if (!selectedRaw) return;
    const selectedIndex = Number(selectedRaw) - 1;
    if (!Number.isFinite(selectedIndex) || selectedIndex < 0 || selectedIndex >= candidates.length) {
      toast.error("اختيار غير صحيح");
      return;
    }
    setFormData((prev) => ({ ...prev, prescription: candidates[selectedIndex].text }));
    toast.success("تم تحميل الروشتة من صفحة الروشتة");
  };

  const parsedReports = useMemo(() => {
    const rows = reportsQuery.data ?? [];
    const patientName = (patientQuery.data as any)?.fullName ?? formData.patientName;
    const patientCode = (patientQuery.data as any)?.patientCode ?? formData.patientCode;
    const patientAgeRaw = (patientQuery.data as any)?.age;
    const patientAge = patientAgeRaw != null ? String(patientAgeRaw) : "";
    return rows.map((report: any) => {
      const diseases = (() => {
        try {
          return report.diseases ? JSON.parse(report.diseases) : [];
        } catch {
          return [];
        }
      })();
      return {
        id: report.id,
        patientName,
        patientCode,
        patientAge,
        date: (() => {
          const date = report.createdAt instanceof Date ? report.createdAt : new Date(report.createdAt);
          return Number.isNaN(date.valueOf()) ? "" : date.toISOString().split("T")[0];
        })(),
        doctor: user?.name || "",
        diagnosis: report.diagnosis ?? "",
        diseases,
        recommendation: report.recommendations ?? report.operationType ?? "",
        prescription: report.treatment ?? "",
        notes: report.clinicalOpinion ?? report.additionalNotes ?? "",
        operationType: report.operationType ?? "",
        visitDate: report.visitDate ? (typeof report.visitDate === 'string' ? report.visitDate.split('T')[0] : report.visitDate instanceof Date ? report.visitDate.toISOString().split('T')[0] : new Date(report.visitDate).toISOString().split('T')[0]) : "",
      };
    });
  }, [reportsQuery.data, formData.patientName, formData.patientCode, user?.name]);

  // Inline form panel — always visible on right side
  const FormPanel = () => (
    <Card className="text-right sticky top-4" dir="rtl">
      <CardHeader>
        <CardTitle>{selectedReport ? "تعديل التقرير" : "تقرير طبي جديد"}</CardTitle>
        <CardDescription>أدخل بيانات التقرير الطبي والروشتة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PatientPicker initialPatientId={selectedPatientId ?? undefined} onSelect={handleSelectPatient} />
        <Tabs defaultValue="patient-info" persistKey="medical-reports" className="w-full">
          <TabsList className="grid w-full grid-cols-3" dir="rtl">
            <TabsTrigger value="patient-info">المريض</TabsTrigger>
            <TabsTrigger value="diagnosis">التشخيص</TabsTrigger>
            <TabsTrigger value="prescription">الروشتة</TabsTrigger>
          </TabsList>

          <TabsContent value="patient-info" className="space-y-4" dir="rtl">
            <div>
              <Label htmlFor="patient-name">اسم المريض</Label>
              <Input id="patient-name" placeholder="أدخل اسم المريض" value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })} />
            </div>
            <div><Label>الهاتف</Label><Input value={formData.phone} readOnly /></div>
            <div><Label>العمر</Label><Input value={formData.age} readOnly /></div>
            <div><Label>العنوان</Label><Input value={formData.address} readOnly /></div>
            <div><Label>كود المريض</Label><Input value={formData.patientCode} readOnly /></div>
          </TabsContent>

          <TabsContent value="diagnosis" className="space-y-4" dir="rtl">
            <div>
              <Label htmlFor="visit-date">تاريخ الزيارة</Label>
              <Input id="visit-date" type="date" value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })} />
            </div>
            <div>
              <Label>نوع العملية</Label>
              <Input value={formData.operationType}
                onChange={(e) => setFormData({ ...formData, operationType: e.target.value })} />
            </div>
            <div>
              <Label>التشخيص</Label>
              <Input value={diseaseSearch} onChange={(e) => setDiseaseSearch(e.target.value)}
                placeholder="ابحث عن تشخيص..." className="mt-2 text-right" dir="rtl" />
              <div className="mt-2 space-y-3 max-h-60 overflow-y-auto">
                {Object.entries(
                  (diseasesQuery.data ?? [])
                    .filter((d: any) => `${d.abbrev || ""} ${d.name || ""}`.toLowerCase().includes(diseaseSearch.trim().toLowerCase()))
                    .reduce((acc: Record<string, any[]>, d: any) => {
                      const key = d.branch || "other";
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(d);
                      return acc;
                    }, {})
                ).map(([branch, items]) => (
                  <div key={branch} className="border rounded-lg p-3">
                    <button type="button" className="w-full flex items-center justify-between font-semibold"
                      onClick={() => setExpandedDiseaseGroups((prev) =>
                        prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch])}>
                      <span>{branch}</span>
                    </button>
                    {expandedDiseaseGroups.includes(branch) && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {items.map((d: any) => {
                          const label = d.abbrev || d.name;
                          return (
                            <label key={d.id} className="flex items-center gap-2">
                              <Checkbox checked={formData.diseases.includes(label)}
                                onCheckedChange={(checked) => {
                                  const next = new Set(formData.diseases);
                                  if (checked) next.add(label); else next.delete(label);
                                  setFormData({ ...formData, diseases: Array.from(next) });
                                }} />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>التوصية</Label>
              <Textarea value={formData.recommendation}
                onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                className="h-20" />
            </div>
            <div>
              <Label>ملاحظات إضافية</Label>
              <Textarea value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-20" />
            </div>
          </TabsContent>

          <TabsContent value="prescription" className="space-y-4" dir="rtl">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Label>الروشتة الطبية</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleLoadPrescriptionFromPage}>
                  تحميل من صفحة الروشتة
                </Button>
              </div>
              <Textarea value={formData.prescription}
                onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                className="h-32 mt-2" placeholder="أدخل الأدوية والتعليمات" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-2">
          {canWriteReports && (
            <Button onClick={handleCreateReport} className="flex-1 bg-primary hover:bg-primary/90">
              {selectedReport ? "تحديث التقرير" : "إنشاء التقرير"}
            </Button>
          )}
          {selectedReport && (
            <Button variant="outline" onClick={() => { setSelectedReport(null); setIsDialogOpen(false); }}>
              جديد
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-right">
      <PageHeader backTo="/dashboard" />

      <main className="container mx-auto px-4 py-8 print:p-0">
        {(reportsQuery.isError || patientQuery.isError) ? (
          <div className="mb-6">
            <OfflinePageState
              title="تعذر تحديث بيانات التقرير"
              body="بعض بيانات التقرير أو المريض غير متاحة الآن."
              onRetry={() => { void reportsQuery.refetch(); void patientQuery.refetch(); }}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form panel — always visible left 2/3 */}
          <div className="lg:col-span-2 print:hidden">
            <FormPanel />
          </div>

          {/* Reports List — right 1/3 */}
          <div className="print:hidden space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>التقارير الطبية</CardTitle>
                <CardDescription>عدد التقارير: {parsedReports.length}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!selectedPatientId ? (
                    <p className="text-center text-muted-foreground py-8">اختر مريضاً من النموذج لعرض تقاريره</p>
                  ) : reportsQuery.isLoading ? (
                    <p className="text-center text-muted-foreground py-8">جاري تحميل التقارير...</p>
                  ) : parsedReports.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">لا توجد تقارير</p>
                  ) : (
                    parsedReports.map((report) => (
                      <div key={report.id}
                        className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer ${selectedReport?.id === report.id ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => handleViewReport(report)}>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold">{report.patientName}</h3>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{report.date ? formatDateLabel(report.date) : ""}</p>
                            <p className="text-xs font-medium text-primary">{report.doctor}</p>
                          </div>
                        </div>
                        <div className="mb-3 text-sm">
                          <p className="mb-1"><span className="font-semibold">التشخيص:</span> {formatDisplayValue(report.diagnosis)}</p>
                          <p><span className="font-semibold">التوصية:</span> {formatDisplayValue(report.recommendation)}</p>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadReportPdf(report)}>
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                          {canDeleteReports && (
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteReport(report.id)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              حذف
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Print preview */}
            {selectedReport && (
              <Card>
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle>تقرير طبي</CardTitle>
                    <div className="flex items-center gap-3">
                      <img src="/logo.png" alt="Shorouk-Eyes Center" className="h-12 w-12 object-contain" />
                      <div className="text-right">
                        <p className="font-semibold leading-tight">Shorouk-Eyes Center</p>
                        <p className="text-xs text-muted-foreground leading-tight">For Lasik & Refractive Surgery</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4" dir="rtl">
                  <div className="flex flex-wrap gap-6 text-sm border-b pb-3">
                    <span><span className="font-semibold">الاسم: </span>{selectedReport.patientName}</span>
                    {selectedReport.patientAge && <span><span className="font-semibold">السن: </span>{selectedReport.patientAge}</span>}
                    {selectedReport.date && <span><span className="font-semibold">التاريخ: </span>{formatDateLabel(selectedReport.date)}</span>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">التشخيص</p>
                    <p className="text-sm">{formatDisplayValue(selectedReport.diagnosis)}</p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">التوصية</p>
                    <p className="text-sm">{formatDisplayValue(selectedReport.recommendation)}</p>
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 print:hidden"
                    onClick={() => handleDownloadReportPdf(selectedReport)}>
                    <FileText className="h-4 w-4 mr-2" />
                    تحميل كـ PDF
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </main>
      <style>{`
        @media print {
          @page {
            size: A5;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
