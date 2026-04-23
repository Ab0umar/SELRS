import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { ChevronDown, Edit, X, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Visits() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/visits/:id");
  const [patientId, setPatientId] = useState<number>(0);
  const [expandedVisit, setExpandedVisit] = useState<number | null>(null);
  const [editingVisitIndex, setEditingVisitIndex] = useState<number | null>(null);
  const [editingExamType, setEditingExamType] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editAutorefraction, setEditAutorefraction] = useState<any>(null);
  const [editPentacam, setEditPentacam] = useState<any>(null);

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const allVisitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: 0 },
    { refetchOnWindowFocus: false }
  );

  const patientVisitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const updateVisitDateMutation = trpc.medical.updateVisitDate.useMutation();
  const updateExamDataMutation = trpc.medical.updateVisitExamData.useMutation();

  const patient = patientQuery.data as any;
  const visits = patientId > 0
    ? (patientVisitsQuery.data ?? []) as any[]
    : (allVisitsQuery.data ?? []) as any[];
  const isLoading = patientId > 0 ? patientVisitsQuery.isLoading : allVisitsQuery.isLoading;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const routeId = Number((routeParams as any)?.id ?? 0);
    if (Number.isFinite(routeId) && routeId > 0) {
      setPatientId(routeId);
    }
  }, [routeParams]);

  const getPatientAge = (dob: string) => {
    if (!dob) return "-";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const day = dayNames[date.getDay()];
      const dateFormatted = date.toLocaleDateString("ar-EG");
      const time = date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      return `${day} - ${dateFormatted} ${time}`;
    } catch {
      return dateString;
    }
  };

  const handleStartEditDate = (visit: any) => {
    const dateObj = new Date(visit.visitDate);
    const dateStr = dateObj.toISOString().split("T")[0];
    setEditDate(dateStr);
  };

  const handleSaveDate = async (visit: any) => {
    if (!editDate) return;
    try {
      const result = await updateVisitDateMutation.mutateAsync({
        visitId: visit.id,
        visitDate: editDate
      });
      console.log("Date update result:", result);

      // Wait a moment then refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      await patientVisitsQuery.refetch();
      setEditingVisitIndex(null);
      setEditDate("");
    } catch (error) {
      console.error("Failed to update visit date:", error);
      alert("خطأ في حفظ التاريخ: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleStartEditExam = (examType: string, examData: any) => {
    setEditingExamType(examType);
    if (examType === "autorefraction") {
      setEditAutorefraction(JSON.parse(JSON.stringify(examData)));
    } else {
      setEditPentacam(JSON.parse(JSON.stringify(examData)));
    }
  };

  const handleSaveExam = async (visit: any, examType: string) => {
    try {
      const updates: any = {};
      if (examType === "autorefraction") {
        updates.autorefraction = editAutorefraction;
      } else {
        updates.pentacam = editPentacam;
      }

      await updateExamDataMutation.mutateAsync({
        visitId: visit.id,
        updates
      });
      patientVisitsQuery.refetch();
      setEditingExamType(null);
    } catch (error) {
      console.error("Failed to update exam:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader backTo="/dashboard" />
      <main className="w-full space-y-6 px-3 py-6 sm:px-4">
        <Card className="border-slate-200/80 shadow-sm">
          {/* Header with Patient Info / All Visits */}
          <CardHeader className="border-b border-slate-200 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Patient Info */}
              {patientId > 0 && patient ? (
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{patient?.fullName || "المريض"}</CardTitle>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                      <div>العمر: <span className="font-medium">{getPatientAge(patient?.dateOfBirth)} سنة</span></div>
                      <div>الدكتور: <span className="font-medium">{patient?.doctorName || "-"}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <CardTitle className="text-2xl">جميع الزيارات</CardTitle>
                  <div className="mt-2 text-sm text-slate-600">اختر مريض للتصفية</div>
                </div>
              )}

                {/* Patient Picker on the Right */}
                <div className="w-full sm:w-auto sm:min-w-[300px]">
                  <Card className="border-slate-200/80 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">اختيار المريض</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PatientPicker
                        initialPatientId={patientId > 0 ? patientId : undefined}
                        onSelect={(selected) => {
                          setPatientId(selected.id);
                          setExpandedVisit(null);
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardHeader>

          {/* Visits Content */}
          <CardContent className="pt-6">
            <div className="space-y-3">
              {isLoading && (
                <div className="text-center text-slate-500 py-8">جاري التحميل...</div>
              )}

              {!isLoading && visits.length === 0 && (
                <div className="text-center text-slate-500 py-8">لا توجد زيارات مسجلة</div>
              )}

              {visits.map((visit, index) => {
                const isExpanded = expandedVisit === index;
                const visitDate = visit.visitDate || visit.createdAt;
                const isEditingDate = editingVisitIndex === index;

                return (
                  <Card key={index} className="border-slate-200/80">
                      {/* Visit Header - Expandable */}
                      <CardHeader className="cursor-pointer hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setExpandedVisit(isExpanded ? null : index)}
                            className="flex-1 text-right flex items-center gap-2"
                          >
                            {isEditingDate ? (
                              <div className="flex-1 flex items-center gap-2">
                                <Input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="max-w-xs"
                                  dir="ltr"
                                />
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveDate(visit);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVisitIndex(null);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <CardTitle className="text-base flex items-center gap-2">
                                  {visit.patientName || "مريض"} - {formatDateTime(visitDate)}
                                  {visit.patientId && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLocation(`/patient-file/${visit.patientId}`);
                                      }}
                                      title="فتح ملف المريض"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  )}
                                </CardTitle>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            {!isEditingDate && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditDate(visit);
                                  setEditingVisitIndex(index);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <button
                              onClick={() => setExpandedVisit(isExpanded ? null : index)}
                              className="p-2"
                            >
                              <ChevronDown
                                className={`h-5 w-5 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Visit Details - Expandable Content */}
                      {isExpanded && (
                        <CardContent className="pt-4 space-y-6 border-t border-slate-200">
                          {/* Exam Data */}
                          {(visit.sphereOD || visit.sphereOS || visit.iopOD || visit.iopOS || visit.ucvaOD || visit.ucvaOS || visit.bcvaOD || visit.bcvaOS) && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">بيانات الفحص</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200">
                                      <th className="text-right px-2 py-2">القياس</th>
                                      <th className="text-center px-2 py-2">OD</th>
                                      <th className="text-center px-2 py-2">OS</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(visit.ucvaOD || visit.ucvaOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">UCVA</td>
                                        <td className="text-center px-2 py-2">{visit.ucvaOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.ucvaOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.bcvaOD || visit.bcvaOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">BCVA</td>
                                        <td className="text-center px-2 py-2">{visit.bcvaOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.bcvaOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.sphereOD || visit.sphereOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">Sphere</td>
                                        <td className="text-center px-2 py-2">{visit.sphereOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.sphereOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.cylinderOD || visit.cylinderOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">Cylinder</td>
                                        <td className="text-center px-2 py-2">{visit.cylinderOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.cylinderOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.axisOD || visit.axisOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">Axis</td>
                                        <td className="text-center px-2 py-2">{visit.axisOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.axisOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.iopOD || visit.iopOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">IOP</td>
                                        <td className="text-center px-2 py-2">{visit.iopOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.iopOS || "-"}</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {/* Autorefraction Data */}
                          {visit.autorefraction && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-slate-900">الأوتوريفراكشن</h4>
                                {editingExamType !== "autorefraction" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStartEditExam("autorefraction", visit.autorefraction)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              {editingExamType === "autorefraction" ? (
                                <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm">UCVA OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.ucva || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, ucva: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">UCVA OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.ucva || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, ucva: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">BCVA OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.bcva || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, bcva: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">BCVA OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.bcva || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, bcva: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">S OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.s || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, s: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">S OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.s || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, s: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">C OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.c || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, c: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">C OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.c || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, c: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">Axis OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.axis || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, axis: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">Axis OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.axis || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, axis: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveExam(visit, "autorefraction")}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      حفظ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingExamType(null)}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      إلغاء
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200">
                                        <th className="text-right px-2 py-2">المقياس</th>
                                        <th className="text-center px-2 py-2">OD</th>
                                        <th className="text-center px-2 py-2">OS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">UCVA</td>
                                        <td className="text-center px-2 py-2">{visit.autorefraction.od?.ucva || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.autorefraction.os?.ucva || "-"}</td>
                                      </tr>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">BCVA</td>
                                        <td className="text-center px-2 py-2">{visit.autorefraction.od?.bcva || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.autorefraction.os?.bcva || "-"}</td>
                                      </tr>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">S / C / A</td>
                                        <td className="text-center px-2 py-2">
                                          {visit.autorefraction.od?.s} / {visit.autorefraction.od?.c} / {visit.autorefraction.od?.axis}
                                        </td>
                                        <td className="text-center px-2 py-2">
                                          {visit.autorefraction.os?.s} / {visit.autorefraction.os?.c} / {visit.autorefraction.os?.axis}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Pentacam Data */}
                          {visit.pentacam && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-slate-900">البنتاكام</h4>
                                {editingExamType !== "pentacam" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStartEditExam("pentacam", visit.pentacam)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              {editingExamType === "pentacam" ? (
                                <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm">K1 OD</Label>
                                      <Input
                                        value={editPentacam?.od?.k1 || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            od: { ...editPentacam.od, k1: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">K1 OS</Label>
                                      <Input
                                        value={editPentacam?.os?.k1 || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            os: { ...editPentacam.os, k1: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">K2 OD</Label>
                                      <Input
                                        value={editPentacam?.od?.k2 || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            od: { ...editPentacam.od, k2: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">K2 OS</Label>
                                      <Input
                                        value={editPentacam?.os?.k2 || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            os: { ...editPentacam.os, k2: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">Thinnest OD</Label>
                                      <Input
                                        value={editPentacam?.od?.thinnest || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            od: { ...editPentacam.od, thinnest: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">Thinnest OS</Label>
                                      <Input
                                        value={editPentacam?.os?.thinnest || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            os: { ...editPentacam.os, thinnest: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveExam(visit, "pentacam")}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      حفظ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingExamType(null)}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      إلغاء
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200">
                                        <th className="text-right px-2 py-2">المقياس</th>
                                        <th className="text-center px-2 py-2">OD</th>
                                        <th className="text-center px-2 py-2">OS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">K1 / K2</td>
                                        <td className="text-center px-2 py-2">
                                          {visit.pentacam.od?.k1} / {visit.pentacam.od?.k2}
                                        </td>
                                        <td className="text-center px-2 py-2">
                                          {visit.pentacam.os?.k1} / {visit.pentacam.os?.k2}
                                        </td>
                                      </tr>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">Thinnest Point</td>
                                        <td className="text-center px-2 py-2">{visit.pentacam.od?.thinnest || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.pentacam.os?.thinnest || "-"}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Empty State */}
                          {!visit.autorefraction && !visit.pentacam && (
                            <div className="text-center text-slate-500 py-4">
                              لا توجد بيانات مسجلة لهذه الزيارة
                            </div>
                          )}
                        </CardContent>
                      )}
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Patient Picker */}
        <div className="w-full sm:w-auto sm:min-w-[300px]">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">اختيار المريض</CardTitle>
            </CardHeader>
            <CardContent>
              <PatientPicker
                initialPatientId={patientId > 0 ? patientId : undefined}
                onSelect={(selected) => {
                  setPatientId(selected.id);
                  setExpandedVisit(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
