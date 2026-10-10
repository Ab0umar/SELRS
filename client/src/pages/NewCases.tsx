import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import {
  SPHERE_OPTIONS,
  CYLINDER_OPTIONS,
  UCVA_BCVA_OPTIONS,
  AIR_PUFF_OPTIONS,
} from "@/lib/refractionOptions";
import { Button } from "@/components/ui/button";

const eyeGridClass =
  "grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[120px_1fr_1fr] sm:gap-3";
const compactSelectClass =
  "h-10 min-w-0 flex-1 text-xs text-center border-input sm:h-7 sm:w-16 sm:flex-none sm:text-[13px]";
const mediumSelectClass =
  "h-10 w-full text-xs text-center border-input sm:h-7 sm:w-24 sm:text-[13px]";
const compactInputClass =
  "h-10 min-w-0 flex-1 text-xs text-center border-input sm:h-7 sm:w-16 sm:flex-none sm:text-[13px]";
const wideInputClass =
  "h-10 w-full text-xs text-center border-input sm:h-7 sm:w-40 sm:text-[13px]";
const fullInputClass =
  "h-10 text-xs text-center border-input sm:h-7 sm:text-[13px]";
const lensSubheadClass = "min-w-0 flex-1 text-center sm:w-16 sm:flex-none";

