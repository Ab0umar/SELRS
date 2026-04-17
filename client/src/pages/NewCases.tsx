import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import { SPHERE_OPTIONS, CYLINDER_OPTIONS, UCVA_BCVA_OPTIONS, AIR_PUFF_OPTIONS } from "@/lib/refractionOptions";

export default function NewCases() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [patientId, setPatientId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("auto-air");

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const patient = patientQuery.data as any;

  const [examData, setExamData] = useState({
    autorefraction: {
      od: { s: "", c: "", axis: "", ucva: "", bcva: "", afterS: "", afterC: "", afterA: "", airPuff1: "" },
      os: { s: "", c: "", axis: "", ucva: "", bcva: "", afterS: "", afterC: "", afterA: "", airPuff1: "" },
    },
    fundus: {
      od: { discStatus: "", cupDiscRatio: "", macuaStatus: "", vesselStatus: "", otherFindings: "" },
      os: { discStatus: "", cupDiscRatio: "", macuaStatus: "", vesselStatus: "", otherFindings: "" },
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader backTo="/dashboard" />
      <main className="w-full space-y-6 px-3 py-6 sm:px-4">
        {patientId > 0 && patient ? (
          <Card className="border-slate-200/80 shadow-sm">
            {/* Header with Patient Info */}
            <CardHeader className="border-b border-slate-200 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Patient Info */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{patient?.fullName || "المريض"}</CardTitle>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                      <div>العمر: <span className="font-medium">{getPatientAge(patient?.dateOfBirth)} سنة</span></div>
                      <div>الدكتور: <span className="font-medium">{patient?.doctorName || "-"}</span></div>
                    </div>
                  </div>
                </div>

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
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardHeader>

            {/* Tabs Content */}
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="auto-air">الأوتوريف والإير باف</TabsTrigger>
                  <TabsTrigger value="pentacam">البنتاكام</TabsTrigger>
                </TabsList>

                {/* Auto-Air Tab */}
                <TabsContent value="auto-air" className="mt-6">
                  <div className="max-w-4xl mx-auto space-y-4 overflow-x-auto" dir="ltr">
                    <div className="min-w-[560px] space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3 text-sm font-bold">
                        <div></div>
                        <div className="text-left pl-1">Right (OD)</div>
                        <div className="text-left pl-1">Left (OS)</div>
                      </div>

                      {/* UCVA */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">UCVA</div>
                        <RefractionValueSelect value={examData.autorefraction.od.ucva} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, ucva: value } } }))} options={UCVA_BCVA_OPTIONS} triggerClassName="h-7 w-24 text-[11px] text-center border-input" />
                        <RefractionValueSelect value={examData.autorefraction.os.ucva} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, ucva: value } } }))} options={UCVA_BCVA_OPTIONS} triggerClassName="h-7 w-24 text-[11px] text-center border-input" />
                      </div>

                      {/* BCVA */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">BCVA</div>
                        <RefractionValueSelect value={examData.autorefraction.od.bcva} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, bcva: value } } }))} options={UCVA_BCVA_OPTIONS} triggerClassName="h-7 w-24 text-[11px] text-center border-input" />
                        <RefractionValueSelect value={examData.autorefraction.os.bcva} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, bcva: value } } }))} options={UCVA_BCVA_OPTIONS} triggerClassName="h-7 w-24 text-[11px] text-center border-input" />
                      </div>

                      {/* Autoref Header */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">Autoref</div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className="w-16 text-center">S</span>
                          <span className="w-16 text-center">C</span>
                          <span className="w-16 text-center">A</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className="w-16 text-center">S</span>
                          <span className="w-16 text-center">C</span>
                          <span className="w-16 text-center">A</span>
                        </div>
                      </div>

                      {/* Autoref Values */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div></div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect value={examData.autorefraction.od.s} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, s: value } } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <RefractionValueSelect value={examData.autorefraction.od.c} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, c: value } } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={examData.autorefraction.od.axis} onChange={(e) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, axis: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect value={examData.autorefraction.os.s} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, s: value } } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <RefractionValueSelect value={examData.autorefraction.os.c} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, c: value } } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={examData.autorefraction.os.axis} onChange={(e) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, axis: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                      </div>

                      {/* After Header */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3 pt-2">
                        <div className="text-sm font-semibold">After</div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className="w-16 text-center">S</span>
                          <span className="w-16 text-center">C</span>
                          <span className="w-16 text-center">A</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className="w-16 text-center">S</span>
                          <span className="w-16 text-center">C</span>
                          <span className="w-16 text-center">A</span>
                        </div>
                      </div>

                      {/* After Values */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div></div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect value={examData.autorefraction.od.afterS} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, afterS: value } } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <RefractionValueSelect value={examData.autorefraction.od.afterC} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, afterC: value } } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={examData.autorefraction.od.afterA} onChange={(e) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, afterA: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect value={examData.autorefraction.os.afterS} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, afterS: value } } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <RefractionValueSelect value={examData.autorefraction.os.afterC} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, afterC: value } } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={examData.autorefraction.os.afterA} onChange={(e) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, afterA: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                      </div>

                      {/* Air Puff */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3 pt-2">
                        <div className="text-sm font-semibold">Air Puff</div>
                        <RefractionValueSelect value={examData.autorefraction.od.airPuff1} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, od: { ...prev.autorefraction.od, airPuff1: value } } }))} options={AIR_PUFF_OPTIONS} defaultValue="0" allowEmpty={false} triggerClassName="h-7 w-24 text-[11px] text-center border-input" />
                        <RefractionValueSelect value={examData.autorefraction.os.airPuff1} onChange={(value) => setExamData((prev) => ({ ...prev, autorefraction: { ...prev.autorefraction, os: { ...prev.autorefraction.os, airPuff1: value } } }))} options={AIR_PUFF_OPTIONS} defaultValue="0" allowEmpty={false} triggerClassName="h-7 w-24 text-[11px] text-center border-input" />
                      </div>

                      {/* Fundus - Optic Disc Status */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3 pt-4 border-t border-slate-200">
                        <div className="text-sm font-semibold">Fundus</div>
                        <Input placeholder="Disc Status" value={examData.fundus.od.discStatus} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, od: { ...prev.fundus.od, discStatus: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                        <Input placeholder="Disc Status" value={examData.fundus.os.discStatus} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, os: { ...prev.fundus.os, discStatus: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                      </div>

                      {/* Cup-to-Disc Ratio */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold text-[11px]">C/D Ratio</div>
                        <Input placeholder="C/D" value={examData.fundus.od.cupDiscRatio} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, od: { ...prev.fundus.od, cupDiscRatio: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                        <Input placeholder="C/D" value={examData.fundus.os.cupDiscRatio} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, os: { ...prev.fundus.os, cupDiscRatio: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                      </div>

                      {/* Macula Status */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold text-[11px]">Macula</div>
                        <Input placeholder="Macula Status" value={examData.fundus.od.macuaStatus} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, od: { ...prev.fundus.od, macuaStatus: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                        <Input placeholder="Macula Status" value={examData.fundus.os.macuaStatus} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, os: { ...prev.fundus.os, macuaStatus: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                      </div>

                      {/* Vessel Status */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold text-[11px]">Vessels</div>
                        <Input placeholder="Vessel Status" value={examData.fundus.od.vesselStatus} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, od: { ...prev.fundus.od, vesselStatus: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                        <Input placeholder="Vessel Status" value={examData.fundus.os.vesselStatus} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, os: { ...prev.fundus.os, vesselStatus: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                      </div>

                      {/* Other Findings */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold text-[11px]">Other</div>
                        <Input placeholder="Other Findings" value={examData.fundus.od.otherFindings} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, od: { ...prev.fundus.od, otherFindings: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                        <Input placeholder="Other Findings" value={examData.fundus.os.otherFindings} onChange={(e) => setExamData((prev) => ({ ...prev, fundus: { ...prev.fundus, os: { ...prev.fundus.os, otherFindings: e.target.value } } }))} className="h-7 text-[11px] text-center border-input" />
                      </div>

                      {/* Refraction Table Header */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3 pt-4">
                        <div className="text-sm font-semibold">Refraction</div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className="w-16 text-center">S</span>
                          <span className="w-16 text-center">C</span>
                          <span className="w-16 text-center">A</span>
                          <span className="w-16 text-center">P.D</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className="w-16 text-center">S</span>
                          <span className="w-16 text-center">C</span>
                          <span className="w-16 text-center">A</span>
                          <span className="w-16 text-center">P.D</span>
                        </div>
                      </div>

                      {/* Refraction Table Values */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div></div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect value={refractionTableData.od.s} onChange={(value) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, s: value } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <RefractionValueSelect value={refractionTableData.od.c} onChange={(value) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, c: value } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={refractionTableData.od.a} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, a: e.target.value } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={refractionTableData.od.pd} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, od: { ...prev.od, pd: e.target.value } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect value={refractionTableData.os.s} onChange={(value) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, s: value } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <RefractionValueSelect value={refractionTableData.os.c} onChange={(value) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, c: value } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={refractionTableData.os.a} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, a: e.target.value } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={refractionTableData.os.pd} onChange={(e) => setRefractionTableData((prev) => ({ ...prev, os: { ...prev.os, pd: e.target.value } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Pentacam Tab */}
                <TabsContent value="pentacam" className="mt-6">
                  <div className="max-w-4xl mx-auto space-y-2 overflow-x-auto" dir="ltr">
                    <div className="min-w-[560px] space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3 text-sm font-bold mb-1">
                        <div></div>
                        <div className="text-left pl-1">Right (OD)</div>
                        <div className="text-left pl-1">Left (OS)</div>
                      </div>

                      {/* K1/K2 */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">K1/K2</div>
                        <div className="flex items-center gap-2">
                          <Input value={examData.pentacam.od.k1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, k1: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={examData.pentacam.od.k2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, k2: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input value={examData.pentacam.os.k1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, k1: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={examData.pentacam.os.k2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, k2: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                      </div>

                      {/* AX1/AX2 */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">AX1/AX2</div>
                        <div className="flex items-center gap-2">
                          <Input value={examData.pentacam.od.ax1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ax1: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={examData.pentacam.od.ax2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ax2: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input value={examData.pentacam.os.ax1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ax1: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                          <Input value={examData.pentacam.os.ax2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ax2: e.target.value } } }))} className="h-7 w-16 text-[11px] text-center border-input" />
                        </div>
                      </div>

                      {/* Thinnest Point */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">Thinnest Point</div>
                        <Input value={examData.pentacam.od.thinnest} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, thinnest: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                        <Input value={examData.pentacam.os.thinnest} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, thinnest: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                      </div>

                      {/* Corneal Apex */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">Corneal Apex</div>
                        <Input value={examData.pentacam.od.apex} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, apex: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                        <Input value={examData.pentacam.os.apex} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, apex: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                      </div>

                      {/* Residual Stroma */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">Residual Stroma</div>
                        <Input value={examData.pentacam.od.residual} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, residual: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                        <Input value={examData.pentacam.os.residual} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, residual: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                      </div>

                      {/* Planned TTT */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">Planned TTT</div>
                        <Input value={examData.pentacam.od.ttt} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ttt: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                        <Input value={examData.pentacam.os.ttt} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ttt: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                      </div>

                      {/* Ablation */}
                      <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                        <div className="text-sm font-semibold">Ablation</div>
                        <Input value={examData.pentacam.od.ablation} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ablation: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                        <Input value={examData.pentacam.os.ablation} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ablation: e.target.value } } }))} className="h-7 w-40 text-[11px] text-center border-input" />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200/80">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">اختر مريضاً</h3>
                <p className="text-sm text-slate-500">اختر مريضاً من الجانب الأيمن لإدخال فحوصاته</p>
              </div>
              <div className="w-full max-w-xs">
                <Card className="border-slate-200/80">
                  <CardHeader>
                    <CardTitle className="text-base">اختيار المريض</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PatientPicker
                      onSelect={(selected) => {
                        setPatientId(selected.id);
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
