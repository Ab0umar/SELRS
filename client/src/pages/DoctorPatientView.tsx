import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Stethoscope } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";

export default function DoctorPatientView() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/doctor/patient/:id");
  const patientId = params?.id ? Number(params.id) : 0;

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const prescriptionsQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const patient = patientQuery.data as any;
  const examinations = useMemo(() => {
    return Array.isArray(examinationsQuery.data) ? (examinationsQuery.data as any[]) : [];
  }, [examinationsQuery.data]);

  const reports = useMemo(() => {
    return Array.isArray(reportsQuery.data) ? (reportsQuery.data as any[]) : [];
  }, [reportsQuery.data]);

  const prescriptions = useMemo(() => {
    return Array.isArray(prescriptionsQuery.data) ? (prescriptionsQuery.data as any[]) : [];
  }, [prescriptionsQuery.data]);

  const latestExam = examinations[0];
  const latestReport = reports[0];
  const latestPrescription = prescriptions[0];

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen selrs-page-bg" dir="rtl">
      <PageHeader backTo="/dashboard" />
      <main className="container mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-4">
        {/* Patient Picker */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">اختر المريض</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientPicker
              onSelect={(patient) => {
                if (patient?.id) {
                  setLocation(`/doctor/patient/${patient.id}`);
                }
              }}
            />
          </CardContent>
        </Card>

        {!patientId ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-sm text-slate-500">اختر مريضًا للعرض</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Latest Examination */}
            <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Latest Examination</CardTitle>
            </CardHeader>
            <CardContent>
              {latestExam ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">UCVA OD:</span>
                      <div className="font-semibold text-slate-900">{latestExam.ucvaOD || "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">UCVA OS:</span>
                      <div className="font-semibold text-slate-900">{latestExam.ucvaOS || "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">BCVA OD:</span>
                      <div className="font-semibold text-slate-900">{latestExam.bcvaOD || "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">BCVA OS:</span>
                      <div className="font-semibold text-slate-900">{latestExam.bcvaOS || "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">IOP OD:</span>
                      <div className="font-semibold text-slate-900">{latestExam.iopOD || "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">IOP OS:</span>
                      <div className="font-semibold text-slate-900">{latestExam.iopOS || "—"}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No examinations recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Latest Report */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Latest Report</CardTitle>
            </CardHeader>
            <CardContent>
              {latestReport ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-600">Diagnosis:</span>
                    <p className="mt-1 text-slate-900">{latestReport.diagnosis || "—"}</p>
                  </div>
                  {latestReport.treatment && (
                    <div>
                      <span className="text-sm text-slate-600">Treatment:</span>
                      <p className="mt-1 text-slate-900">{latestReport.treatment}</p>
                    </div>
                  )}
                  {latestReport.recommendations && (
                    <div>
                      <span className="text-sm text-slate-600">Recommendations:</span>
                      <p className="mt-1 text-slate-900">{latestReport.recommendations}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No reports available</p>
              )}
            </CardContent>
          </Card>

          {/* Latest Prescription */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Latest Prescription</CardTitle>
            </CardHeader>
            <CardContent>
              {latestPrescription ? (
                <div className="space-y-2">
                  {Array.isArray(latestPrescription.items) && latestPrescription.items.length > 0 ? (
                    <div className="space-y-2">
                      {latestPrescription.items.map((item: any, index: number) => (
                        <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="font-semibold text-slate-900">{item.medicationName}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            Dosage: {item.dosage || "—"} | Frequency: {item.frequency || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No medication items</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No prescriptions recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => setLocation(`/patients/${patientId}`)}
              className="flex-1"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Full Details
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/followup/${patientId}`)}
            >
              Add Follow-up
            </Button>
          </div>
          </div>
        )}
      </main>
    </div>
  );
}