export default function NewCases() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [patientId, setPatientId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("auto-air");

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });

  const patient = patientQuery.data as any;
  const saveRefractionMutation =
    trpc.medical.saveRefractionToExamination.useMutation({
      onSuccess: () => toast.success("تم حفظ بيانات الانكسار والبنتاكام"),
      onError: (error) => toast.error(`تعذر حفظ الفحص: ${error.message}`),
    });

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

  const handleSave = () => {
    if (!patientId) return;
    saveRefractionMutation.mutate({
      patientId,
      autorefraction: {
        od: {
          s: examData.autorefraction.od.s,
          c: examData.autorefraction.od.c,
          axis: examData.autorefraction.od.axis,
          ucva: examData.autorefraction.od.ucva,
          bcva: examData.autorefraction.od.bcva,
        },
        os: {
          s: examData.autorefraction.os.s,
          c: examData.autorefraction.os.c,
          axis: examData.autorefraction.os.axis,
          ucva: examData.autorefraction.os.ucva,
          bcva: examData.autorefraction.os.bcva,
        },
      },
      glassesData: {
        od: {
          s: refractionTableData.od.s,
          c: refractionTableData.od.c,
          axis: refractionTableData.od.a,
          pd: refractionTableData.od.pd,
        },
        os: {
          s: refractionTableData.os.s,
          c: refractionTableData.os.c,
          axis: refractionTableData.os.a,
          pd: refractionTableData.os.pd,
        },
      },
      pentacam: {
        od: {
          k1: examData.pentacam.od.k1,
          k2: examData.pentacam.od.k2,
          axis: examData.pentacam.od.ax1,
          thinnest: examData.pentacam.od.thinnest,
          apex: examData.pentacam.od.apex,
          residualStroma: examData.pentacam.od.residual,
        },
        os: {
          k1: examData.pentacam.os.k1,
          k2: examData.pentacam.os.k2,
          axis: examData.pentacam.os.ax1,
          thinnest: examData.pentacam.os.thinnest,
          apex: examData.pentacam.os.apex,
          residualStroma: examData.pentacam.os.residual,
        },
      },
    });
  };

  return (
    <div className="min-h-screen selrs-page-bg" dir="rtl">
      <PageHeader backTo="/dashboard" />
      <main className="w-full space-y-6 px-3 py-6 sm:px-4">
        {patientQuery.error ? (
          <Card className="border-destructive/30">
            <CardContent
              className="flex flex-col items-center gap-3 py-12 text-center"
              role="alert"
            >
              <p className="text-sm text-destructive">
                تعذر تحميل بيانات المريض: {patientQuery.error.message}
              </p>
              <Button variant="bare"
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => patientQuery.refetch()}
              >
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        ) : patientId > 0 && patient ? (
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">
                      {patient?.fullName || "المريض"}
                    </CardTitle>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                      <div>
                        العمر:{" "}
                        <span className="text-base font-semibold text-foreground">
                          {getPatientAge(patient?.dateOfBirth)} سنة
                        </span>
                      </div>
                      <div>
                        الدكتور:{" "}
                        <span className="font-medium">
                          {patient?.doctorName || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

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

            <CardContent className="pt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  يحفظ الإجراء بيانات الانكسار والبنتاكام المدعومة من الخادم.
                  بيانات قاع العين وAfter تحتاج مسار حفظ مستقل.
                </p>
                <Button variant="bare"
                  type="button"
                  onClick={handleSave}
                  disabled={saveRefractionMutation.isPending}
                  className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {saveRefractionMutation.isPending
                    ? "جاري الحفظ…"
                    : "حفظ الفحص"}
                </Button>
              </div>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="auto-air">
                    الأوتوريف والإير باف
                  </TabsTrigger>
                  <TabsTrigger value="pentacam">البنتاكام</TabsTrigger>
                </TabsList>

                <TabsContent value="auto-air" className="mt-6">
                  <div
                    className="mx-auto max-w-4xl space-y-4 overflow-x-visible"
                    dir="ltr"
                  >
                    <div className="w-full space-y-2">
                      <div className={`${eyeGridClass} text-sm font-bold`}>
                        <div></div>
                        <div className="text-left pl-1">Right (OD)</div>
                        <div className="text-left pl-1">Left (OS)</div>
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">UCVA</div>
                        <RefractionValueSelect
                          id="new-cases-autorefraction-od-ucva"
                          aria-label="حقل examData autorefraction od ucva"
                          value={examData.autorefraction.od.ucva}
                          onChange={(value) =>
                            setExamData((prev) => ({
                              ...prev,
                              autorefraction: {
                                ...prev.autorefraction,
                                od: { ...prev.autorefraction.od, ucva: value },
                              },
                            }))
                          }
                          options={UCVA_BCVA_OPTIONS}
                          triggerClassName={mediumSelectClass}
                        />
                        <RefractionValueSelect
                          id="new-cases-autorefraction-os-ucva"
                          aria-label="حقل examData autorefraction os ucva"
                          value={examData.autorefraction.os.ucva}
                          onChange={(value) =>
                            setExamData((prev) => ({
                              ...prev,
                              autorefraction: {
                                ...prev.autorefraction,
                                os: { ...prev.autorefraction.os, ucva: value },
                              },
                            }))
                          }
                          options={UCVA_BCVA_OPTIONS}
                          triggerClassName={mediumSelectClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">BCVA</div>
                        <RefractionValueSelect
                          id="new-cases-autorefraction-od-bcva"
                          aria-label="حقل examData autorefraction od bcva"
                          value={examData.autorefraction.od.bcva}
                          onChange={(value) =>
                            setExamData((prev) => ({
                              ...prev,
                              autorefraction: {
                                ...prev.autorefraction,
                                od: { ...prev.autorefraction.od, bcva: value },
                              },
                            }))
                          }
                          options={UCVA_BCVA_OPTIONS}
                          triggerClassName={mediumSelectClass}
                        />
                        <RefractionValueSelect
                          id="new-cases-autorefraction-os-bcva"
                          aria-label="حقل examData autorefraction os bcva"
                          value={examData.autorefraction.os.bcva}
                          onChange={(value) =>
                            setExamData((prev) => ({
                              ...prev,
                              autorefraction: {
                                ...prev.autorefraction,
                                os: { ...prev.autorefraction.os, bcva: value },
                              },
                            }))
                          }
                          options={UCVA_BCVA_OPTIONS}
                          triggerClassName={mediumSelectClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">Autoref</div>
                        <div className="flex items-center gap-2 text-[13px] font-semibold">
                          <span className={lensSubheadClass}>S</span>
                          <span className={lensSubheadClass}>C</span>
                          <span className={lensSubheadClass}>A</span>
                        </div>
                        <div className="flex items-center gap-2 text-[13px] font-semibold">
                          <span className={lensSubheadClass}>S</span>
                          <span className={lensSubheadClass}>C</span>
                          <span className={lensSubheadClass}>A</span>
                        </div>
                      </div>
                      <div className={eyeGridClass}>
                        <div></div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect
                            id="new-cases-autorefraction-od-s"
                            aria-label="حقل examData autorefraction od s"
                            value={examData.autorefraction.od.s}
                            onChange={(value) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  od: { ...prev.autorefraction.od, s: value },
                                },
                              }))
                            }
                            options={SPHERE_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <RefractionValueSelect
                            id="new-cases-autorefraction-od-c"
                            aria-label="حقل examData autorefraction od c"
                            value={examData.autorefraction.od.c}
                            onChange={(value) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  od: { ...prev.autorefraction.od, c: value },
                                },
                              }))
                            }
                            options={CYLINDER_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <Input
                            id="new-cases-autorefraction-od-axis"
                            aria-label="حقل examData autorefraction od axis"
                            value={examData.autorefraction.od.axis}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  od: {
                                    ...prev.autorefraction.od,
                                    axis: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect
                            id="new-cases-autorefraction-os-s"
                            aria-label="حقل examData autorefraction os s"
                            value={examData.autorefraction.os.s}
                            onChange={(value) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  os: { ...prev.autorefraction.os, s: value },
                                },
                              }))
                            }
                            options={SPHERE_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <RefractionValueSelect
                            id="new-cases-autorefraction-os-c"
                            aria-label="حقل examData autorefraction os c"
                            value={examData.autorefraction.os.c}
                            onChange={(value) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  os: { ...prev.autorefraction.os, c: value },
                                },
                              }))
                            }
                            options={CYLINDER_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <Input
                            id="new-cases-autorefraction-os-axis"
                            aria-label="حقل examData autorefraction os axis"
                            value={examData.autorefraction.os.axis}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  os: {
                                    ...prev.autorefraction.os,
                                    axis: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                      </div>
                      <div className={`${eyeGridClass} pt-2`}>
                        <div className="text-sm font-semibold">After</div>
                        <div className="flex items-center gap-2 text-[13px] font-semibold">
                          <span className={lensSubheadClass}>S</span>
                          <span className={lensSubheadClass}>C</span>
                          <span className={lensSubheadClass}>A</span>
                        </div>
                        <div className="flex items-center gap-2 text-[13px] font-semibold">
                          <span className={lensSubheadClass}>S</span>
                          <span className={lensSubheadClass}>C</span>
                          <span className={lensSubheadClass}>A</span>
                        </div>
                      </div>
                      <div className={eyeGridClass}>
                        <div></div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect
                            id="new-cases-autorefraction-od-afters"
                            aria-label="حقل examData autorefraction od afterS"
                            value={examData.autorefraction.od.afterS}
                            onChange={(value) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  od: {
                                    ...prev.autorefraction.od,
                                    afterS: value,
                                  },
                                },
                              }))
                            }
                            options={SPHERE_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <RefractionValueSelect
                            id="new-cases-autorefraction-od-afterc"
                            aria-label="حقل examData autorefraction od afterC"
                            value={examData.autorefraction.od.afterC}
                            onChange={(value) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  od: {
                                    ...prev.autorefraction.od,
                                    afterC: value,
                                  },
                                },
                              }))
                            }
                            options={CYLINDER_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <Input
                            id="new-cases-autorefraction-od-aftera"
                            aria-label="حقل examData autorefraction od afterA"
                            value={examData.autorefraction.od.afterA}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  od: {
                                    ...prev.autorefraction.od,
                                    afterA: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect
                            id="new-cases-autorefraction-os-afters"
                            aria-label="حقل examData autorefraction os afterS"
                            value={examData.autorefraction.os.afterS}
                            onChange={(value) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  os: {
                                    ...prev.autorefraction.os,
                                    afterS: value,
                                  },
                                },
                              }))
                            }
                            options={SPHERE_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <RefractionValueSelect
                            id="new-cases-autorefraction-os-afterc"
                            aria-label="حقل examData autorefraction os afterC"
                            value={examData.autorefraction.os.afterC}
                            onChange={(value) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  os: {
                                    ...prev.autorefraction.os,
                                    afterC: value,
                                  },
                                },
                              }))
                            }
                            options={CYLINDER_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <Input
                            id="new-cases-autorefraction-os-aftera"
                            aria-label="حقل examData autorefraction os afterA"
                            value={examData.autorefraction.os.afterA}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                autorefraction: {
                                  ...prev.autorefraction,
                                  os: {
                                    ...prev.autorefraction.os,
                                    afterA: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                      </div>
                      <div className={`${eyeGridClass} pt-2`}>
                        <div className="text-sm font-semibold">Air Puff</div>
                        <RefractionValueSelect
                          id="new-cases-autorefraction-od-airpuff1"
                          aria-label="حقل examData autorefraction od airPuff1"
                          value={examData.autorefraction.od.airPuff1}
                          onChange={(value) =>
                            setExamData((prev) => ({
                              ...prev,
                              autorefraction: {
                                ...prev.autorefraction,
                                od: {
                                  ...prev.autorefraction.od,
                                  airPuff1: value,
                                },
                              },
                            }))
                          }
                          options={AIR_PUFF_OPTIONS}
                          triggerClassName={mediumSelectClass}
                        />
                        <RefractionValueSelect
                          id="new-cases-autorefraction-os-airpuff1"
                          aria-label="حقل examData autorefraction os airPuff1"
                          value={examData.autorefraction.os.airPuff1}
                          onChange={(value) =>
                            setExamData((prev) => ({
                              ...prev,
                              autorefraction: {
                                ...prev.autorefraction,
                                os: {
                                  ...prev.autorefraction.os,
                                  airPuff1: value,
                                },
                              },
                            }))
                          }
                          options={AIR_PUFF_OPTIONS}
                          triggerClassName={mediumSelectClass}
                        />
                      </div>
                      <div
                        className={`${eyeGridClass} pt-4 border-t border-border`}
                      >
                        <div className="text-sm font-semibold">Fundus</div>
                        <Input
                          id="new-cases-fundus-od-discstatus"
                          aria-label="حقل examData fundus od discStatus"
                          placeholder="Disc Status"
                          value={examData.fundus.od.discStatus}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                od: {
                                  ...prev.fundus.od,
                                  discStatus: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                        <Input
                          id="new-cases-fundus-os-discstatus"
                          aria-label="حقل examData fundus os discStatus"
                          placeholder="Disc Status"
                          value={examData.fundus.os.discStatus}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                os: {
                                  ...prev.fundus.os,
                                  discStatus: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold text-[13px]">
                          C/D Ratio
                        </div>
                        <Input
                          id="new-cases-fundus-od-cupdiscratio"
                          aria-label="حقل examData fundus od cupDiscRatio"
                          placeholder="C/D"
                          value={examData.fundus.od.cupDiscRatio}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                od: {
                                  ...prev.fundus.od,
                                  cupDiscRatio: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                        <Input
                          id="new-cases-fundus-os-cupdiscratio"
                          aria-label="حقل examData fundus os cupDiscRatio"
                          placeholder="C/D"
                          value={examData.fundus.os.cupDiscRatio}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                os: {
                                  ...prev.fundus.os,
                                  cupDiscRatio: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold text-[13px]">
                          Macula
                        </div>
                        <Input
                          id="new-cases-fundus-od-macuastatus"
                          aria-label="حقل examData fundus od macuaStatus"
                          placeholder="Macula Status"
                          value={examData.fundus.od.macuaStatus}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                od: {
                                  ...prev.fundus.od,
                                  macuaStatus: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                        <Input
                          id="new-cases-fundus-os-macuastatus"
                          aria-label="حقل examData fundus os macuaStatus"
                          placeholder="Macula Status"
                          value={examData.fundus.os.macuaStatus}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                os: {
                                  ...prev.fundus.os,
                                  macuaStatus: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold text-[13px]">
                          Vessels
                        </div>
                        <Input
                          id="new-cases-fundus-od-vesselstatus"
                          aria-label="حقل examData fundus od vesselStatus"
                          placeholder="Vessel Status"
                          value={examData.fundus.od.vesselStatus}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                od: {
                                  ...prev.fundus.od,
                                  vesselStatus: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                        <Input
                          id="new-cases-fundus-os-vesselstatus"
                          aria-label="حقل examData fundus os vesselStatus"
                          placeholder="Vessel Status"
                          value={examData.fundus.os.vesselStatus}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                os: {
                                  ...prev.fundus.os,
                                  vesselStatus: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold text-[13px]">
                          Other
                        </div>
                        <Input
                          id="new-cases-fundus-od-otherfindings"
                          aria-label="حقل examData fundus od otherFindings"
                          placeholder="Other Findings"
                          value={examData.fundus.od.otherFindings}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                od: {
                                  ...prev.fundus.od,
                                  otherFindings: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                        <Input
                          id="new-cases-fundus-os-otherfindings"
                          aria-label="حقل examData fundus os otherFindings"
                          placeholder="Other Findings"
                          value={examData.fundus.os.otherFindings}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                os: {
                                  ...prev.fundus.os,
                                  otherFindings: e.target.value,
                                },
                              },
                            }))
                          }
                          className={fullInputClass}
                        />
                      </div>
                      <div className={`${eyeGridClass} pt-4`}>
                        <div className="text-sm font-semibold">Refraction</div>
                        <div className="flex items-center gap-2 text-[13px] font-semibold">
                          <span className={lensSubheadClass}>S</span>
                          <span className={lensSubheadClass}>C</span>
                          <span className={lensSubheadClass}>A</span>
                          <span className={lensSubheadClass}>P.D</span>
                        </div>
                        <div className="flex items-center gap-2 text-[13px] font-semibold">
                          <span className={lensSubheadClass}>S</span>
                          <span className={lensSubheadClass}>C</span>
                          <span className={lensSubheadClass}>A</span>
                          <span className={lensSubheadClass}>P.D</span>
                        </div>
                      </div>
                      <div className={eyeGridClass}>
                        <div></div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect
                            id="new-cases-od-s"
                            aria-label="حقل refractionTableData od s"
                            value={refractionTableData.od.s}
                            onChange={(value) =>
                              setRefractionTableData((prev) => ({
                                ...prev,
                                od: { ...prev.od, s: value },
                              }))
                            }
                            options={SPHERE_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <RefractionValueSelect
                            id="new-cases-od-c"
                            aria-label="حقل refractionTableData od c"
                            value={refractionTableData.od.c}
                            onChange={(value) =>
                              setRefractionTableData((prev) => ({
                                ...prev,
                                od: { ...prev.od, c: value },
                              }))
                            }
                            options={CYLINDER_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <Input
                            id="new-cases-od-a"
                            aria-label="حقل refractionTableData od a"
                            value={refractionTableData.od.a}
                            onChange={(e) =>
                              setRefractionTableData((prev) => ({
                                ...prev,
                                od: { ...prev.od, a: e.target.value },
                              }))
                            }
                            className={compactInputClass}
                          />
                          <Input
                            id="new-cases-od-pd"
                            aria-label="حقل refractionTableData od pd"
                            value={refractionTableData.od.pd}
                            onChange={(e) =>
                              setRefractionTableData((prev) => ({
                                ...prev,
                                od: { ...prev.od, pd: e.target.value },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <RefractionValueSelect
                            id="new-cases-os-s"
                            aria-label="حقل refractionTableData os s"
                            value={refractionTableData.os.s}
                            onChange={(value) =>
                              setRefractionTableData((prev) => ({
                                ...prev,
                                os: { ...prev.os, s: value },
                              }))
                            }
                            options={SPHERE_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <RefractionValueSelect
                            id="new-cases-os-c"
                            aria-label="حقل refractionTableData os c"
                            value={refractionTableData.os.c}
                            onChange={(value) =>
                              setRefractionTableData((prev) => ({
                                ...prev,
                                os: { ...prev.os, c: value },
                              }))
                            }
                            options={CYLINDER_OPTIONS}
                            triggerClassName={compactSelectClass}
                          />
                          <Input
                            id="new-cases-os-a"
                            aria-label="حقل refractionTableData os a"
                            value={refractionTableData.os.a}
                            onChange={(e) =>
                              setRefractionTableData((prev) => ({
                                ...prev,
                                os: { ...prev.os, a: e.target.value },
                              }))
                            }
                            className={compactInputClass}
                          />
                          <Input
                            id="new-cases-os-pd"
                            aria-label="حقل refractionTableData os pd"
                            value={refractionTableData.os.pd}
                            onChange={(e) =>
                              setRefractionTableData((prev) => ({
                                ...prev,
                                os: { ...prev.os, pd: e.target.value },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="pentacam" className="mt-6">
                  <div
                    className="mx-auto max-w-4xl space-y-2 overflow-x-visible"
                    dir="ltr"
                  >
                    <div className="w-full space-y-2">
                      <div className={`${eyeGridClass} text-sm font-bold mb-1`}>
                        <div></div>
                        <div className="text-left pl-1">Right (OD)</div>
                        <div className="text-left pl-1">Left (OS)</div>
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">K1/K2</div>
                        <div className="flex items-center gap-2">
                          <Input
                            id="new-cases-pentacam-od-k1"
                            aria-label="حقل examData pentacam od k1"
                            value={examData.pentacam.od.k1}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  od: {
                                    ...prev.pentacam.od,
                                    k1: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                          <Input
                            id="new-cases-pentacam-od-k2"
                            aria-label="حقل examData pentacam od k2"
                            value={examData.pentacam.od.k2}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  od: {
                                    ...prev.pentacam.od,
                                    k2: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id="new-cases-pentacam-os-k1"
                            aria-label="حقل examData pentacam os k1"
                            value={examData.pentacam.os.k1}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  os: {
                                    ...prev.pentacam.os,
                                    k1: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                          <Input
                            id="new-cases-pentacam-os-k2"
                            aria-label="حقل examData pentacam os k2"
                            value={examData.pentacam.os.k2}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  os: {
                                    ...prev.pentacam.os,
                                    k2: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">AX1/AX2</div>
                        <div className="flex items-center gap-2">
                          <Input
                            id="new-cases-pentacam-od-ax1"
                            aria-label="حقل examData pentacam od ax1"
                            value={examData.pentacam.od.ax1}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  od: {
                                    ...prev.pentacam.od,
                                    ax1: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                          <Input
                            id="new-cases-pentacam-od-ax2"
                            aria-label="حقل examData pentacam od ax2"
                            value={examData.pentacam.od.ax2}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  od: {
                                    ...prev.pentacam.od,
                                    ax2: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id="new-cases-pentacam-os-ax1"
                            aria-label="حقل examData pentacam os ax1"
                            value={examData.pentacam.os.ax1}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  os: {
                                    ...prev.pentacam.os,
                                    ax1: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                          <Input
                            id="new-cases-pentacam-os-ax2"
                            aria-label="حقل examData pentacam os ax2"
                            value={examData.pentacam.os.ax2}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  os: {
                                    ...prev.pentacam.os,
                                    ax2: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={compactInputClass}
                          />
                        </div>
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">
                          Thinnest Point
                        </div>
                        <Input
                          id="new-cases-pentacam-od-thinnest"
                          aria-label="حقل examData pentacam od thinnest"
                          value={examData.pentacam.od.thinnest}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                od: {
                                  ...prev.pentacam.od,
                                  thinnest: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                        <Input
                          id="new-cases-pentacam-os-thinnest"
                          aria-label="حقل examData pentacam os thinnest"
                          value={examData.pentacam.os.thinnest}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                os: {
                                  ...prev.pentacam.os,
                                  thinnest: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">
                          Corneal Apex
                        </div>
                        <Input
                          id="new-cases-pentacam-od-apex"
                          aria-label="حقل examData pentacam od apex"
                          value={examData.pentacam.od.apex}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                od: {
                                  ...prev.pentacam.od,
                                  apex: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                        <Input
                          id="new-cases-pentacam-os-apex"
                          aria-label="حقل examData pentacam os apex"
                          value={examData.pentacam.os.apex}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                os: {
                                  ...prev.pentacam.os,
                                  apex: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">
                          Residual Stroma
                        </div>
                        <Input
                          id="new-cases-pentacam-od-residual"
                          aria-label="حقل examData pentacam od residual"
                          value={examData.pentacam.od.residual}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                od: {
                                  ...prev.pentacam.od,
                                  residual: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                        <Input
                          id="new-cases-pentacam-os-residual"
                          aria-label="حقل examData pentacam os residual"
                          value={examData.pentacam.os.residual}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                os: {
                                  ...prev.pentacam.os,
                                  residual: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">Planned TTT</div>
                        <Input
                          id="new-cases-pentacam-od-ttt"
                          aria-label="حقل examData pentacam od ttt"
                          value={examData.pentacam.od.ttt}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                od: {
                                  ...prev.pentacam.od,
                                  ttt: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                        <Input
                          id="new-cases-pentacam-os-ttt"
                          aria-label="حقل examData pentacam os ttt"
                          value={examData.pentacam.os.ttt}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                os: {
                                  ...prev.pentacam.os,
                                  ttt: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                      </div>
                      <div className={eyeGridClass}>
                        <div className="text-sm font-semibold">Ablation</div>
                        <Input
                          id="new-cases-pentacam-od-ablation"
                          aria-label="حقل examData pentacam od ablation"
                          value={examData.pentacam.od.ablation}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                od: {
                                  ...prev.pentacam.od,
                                  ablation: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                        <Input
                          id="new-cases-pentacam-os-ablation"
                          aria-label="حقل examData pentacam os ablation"
                          value={examData.pentacam.os.ablation}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              pentacam: {
                                ...prev.pentacam,
                                os: {
                                  ...prev.pentacam.os,
                                  ablation: e.target.value,
                                },
                              },
                            }))
                          }
                          className={wideInputClass}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
                  اختر مريضاً من الجانب الأيمن لإدخال فحوصاته
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
