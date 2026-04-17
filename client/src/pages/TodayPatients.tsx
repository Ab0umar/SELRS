import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { Clock, User, Phone, MapPin } from "lucide-react";

export default function TodayPatients() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [visibleCount, setVisibleCount] = useState(20); // Show 20 appointments at a time
  const [loadDetails, setLoadDetails] = useState(true); // Load details by default when patient is selected

  const appointmentsQuery = trpc.medical.getAppointments.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: false, // Disable auto-refresh to improve performance with many patients
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const patientQuery = trpc.patient.getPatient.useQuery(
    selectedAppointment?.patientId,
    {
      enabled: !!selectedAppointment?.patientId && loadDetails,
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    }
  );

  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    selectedAppointment?.patientId,
    {
      enabled: !!selectedAppointment?.patientId && loadDetails,
    }
  );

  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: selectedAppointment?.patientId ?? 0 },
    {
      enabled: !!selectedAppointment?.patientId && loadDetails,
      staleTime: 0, // Always refetch when component remounts or query becomes enabled
    }
  );

  // Load autorefraction and glasses data from separate tables
  const autorefractometryQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: selectedAppointment?.patientId ?? 0 },
    {
      enabled: !!selectedAppointment?.patientId && loadDetails,
      staleTime: 0,
    }
  );

  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: selectedAppointment?.patientId ?? 0 },
    {
      enabled: !!selectedAppointment?.patientId && loadDetails,
      staleTime: 0,
    }
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const appointments = (appointmentsQuery.data ?? []) as any[];
  const todayDate = selectedDate;

  // Filter appointments for today
  const todayAppointments = appointments.filter((apt) => {
    if (!apt.appointmentDate) return false;
    const aptDate = new Date(apt.appointmentDate).toISOString().split("T")[0];
    return aptDate === todayDate;
  });

  // Sort by time
  const sortedAppointments = todayAppointments.sort((a, b) => {
    const timeA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
    const timeB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
    return timeA - timeB;
  });

  // Categorize appointments
  const getCategoryForAppointment = (apt: any): string[] => {
    const categories = [];

    // ليزك - Surgery/LASIK type
    if (apt.appointmentType?.toLowerCase() === "surgery") {
      categories.push("ليزك");
    }

    // استشاري/اخصائي - Based on doctor name
    // This would ideally come from a doctor role field
    // For now, we'll categorize based on appointment type
    if (!apt.appointmentType || apt.appointmentType?.toLowerCase() === "followup" || apt.appointmentType?.toLowerCase() === "examination") {
      categories.push("استشاري"); // Default category
    }

    return categories.length > 0 ? categories : ["عام"];
  };

  // Filter appointments by selected category
  const filteredAppointments = selectedCategory
    ? sortedAppointments.filter((apt) => {
        const categories = getCategoryForAppointment(apt);
        return categories.includes(selectedCategory);
      })
    : sortedAppointments;

  // Calculate category counts
  const categoryNames = ["استشاري", "اخصائي", "ليزك"];
  const categoryCounts = categoryNames.reduce((acc, cat) => {
    acc[cat] = sortedAppointments.filter((apt) => {
      const categories = getCategoryForAppointment(apt);
      return categories.includes(cat);
    }).length;
    return acc;
  }, {} as Record<string, number>);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "ongoing":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "examination":
        return "🔍";
      case "surgery":
        return "⚕️";
      case "followup":
        return "📋";
      default:
        return "📅";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "-";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <PageHeader backTo="/dashboard" />
      <main className="flex flex-1 overflow-hidden flex-row-reverse gap-4">
        {/* Main Content */}
        <div className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-6 sm:px-4 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">مرضى اليوم</h1>
            </div>
            <Button
              onClick={() => appointmentsQuery.refetch()}
              variant="outline"
            >
              تحديث
            </Button>
          </div>

          {/* Appointments Grid */}
          <div className="w-full">
          {appointmentsQuery.isLoading && (
            <Card className="border-slate-200/80">
              <CardContent className="py-12 text-center text-slate-500">
                جاري التحميل...
              </CardContent>
            </Card>
          )}

          {!appointmentsQuery.isLoading && sortedAppointments.length === 0 && (
            <Card className="border-slate-200/80">
              <CardContent className="py-12 text-center text-slate-500">
                لا توجد مواعيد اليوم
              </CardContent>
            </Card>
          )}

          {!appointmentsQuery.isLoading &&
            sortedAppointments.length > 0 &&
            filteredAppointments.length === 0 && (
              <Card className="border-slate-200/80">
                <CardContent className="py-12 text-center text-slate-500">
                  لا توجد مواعيد في هذه الفئة
                </CardContent>
              </Card>
            )}

          {filteredAppointments.length > 0 && (
            <div className="space-y-4">
              <div className="grid gap-4">
              {filteredAppointments.slice(0, visibleCount).map((appointment, index) => (
                <Card
                  key={index}
                  className={`border-slate-200/80 hover:shadow-md transition-shadow cursor-pointer ${
                    selectedAppointment?.patientId === appointment.patientId
                      ? "border-blue-400 shadow-md"
                      : ""
                  }`}
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      {/* Left: Patient Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">
                            {getTypeIcon(appointment.appointmentType)}
                          </span>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {appointment.patientName || "مريض"}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {appointment.patientCode && `رقم: ${appointment.patientCode}`}
                            </p>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          {appointment.patientPhone && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="h-4 w-4" />
                              <span>{appointment.patientPhone}</span>
                            </div>
                          )}
                          {appointment.doctorName && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <User className="h-4 w-4" />
                              <span>{appointment.doctorName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Time and Status */}
                      <div className="flex flex-col items-end gap-3">
                        {/* Time */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-slate-600" />
                          <span className="text-lg font-semibold text-slate-900">
                            {formatTime(appointment.appointmentDate)}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status === "completed"
                              ? "مكتمل"
                              : appointment.status === "ongoing"
                              ? "قيد المعالجة"
                              : appointment.status === "cancelled"
                              ? "ملغي"
                              : "في الانتظار"}
                          </Badge>
                          <Badge variant="outline">
                            {appointment.appointmentType === "examination"
                              ? "فحص"
                              : appointment.appointmentType === "surgery"
                              ? "جراحة"
                              : appointment.appointmentType === "followup"
                              ? "متابعة"
                              : "موعد"}
                          </Badge>
                        </div>

                        {/* Action Button */}
                        <Button
                          size="sm"
                          variant={
                            selectedAppointment?.patientId ===
                            appointment.patientId
                              ? "default"
                              : "outline"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(appointment);
                          }}
                        >
                          عرض التفاصيل
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
              {visibleCount < filteredAppointments.length && (
                <Button
                  onClick={() => setVisibleCount(prev => prev + 20)}
                  variant="outline"
                  className="w-full"
                >
                  تحميل المزيد ({filteredAppointments.length - visibleCount} مريض متبقي)
                </Button>
              )}
            </div>
          )}
        </div>

          {/* Details Panel */}
          {selectedAppointment && (
            <div className="mt-8 border-t pt-6 overflow-x-hidden">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedAppointment.patientName}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAppointment(null)}
                    className="h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                </div>

              {patientQuery.isLoading && (
                <div className="text-center text-slate-500">جاري التحميل...</div>
              )}

              {patientQuery.data && (
                <>
                  {/* Patient Code */}
                  {patientQuery.data.patientCode && (
                    <div className="text-sm">
                      <p className="font-semibold text-slate-700">رقم المريض</p>
                      <p className="text-slate-600">
                        {patientQuery.data.patientCode}
                      </p>
                    </div>
                  )}

                  {/* Medical History */}
                  {patientQuery.data.medicalHistory && (
                    <div className="text-sm border-t pt-3">
                      <p className="font-semibold text-slate-700">
                        التاريخ الطبي
                      </p>
                      <p className="text-slate-600 mt-1">
                        {patientQuery.data.medicalHistory}
                      </p>
                    </div>
                  )}

                  {/* Age */}
                  {patientQuery.data.age && (
                    <div className="text-sm">
                      <p className="font-semibold text-slate-700">السن</p>
                      <p className="text-slate-600">{patientQuery.data.age}</p>
                    </div>
                  )}

                  {/* Phone */}
                  {patientQuery.data.phone && (
                    <div className="text-sm">
                      <p className="font-semibold text-slate-700">الهاتف</p>
                      <p className="text-slate-600">{patientQuery.data.phone}</p>
                    </div>
                  )}
                </>
              )}

              {/* Visits Data */}
              {(visitsQuery.isLoading || examinationsQuery.isLoading) && (
                <div className="text-center text-slate-500 text-sm">
                  جاري تحميل البيانات...
                </div>
              )}

              {!visitsQuery.isLoading && !examinationsQuery.isLoading && visitsQuery.data?.length === 0 && (
                <div className="text-center text-slate-500 text-sm border-t pt-3">
                  لا توجد بيانات زيارات للمريض
                </div>
              )}

              {visitsQuery.data && visitsQuery.data.length > 0 && (
                <>
                  {/* Latest Visit */}
                  {(() => {
                    const latestVisit = visitsQuery.data[0] as any;
                    const latestExamination = examinationsQuery.data?.[0] as any;

                    // Merge autorefraction from separate table
                    const latestAutoref = autorefractometryQuery.data?.[0];
                    const mergedExam = {
                      ...latestExamination,
                      ...(latestAutoref && {
                        autorefraction: {
                          od: {
                            sphere: latestAutoref.sphereOD,
                            cylinder: latestAutoref.cylinderOD,
                            axis: latestAutoref.axisOD,
                            ucva: latestAutoref.ucvaOD,
                            bcva: latestAutoref.bcvaOD,
                            iop: latestAutoref.iopOD,
                          },
                          os: {
                            sphere: latestAutoref.sphereOS,
                            cylinder: latestAutoref.cylinderOS,
                            axis: latestAutoref.axisOS,
                            ucva: latestAutoref.ucvaOS,
                            bcva: latestAutoref.bcvaOS,
                            iop: latestAutoref.iopOS,
                          },
                        },
                      }),
                    };

                    return (
                      <>
                        {/* Symptoms */}
                        {mergedExam?.symptoms || latestVisit.chiefComplaint && (
                          <div className="text-sm border-t pt-3">
                            <p className="font-semibold text-slate-700">
                              الاعراض
                            </p>
                            <p className="text-slate-600 mt-1">
                              {mergedExam?.symptoms || latestVisit.chiefComplaint}
                            </p>
                          </div>
                        )}

                        {/* Measurements */}
                        {(mergedExam?.autorefraction?.od ||
                          mergedExam?.autorefraction?.os) && (
                          <div className="text-sm border-t pt-3">
                            <p className="font-semibold text-slate-700">
                              القياسات
                            </p>
                            <div className="mt-1 space-y-1 text-xs">
                              {mergedExam?.autorefraction?.od && (
                                <p className="text-slate-600">
                                  OD: S{
                                    mergedExam?.autorefraction.od.sphere
                                  } C{mergedExam?.autorefraction.od.cylinder}
                                </p>
                              )}
                              {mergedExam?.autorefraction?.os && (
                                <p className="text-slate-600">
                                  OS: S{
                                    mergedExam?.autorefraction.os.sphere
                                  } C{mergedExam?.autorefraction.os.cylinder}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Eyeglass Prescription */}
                        {(() => {
                          const latestGlasses = glassesRecordsQuery.data?.[0];
                          const hasGlasses = latestGlasses && (latestGlasses.sOD || latestGlasses.cOD || latestGlasses.sOS || latestGlasses.cOS);

                          if (!hasGlasses && examinationsQuery.data?.length !== 0) {
                            return (
                              <div className="border-t pt-3 flex items-center justify-between">
                                <div className="text-slate-500 text-xs">
                                  📋 مقاس النظاره - لا توجد بيانات
                                </div>
                                {["nurse", "reception", "technician", "admin"].includes(String(user?.role ?? "").toLowerCase()) && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setLocation(`/refraction/${selectedAppointment?.patientId}`)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    إضافة
                                  </Button>
                                )}
                              </div>
                            );
                          }

                          if (!hasGlasses) return null;

                          const glassesData = {
                            od: latestGlasses.sOD || latestGlasses.cOD ? {
                              s: latestGlasses.sOD,
                              c: latestGlasses.cOD,
                              axis: latestGlasses.axisOD,
                              pd: latestGlasses.pdOD,
                              bcva: latestGlasses.bcvaOD,
                            } : undefined,
                            os: latestGlasses.sOS || latestGlasses.cOS ? {
                              s: latestGlasses.sOS,
                              c: latestGlasses.cOS,
                              axis: latestGlasses.axisOS,
                              pd: latestGlasses.pdOS,
                              bcva: latestGlasses.bcvaOS,
                            } : undefined,
                          };

                          return (
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-bold text-slate-900 text-sm">
                                📋 مقاس النظاره
                              </p>
                              {["nurse", "reception", "technician", "admin"].includes(String(user?.role ?? "").toLowerCase()) && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setLocation(`/refraction/${selectedAppointment?.patientId}`)}
                                  className="h-7 px-2 text-xs"
                                >
                                  تعديل
                                </Button>
                              )}
                            </div>
                            {/* Desktop Table View */}
                            <div className="hidden sm:block rounded-lg border border-slate-200 shadow-sm overflow-x-hidden w-full">
                              <table className="w-full text-xs table-fixed" dir="ltr">
                                <thead>
                                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                    <th className="px-2 py-2 text-center font-bold text-xs">العين</th>
                                    <th className="px-2 py-2 text-center font-bold text-xs">BCVA</th>
                                    <th className="px-2 py-2 text-center font-bold text-xs">S</th>
                                    <th className="px-2 py-2 text-center font-bold text-xs">C</th>
                                    <th className="px-2 py-2 text-center font-bold text-xs">A</th>
                                    <th className="px-2 py-2 text-center font-bold text-xs">PD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {glassesData?.od && (
                                    <tr className="border-b hover:bg-blue-50 transition-colors">
                                      <td className="px-2 py-2 text-center font-bold text-slate-900 bg-slate-50 text-xs">OD</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.od.bcva || "—"}</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.od.s || "—"}</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.od.c || "—"}</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.od.axis || "—"}</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.od.pd || "—"}</td>
                                    </tr>
                                  )}
                                  {glassesData?.os && (
                                    <tr className="hover:bg-blue-50 transition-colors">
                                      <td className="px-2 py-2 text-center font-bold text-slate-900 bg-slate-50 text-xs">OS</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.os.bcva || "—"}</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.os.s || "—"}</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.os.c || "—"}</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.os.axis || "—"}</td>
                                      <td className="px-2 py-2 text-center text-slate-700 text-xs">{glassesData.os.pd || "—"}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="sm:hidden space-y-3">
                              {glassesData?.od && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                  <p className="font-bold text-blue-900 mb-2 text-sm">OD (العين اليمنى)</p>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between"><span className="font-semibold">BCVA:</span><span>{glassesData.od.bcva || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">S:</span><span>{glassesData.od.s || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">C:</span><span>{glassesData.od.c || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">A:</span><span>{glassesData.od.axis || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">PD:</span><span>{glassesData.od.pd || "—"}</span></div>
                                  </div>
                                </div>
                              )}
                              {glassesData?.os && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                  <p className="font-bold text-amber-900 mb-2 text-sm">OS (العين اليسرى)</p>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between"><span className="font-semibold">BCVA:</span><span>{glassesData.os.bcva || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">S:</span><span>{glassesData.os.s || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">C:</span><span>{glassesData.os.c || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">A:</span><span>{glassesData.os.axis || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">PD:</span><span>{glassesData.os.pd || "—"}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          );
                        })()}

                        {/* Pentacam */}
                        {!latestExamination?.pentacam && examinationsQuery.data?.length !== 0 && (
                          <div className="border-t pt-3 text-slate-500 text-xs">
                            🔬 البنتاكام - لا توجد بيانات
                          </div>
                        )}
                        {latestExamination?.pentacam && (
                          <div className="border-t pt-3">
                            <p className="font-bold text-slate-900 mb-3 text-sm">
                              🔬 البنتاكام
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                              {/* RT (Right Eye) */}
                              {latestExamination?.pentacam.od && (
                                <div>
                                  <p className="text-xs font-bold text-white bg-green-600 px-2 py-1 rounded mb-2">RT (العين اليمنى)</p>
                                  {/* Desktop Table */}
                                  <div className="hidden sm:block rounded-lg border border-slate-200 shadow-sm overflow-x-hidden">
                                    <table className="w-full text-sm" dir="ltr">
                                      <tbody>
                                        <tr className="border-b hover:bg-green-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">K1</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.od.k1 || "—"}</td>
                                        </tr>
                                        <tr className="border-b hover:bg-green-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">K2</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.od.k2 || "—"}</td>
                                        </tr>
                                        <tr className="border-b hover:bg-green-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">AX</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.od.axis || "—"}</td>
                                        </tr>
                                        <tr className="border-b hover:bg-green-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">Thinnest Point</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.od.thinnest || "—"}</td>
                                        </tr>
                                        <tr className="border-b hover:bg-green-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">Corneal Apex</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.od.apex || "—"}</td>
                                        </tr>
                                        <tr className="hover:bg-green-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">Residual Stroma</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.od.residualStroma || "—"}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                  {/* Mobile Card */}
                                  <div className="sm:hidden rounded-lg border border-green-200 bg-green-50 p-3 space-y-1 text-xs">
                                    <div className="flex justify-between"><span className="font-semibold">K1:</span><span>{latestExamination?.pentacam.od.k1 || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">K2:</span><span>{latestExamination?.pentacam.od.k2 || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">AX:</span><span>{latestExamination?.pentacam.od.axis || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">Thinnest:</span><span>{latestExamination?.pentacam.od.thinnest || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">Apex:</span><span>{latestExamination?.pentacam.od.apex || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">Stroma:</span><span>{latestExamination?.pentacam.od.residualStroma || "—"}</span></div>
                                  </div>
                                </div>
                              )}

                              {/* LT (Left Eye) */}
                              {latestExamination?.pentacam.os && (
                                <div>
                                  <p className="text-xs font-bold text-white bg-amber-600 px-2 py-1 rounded mb-2">LT (العين اليسرى)</p>
                                  {/* Desktop Table */}
                                  <div className="hidden sm:block rounded-lg border border-slate-200 shadow-sm overflow-x-hidden">
                                    <table className="w-full text-sm" dir="ltr">
                                      <tbody>
                                        <tr className="border-b hover:bg-amber-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">K1</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.os.k1 || "—"}</td>
                                        </tr>
                                        <tr className="border-b hover:bg-amber-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">K2</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.os.k2 || "—"}</td>
                                        </tr>
                                        <tr className="border-b hover:bg-amber-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">AX</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.os.axis || "—"}</td>
                                        </tr>
                                        <tr className="border-b hover:bg-amber-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">Thinnest Point</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.os.thinnest || "—"}</td>
                                        </tr>
                                        <tr className="border-b hover:bg-amber-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">Corneal Apex</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.os.apex || "—"}</td>
                                        </tr>
                                        <tr className="hover:bg-amber-50 transition-colors">
                                          <td className="px-2 py-1 font-bold bg-slate-50 text-slate-900 text-xs">Residual Stroma</td>
                                          <td className="px-2 py-1 text-slate-700 text-xs">{latestExamination?.pentacam.os.residualStroma || "—"}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                  {/* Mobile Card */}
                                  <div className="sm:hidden rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1 text-xs">
                                    <div className="flex justify-between"><span className="font-semibold">K1:</span><span>{latestExamination?.pentacam.os.k1 || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">K2:</span><span>{latestExamination?.pentacam.os.k2 || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">AX:</span><span>{latestExamination?.pentacam.os.axis || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">Thinnest:</span><span>{latestExamination?.pentacam.os.thinnest || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">Apex:</span><span>{latestExamination?.pentacam.os.apex || "—"}</span></div>
                                    <div className="flex justify-between"><span className="font-semibold">Stroma:</span><span>{latestExamination?.pentacam.os.residualStroma || "—"}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Diagnosis */}
                        {latestVisit.diagnosis && (
                          <div className="text-sm border-t pt-3">
                            <p className="font-semibold text-slate-700">
                              التشخيص
                            </p>
                            <p className="text-slate-600 mt-1">
                              {latestVisit.diagnosis}
                            </p>
                          </div>
                        )}

                        {/* Treatment */}
                        {latestVisit.treatment && (
                          <div className="text-sm border-t pt-3">
                            <p className="font-semibold text-slate-700">
                              العلاج
                            </p>
                            <p className="text-slate-600 mt-1">
                              {latestVisit.treatment}
                            </p>
                          </div>
                        )}

                        {/* Report */}
                        {latestVisit.report && (
                          <div className="text-sm border-t pt-3">
                            <p className="font-semibold text-slate-700">
                              التقرير
                            </p>
                            <p className="text-slate-600 mt-1">
                              {latestVisit.report}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}

              {/* View Full File Button */}
              {selectedAppointment.patientId && (
                <Button
                  className="w-full mt-4 border-t pt-4"
                  variant="outline"
                  onClick={() =>
                    setLocation(`/patients/${selectedAppointment.patientId}`)
                  }
                >
                  عرض الملف الكامل
                </Button>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-4 bg-white border-l border-slate-200 overflow-y-auto overflow-x-hidden flex flex-col">
            {/* Header with Date and Count */}
            <div className="p-4 space-y-3 border-b border-slate-200">
              {/* First Row: Title and Date Picker */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">مرضي اليوم</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-8 text-xs w-32"
                  />
                  <Button size="sm" variant="outline" className="text-xs">
                    اليوم
                  </Button>
                </div>
              </div>

              {/* Second Row: Date, Count and Action Buttons */}
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex gap-4">
                  <span>{selectedDate}</span>
                  <span className="font-semibold">الإجمالي: {sortedAppointments.length}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    المرضي
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    إخفاء
                  </Button>
                </div>
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-3 px-4 pb-4 overflow-y-auto max-h-[calc(100vh-300px)]">
              {categoryNames.map((category) => {
                const categoryAppointments = sortedAppointments.filter((apt: any) => {
                  const categories = getCategoryForAppointment(apt);
                  return categories.includes(category);
                });

                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-slate-800">
                        {category} ({categoryAppointments.length})
                      </span>
                    </div>

                    {/* Appointments in Category */}
                    {categoryAppointments.length === 0 ? (
                      <p className="text-xs text-slate-500 mb-3">لا توجد حالات</p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {categoryAppointments.map((apt: any) => (
                          <div key={apt.id} className="p-2 bg-slate-50 rounded text-xs">
                            <div className="font-semibold text-slate-800 mb-1">
                              {apt.patientName || "Unknown"} ({apt.patientCode})
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                📝
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                📋
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                👁️
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                👤
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
    </div>
  );
}
