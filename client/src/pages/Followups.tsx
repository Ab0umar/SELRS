import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Followups() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [patientId, setPatientId] = useState<number>(0);
  const [expandedFollowup, setExpandedFollowup] = useState<number | null>(null);

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const allFollowupsQuery = trpc.medical.getPostOpFollowupsByPatient.useQuery(
    { patientId: 0 },
    { refetchOnWindowFocus: false }
  );

  const patientFollowupsQuery = trpc.medical.getPostOpFollowupsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const patient = patientQuery.data as any;
  const followups = patientId > 0
    ? (patientFollowupsQuery.data ?? []) as any[]
    : (allFollowupsQuery.data ?? []) as any[];
  const isLoading = patientId > 0 ? patientFollowupsQuery.isLoading : allFollowupsQuery.isLoading;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

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

  const formatDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      return value.map((item) => formatDisplayValue(item)).filter(Boolean).join(", ");
    }
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
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader backTo="/dashboard" />
      <main className="w-full space-y-6 px-3 py-6 sm:px-4">
        <Card className="border-slate-200/80 shadow-sm">
          {/* Header with Patient Info / Picker */}
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
                  <CardTitle className="text-2xl">جميع المتابعات</CardTitle>
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
                          setExpandedFollowup(null);
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardHeader>

          {/* Followups Content */}
          <CardContent className="pt-6">
            <div className="space-y-3">
              {isLoading && (
                <div className="text-center text-slate-500 py-8">جاري التحميل...</div>
              )}

              {!isLoading && followups.length === 0 && (
                <div className="text-center text-slate-500 py-8">لا توجد متابعات مسجلة</div>
              )}

              {followups.map((followup, index) => {
                const isExpanded = expandedFollowup === index;
                const followupDate = followup.followupDate || followup.createdAt;

                return (
                  <Card key={index} className="border-slate-200/80">
                      {/* Followup Header - Expandable */}
                      <button
                        onClick={() => setExpandedFollowup(isExpanded ? null : index)}
                        className="w-full text-right"
                      >
                        <CardHeader className="cursor-pointer hover:bg-slate-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base text-right">
                                متابعة: {formatDateTime(followupDate)}
                              </CardTitle>
                              {followup.status && (
                                <div className="mt-1 text-sm text-slate-600">
                                  الحالة: <span className="font-medium">{formatDisplayValue(followup.status)}</span>
                                </div>
                              )}
                            </div>
                            <ChevronDown
                              className={`h-5 w-5 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </CardHeader>
                      </button>

                      {/* Followup Details - Expandable Content */}
                      {isExpanded && (
                        <CardContent className="pt-4 space-y-6 border-t border-slate-200">
                          {/* History */}
                          {followup.notes && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">الملاحظات</h4>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{formatDisplayValue(followup.notes)}</p>
                            </div>
                          )}

                          {/* Symptoms */}
                          {followup.symptoms && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">الأعراض</h4>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{formatDisplayValue(followup.symptoms)}</p>
                            </div>
                          )}

                          {/* Vision Data */}
                          {(followup.ucvaOD || followup.bcvaOD) && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">قياسات الرؤية</h4>
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
                                    {(followup.ucvaOD || followup.ucvaOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">UCVA</td>
                                        <td className="text-center px-2 py-2">{followup.ucvaOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{followup.ucvaOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(followup.bcvaOD || followup.bcvaOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">BCVA</td>
                                        <td className="text-center px-2 py-2">{followup.bcvaOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{followup.bcvaOS || "-"}</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Pentacam Data */}
                          {(followup.k1OD || followup.k2OD) && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">البنتاكام</h4>
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
                                        {followup.k1OD} / {followup.k2OD}
                                      </td>
                                      <td className="text-center px-2 py-2">
                                        {followup.k1OS} / {followup.k2OS}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Eyeglass */}
                          {followup.glassPrescription && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">وصفة النظارة</h4>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{formatDisplayValue(followup.glassPrescription)}</p>
                            </div>
                          )}

                          {/* Medications */}
                          {followup.medications && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">الأدوية</h4>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{formatDisplayValue(followup.medications)}</p>
                            </div>
                          )}

                          {/* Diagnosis & Treatment */}
                          {(followup.diagnosis || followup.treatmentPlan) && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">التشخيص والعلاج</h4>
                              {followup.diagnosis && (
                                <div className="mb-2">
                                  <p className="text-xs text-slate-600 font-medium">التشخيص:</p>
                                  <p className="text-sm text-slate-700">{formatDisplayValue(followup.diagnosis)}</p>
                                </div>
                              )}
                              {followup.treatmentPlan && (
                                <div>
                                  <p className="text-xs text-slate-600 font-medium">خطة العلاج:</p>
                                  <p className="text-sm text-slate-700">{formatDisplayValue(followup.treatmentPlan)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Empty State */}
                          {!followup.notes && !followup.symptoms && !followup.ucvaOD && !followup.k1OD && !followup.glassPrescription && !followup.medications && !followup.diagnosis && (
                            <div className="text-center text-slate-500 py-4">
                              لا توجد بيانات مسجلة لهذه المتابعة
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
                onSelect={(selected) => {
                  setPatientId(selected.id);
                  setExpandedFollowup(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
