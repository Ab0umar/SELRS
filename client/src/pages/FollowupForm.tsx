import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import {
  SPHERE_OPTIONS,
  CYLINDER_OPTIONS,
  UCVA_BCVA_OPTIONS,
  AIR_PUFF_OPTIONS,
} from "@/lib/refractionOptions";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

const rowClass = "grid grid-cols-[80px_1fr_1fr] items-center gap-2";
const sectionDivider =
  "grid grid-cols-[80px_1fr_1fr] items-center gap-2 pt-3 mt-1 border-t border-border";
const fieldClass = "h-10 w-full text-sm text-center";
const labelClass = "text-sm font-semibold";
const subLabelClass = "text-xs text-muted-foreground pl-2";

export default function FollowupForm() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/followup/:id");
  const routePatientId = routeParams?.id ? Number(routeParams.id) : 0;
  const [patientId, setPatientId] = useState<number>(routePatientId);
  const [activeTab, setActiveTab] = useState("auto-air");

  const saveFollowupMutation = trpc.medical.saveFollowupSheet.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ بيانات المتابعة بنجاح");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ البيانات"));
    },
  });

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });

  const patient = patientQuery.data as any;

  const [examData, setExamData] = useState({
    autorefraction: {
      od: {
        s: "",
        c: "",
        axis: "",
        ucva: "",
        bcva: "",
        afterS: "",
        afterC: "",
        afterA: "",
        airPuff1: "",
        iop: "",
      },
      os: {
        s: "",
        c: "",
        axis: "",
        ucva: "",
        bcva: "",
        afterS: "",
        afterC: "",
        afterA: "",
        airPuff1: "",
        iop: "",
      },
    },
    fundus: {
      od: {
        discStatus: "",
        cupDiscRatio: "",
        macuaStatus: "",
        vesselStatus: "",
        otherFindings: "",
      },
      os: {
        discStatus: "",
        cupDiscRatio: "",
        macuaStatus: "",
        vesselStatus: "",
        otherFindings: "",
      },
    },
    pentacam: {
      od: {
        k1: "",
        k2: "",
        ax1: "",
        ax2: "",
        thinnest: "",
        apex: "",
        residual: "",
        ttt: "",
        ablation: "",
      },
      os: {
        k1: "",
        k2: "",
        ax1: "",
        ax2: "",
        thinnest: "",
        apex: "",
        residual: "",
        ttt: "",
        ablation: "",
      },
    },
  });

  const [refractionTableData, setRefractionTableData] = useState({
    od: { s: "", c: "", a: "", pd: "" },
    os: { s: "", c: "", a: "", pd: "" },
  });

  const [followupDate, setFollowupDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleSave = async () => {
    if (!patientId) {
      toast.error("اختر مريضاً أولاً");
      return;
    }

    setLoading(true);
    try {
      const followupItems = [
        {
          tableIndex: 0,
          followupDate,
          vaOD: examData.autorefraction.od.ucva,
          vaOS: examData.autorefraction.os.ucva,
          refracOD: {
            s: examData.autorefraction.od.s,
            c: examData.autorefraction.od.c,
            axis: examData.autorefraction.od.axis,
          },
          refracOS: {
            s: examData.autorefraction.os.s,
            c: examData.autorefraction.os.c,
            axis: examData.autorefraction.os.axis,
          },
          iopOD: examData.autorefraction.od.iop,
          iopOS: examData.autorefraction.os.iop,
          treatment: notes,
          notes: notes,
        },
      ];

      const sheetType =
        (patient?.serviceType as
          | "consultant"
          | "specialist"
          | "lasik"
          | "external") || "consultant";

      await saveFollowupMutation.mutateAsync({
        patientId,
        sheetType,
        followupItems,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ بيانات المتابعة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader backTo="/dashboard" />
      <main className="w-full space-y-6 px-3 py-6 sm:px-4">
        {patientId > 0 && patient ? (
          <Card className="border-border/80 shadow-sm">
            {/* Header with Patient Info */}
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Patient Info */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">
                      {patient?.fullName || "المريض"}
                    </CardTitle>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                      <div>
                        العمر:{" "}
                        <span className="font-medium">
                          {getPatientAge(patient?.dateOfBirth)} سنة
                        </span>
                      </div>
                      <div>
                        الدكتور:{" "}
                        <span className="font-medium">
                          {patient?.doctorName || "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Label className="text-xs text-muted-foreground">
                          تاريخ المتابعة:
                        </Label>
                        <DateInput
                          value={followupDate}
                          onChange={(e) => setFollowupDate(e.target.value)}
                          className="h-7 w-36 text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Picker on the Right */}
                <div className="w-full sm:w-auto sm:min-w-[300px]">
                  <Card className="border-border/80 shadow-sm">
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
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="auto-air">Autoref/IOP</TabsTrigger>
                  <TabsTrigger value="pentacam">PENTACAM</TabsTrigger>
                  <TabsTrigger value="notes">NOTES</TabsTrigger>
                </TabsList>

                {/* Auto-Air Tab */}
                <TabsContent value="auto-air" className="mt-6">
                  <div className="w-full space-y-2" dir="ltr">
                    {/* Column headers */}
                    <div className={rowClass}>
                      <div />
                      <div className="text-xs font-bold text-center text-muted-foreground">
                        OD (Right)
                      </div>
                      <div className="text-xs font-bold text-center text-muted-foreground">
                        OS (Left)
                      </div>
                    </div>

                    {/* UCVA */}
                    <div className={rowClass}>
                      <div className={labelClass}>UCVA</div>
                      <RefractionValueSelect
                        value={examData.autorefraction.od.ucva}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: { ...p.autorefraction.od, ucva: v },
                            },
                          }))
                        }
                        options={UCVA_BCVA_OPTIONS}
                      />
                      <RefractionValueSelect
                        value={examData.autorefraction.os.ucva}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: { ...p.autorefraction.os, ucva: v },
                            },
                          }))
                        }
                        options={UCVA_BCVA_OPTIONS}
                      />
                    </div>
                    {/* BCVA */}
                    <div className={rowClass}>
                      <div className={labelClass}>BCVA</div>
                      <RefractionValueSelect
                        value={examData.autorefraction.od.bcva}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: { ...p.autorefraction.od, bcva: v },
                            },
                          }))
                        }
                        options={UCVA_BCVA_OPTIONS}
                      />
                      <RefractionValueSelect
                        value={examData.autorefraction.os.bcva}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: { ...p.autorefraction.os, bcva: v },
                            },
                          }))
                        }
                        options={UCVA_BCVA_OPTIONS}
                      />
                    </div>

                    {/* Autoref */}
                    <div className={sectionDivider}>
                      <div className={labelClass}>Autoref S</div>
                      <RefractionValueSelect
                        value={examData.autorefraction.od.s}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: { ...p.autorefraction.od, s: v },
                            },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        allowEmpty={false}
                      />
                      <RefractionValueSelect
                        value={examData.autorefraction.os.s}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: { ...p.autorefraction.os, s: v },
                            },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>C</div>
                      <RefractionValueSelect
                        value={examData.autorefraction.od.c}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: { ...p.autorefraction.od, c: v },
                            },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        allowEmpty={false}
                      />
                      <RefractionValueSelect
                        value={examData.autorefraction.os.c}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: { ...p.autorefraction.os, c: v },
                            },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Axis</div>
                      <Input
                        value={examData.autorefraction.od.axis}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: {
                                ...p.autorefraction.od,
                                axis: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                        placeholder="0-180"
                      />
                      <Input
                        value={examData.autorefraction.os.axis}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: {
                                ...p.autorefraction.os,
                                axis: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                        placeholder="0-180"
                      />
                    </div>

                    {/* After */}
                    <div className={sectionDivider}>
                      <div className={labelClass}>After S</div>
                      <RefractionValueSelect
                        value={examData.autorefraction.od.afterS}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: { ...p.autorefraction.od, afterS: v },
                            },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        allowEmpty={false}
                      />
                      <RefractionValueSelect
                        value={examData.autorefraction.os.afterS}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: { ...p.autorefraction.os, afterS: v },
                            },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>C</div>
                      <RefractionValueSelect
                        value={examData.autorefraction.od.afterC}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: { ...p.autorefraction.od, afterC: v },
                            },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        allowEmpty={false}
                      />
                      <RefractionValueSelect
                        value={examData.autorefraction.os.afterC}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: { ...p.autorefraction.os, afterC: v },
                            },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Axis</div>
                      <Input
                        value={examData.autorefraction.od.afterA}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: {
                                ...p.autorefraction.od,
                                afterA: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                        placeholder="0-180"
                      />
                      <Input
                        value={examData.autorefraction.os.afterA}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: {
                                ...p.autorefraction.os,
                                afterA: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                        placeholder="0-180"
                      />
                    </div>

                    {/* Air Puff */}
                    <div className={sectionDivider}>
                      <div className={labelClass}>Air Puff</div>
                      <RefractionValueSelect
                        value={examData.autorefraction.od.airPuff1}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              od: { ...p.autorefraction.od, airPuff1: v },
                            },
                          }))
                        }
                        options={AIR_PUFF_OPTIONS}
                      />
                      <RefractionValueSelect
                        value={examData.autorefraction.os.airPuff1}
                        onChange={(v) =>
                          setExamData((p) => ({
                            ...p,
                            autorefraction: {
                              ...p.autorefraction,
                              os: { ...p.autorefraction.os, airPuff1: v },
                            },
                          }))
                        }
                        options={AIR_PUFF_OPTIONS}
                      />
                    </div>

                    {/* Fundus */}
                    <div className={sectionDivider}>
                      <div className={labelClass}>Disc</div>
                      <Input
                        placeholder="Disc Status"
                        value={examData.fundus.od.discStatus}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              od: {
                                ...p.fundus.od,
                                discStatus: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        placeholder="Disc Status"
                        value={examData.fundus.os.discStatus}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              os: {
                                ...p.fundus.os,
                                discStatus: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>C/D</div>
                      <Input
                        placeholder="C/D"
                        value={examData.fundus.od.cupDiscRatio}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              od: {
                                ...p.fundus.od,
                                cupDiscRatio: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        placeholder="C/D"
                        value={examData.fundus.os.cupDiscRatio}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              os: {
                                ...p.fundus.os,
                                cupDiscRatio: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Macula</div>
                      <Input
                        placeholder="Macula"
                        value={examData.fundus.od.macuaStatus}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              od: {
                                ...p.fundus.od,
                                macuaStatus: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        placeholder="Macula"
                        value={examData.fundus.os.macuaStatus}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              os: {
                                ...p.fundus.os,
                                macuaStatus: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Vessels</div>
                      <Input
                        placeholder="Vessels"
                        value={examData.fundus.od.vesselStatus}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              od: {
                                ...p.fundus.od,
                                vesselStatus: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        placeholder="Vessels"
                        value={examData.fundus.os.vesselStatus}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              os: {
                                ...p.fundus.os,
                                vesselStatus: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Other</div>
                      <Input
                        placeholder="Other"
                        value={examData.fundus.od.otherFindings}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              od: {
                                ...p.fundus.od,
                                otherFindings: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        placeholder="Other"
                        value={examData.fundus.os.otherFindings}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            fundus: {
                              ...p.fundus,
                              os: {
                                ...p.fundus.os,
                                otherFindings: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>

                    {/* Refraction */}
                    <div className={sectionDivider}>
                      <div className={labelClass}>Refrac S</div>
                      <RefractionValueSelect
                        value={refractionTableData.od.s}
                        onChange={(v) =>
                          setRefractionTableData((p) => ({
                            ...p,
                            od: { ...p.od, s: v },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        allowEmpty={false}
                      />
                      <RefractionValueSelect
                        value={refractionTableData.os.s}
                        onChange={(v) =>
                          setRefractionTableData((p) => ({
                            ...p,
                            os: { ...p.os, s: v },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>C</div>
                      <RefractionValueSelect
                        value={refractionTableData.od.c}
                        onChange={(v) =>
                          setRefractionTableData((p) => ({
                            ...p,
                            od: { ...p.od, c: v },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        allowEmpty={false}
                      />
                      <RefractionValueSelect
                        value={refractionTableData.os.c}
                        onChange={(v) =>
                          setRefractionTableData((p) => ({
                            ...p,
                            os: { ...p.os, c: v },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Axis</div>
                      <Input
                        value={refractionTableData.od.a}
                        onChange={(e) =>
                          setRefractionTableData((p) => ({
                            ...p,
                            od: { ...p.od, a: e.target.value },
                          }))
                        }
                        className={fieldClass}
                        placeholder="0-180"
                      />
                      <Input
                        value={refractionTableData.os.a}
                        onChange={(e) =>
                          setRefractionTableData((p) => ({
                            ...p,
                            os: { ...p.os, a: e.target.value },
                          }))
                        }
                        className={fieldClass}
                        placeholder="0-180"
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>P.D</div>
                      <Input
                        value={refractionTableData.od.pd}
                        onChange={(e) =>
                          setRefractionTableData((p) => ({
                            ...p,
                            od: { ...p.od, pd: e.target.value },
                          }))
                        }
                        className={fieldClass}
                        placeholder="PD"
                      />
                      <Input
                        value={refractionTableData.os.pd}
                        onChange={(e) =>
                          setRefractionTableData((p) => ({
                            ...p,
                            os: { ...p.os, pd: e.target.value },
                          }))
                        }
                        className={fieldClass}
                        placeholder="PD"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Pentacam Tab */}
                <TabsContent value="pentacam" className="mt-6">
                  <div className="w-full space-y-2" dir="ltr">
                    <div className={rowClass}>
                      <div />
                      <div className="text-xs font-bold text-center text-muted-foreground">
                        OD (Right)
                      </div>
                      <div className="text-xs font-bold text-center text-muted-foreground">
                        OS (Left)
                      </div>
                    </div>
                    <div className={rowClass}>
                      <div className={labelClass}>K1</div>
                      <Input
                        value={examData.pentacam.od.k1}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: { ...p.pentacam.od, k1: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.k1}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: { ...p.pentacam.os, k1: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>K2</div>
                      <Input
                        value={examData.pentacam.od.k2}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: { ...p.pentacam.od, k2: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.k2}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: { ...p.pentacam.os, k2: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Ax1</div>
                      <Input
                        value={examData.pentacam.od.ax1}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: { ...p.pentacam.od, ax1: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.ax1}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: { ...p.pentacam.os, ax1: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Ax2</div>
                      <Input
                        value={examData.pentacam.od.ax2}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: { ...p.pentacam.od, ax2: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.ax2}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: { ...p.pentacam.os, ax2: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={sectionDivider}>
                      <div className={labelClass}>Thinnest</div>
                      <Input
                        value={examData.pentacam.od.thinnest}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: {
                                ...p.pentacam.od,
                                thinnest: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.thinnest}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: {
                                ...p.pentacam.os,
                                thinnest: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Apex</div>
                      <Input
                        value={examData.pentacam.od.apex}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: { ...p.pentacam.od, apex: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.apex}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: { ...p.pentacam.os, apex: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Residual</div>
                      <Input
                        value={examData.pentacam.od.residual}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: {
                                ...p.pentacam.od,
                                residual: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.residual}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: {
                                ...p.pentacam.os,
                                residual: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>TTT</div>
                      <Input
                        value={examData.pentacam.od.ttt}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: { ...p.pentacam.od, ttt: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.ttt}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: { ...p.pentacam.os, ttt: e.target.value },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <div className={subLabelClass}>Ablation</div>
                      <Input
                        value={examData.pentacam.od.ablation}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              od: {
                                ...p.pentacam.od,
                                ablation: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                      <Input
                        value={examData.pentacam.os.ablation}
                        onChange={(e) =>
                          setExamData((p) => ({
                            ...p,
                            pentacam: {
                              ...p.pentacam,
                              os: {
                                ...p.pentacam.os,
                                ablation: e.target.value,
                              },
                            },
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-6">
                  <div className="mx-auto max-w-2xl space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-semibold">
                        ملاحظات المتابعة
                      </Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="أدخل ملاحظاتك حول المتابعة..."
                        className="min-h-[300px] text-sm"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save Button */}
              <div className="mt-8 flex gap-4">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/dashboard")}
                >
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/80">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div>
                <h3 className="mb-2 font-semibold text-foreground">
                  اختر مريضاً
                </h3>
                <p className="text-sm text-muted-foreground">
                  اختر مريضاً من الجانب الأيمن لإدخال متابعته
                </p>
              </div>
              <div className="w-full max-w-xs">
                <Card className="border-border/80">
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
