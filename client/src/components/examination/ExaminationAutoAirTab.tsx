import PatientPicker from "@/components/PatientPicker";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import type { UseExaminationFormResult } from "@/hooks/examination/useExaminationForm";
import {
  AIR_PUFF_OPTIONS,
  CYLINDER_OPTIONS,
  SPHERE_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";

interface ExaminationAutoAirTabProps {
  form: UseExaminationFormResult;
}

export default function ExaminationAutoAirTab({
  form,
}: ExaminationAutoAirTabProps) {
  const {
    handleSelectPatient,
    hasPatient,
    isMobileViewport,
    examData,
    setExamData,
    refractionTableData,
    setRefractionTableData,
    mobileExamInputClass,
    desktopVisionSelectClass,
    desktopRefractionInputClass,
    nurseSignature,
    setNurseSignature,
  } = form;

  return (
    <TabsContent value="auto-air" className="sheet-layout exam-compact-inputs">
      <div className="mb-4 flex justify-end">
        <PatientPicker onSelect={handleSelectPatient} />
      </div>
      {!hasPatient && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            يرجى اختيار المريض أولاً لإدخال بيانات الأوتوريفراكشن.
          </CardContent>
        </Card>
      )}
      {hasPatient && (
        <div className="bg-background p-3 sm:p-4">
          {isMobileViewport && (
            <div className="w-full px-4 space-y-3" dir="ltr">
              <Card className="border">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm text-center">
                    Right (OD)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">UCVA</Label>
                    <RefractionValueSelect
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
                      triggerClassName={mobileExamInputClass}
                    />
                  </div>
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">BCVA</Label>
                    <RefractionValueSelect
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
                      triggerClassName={mobileExamInputClass}
                    />
                  </div>
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">Autoref</Label>
                    <div className="grid grid-cols-3 gap-1">
                      <RefractionValueSelect
                        value={
                          (examData.autorefraction.od as any).s1 ||
                          examData.autorefraction.od.s
                        }
                        onChange={(value) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              od: {
                                ...prev.autorefraction.od,
                                s: value,
                                s1: value,
                              },
                            },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <RefractionValueSelect
                        value={
                          (examData.autorefraction.od as any).c1 ||
                          examData.autorefraction.od.c
                        }
                        onChange={(value) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              od: {
                                ...prev.autorefraction.od,
                                c: value,
                                c1: value,
                              },
                            },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <Input
                        value={
                          (examData.autorefraction.od as any).a1 ??
                          examData.autorefraction.od.axis
                        }
                        onChange={(e) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              od: {
                                ...prev.autorefraction.od,
                                axis: e.target.value,
                                a1: e.target.value,
                              },
                            },
                          }))
                        }
                        className={mobileExamInputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">After</Label>
                    <div className="grid grid-cols-3 gap-1">
                      <RefractionValueSelect
                        value={(examData.autorefraction.od as any).afterS || ""}
                        onChange={(value) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              od: { ...prev.autorefraction.od, afterS: value },
                            },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <RefractionValueSelect
                        value={(examData.autorefraction.od as any).afterC || ""}
                        onChange={(value) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              od: { ...prev.autorefraction.od, afterC: value },
                            },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <Input
                        value={(examData.autorefraction.od as any).afterA || ""}
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
                        className={mobileExamInputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">AirPuff</Label>
                    <RefractionValueSelect
                      value={examData.autorefraction.od.airPuff1}
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            od: { ...prev.autorefraction.od, airPuff1: value },
                          },
                        }))
                      }
                      options={AIR_PUFF_OPTIONS}
                      triggerClassName={mobileExamInputClass}
                    />
                  </div>
                  <div className="pt-1 border-t">
                    <div className="text-xs font-semibold mb-1">Refraction</div>
                    <div className="grid grid-cols-[40px_1fr] gap-1 items-center">
                      <Label className="text-xs">S</Label>
                      <RefractionValueSelect
                        value={refractionTableData.od.s}
                        onChange={(value) =>
                          setRefractionTableData((prev) => ({
                            ...prev,
                            od: { ...prev.od, s: value },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <Label className="text-xs">C</Label>
                      <RefractionValueSelect
                        value={refractionTableData.od.c}
                        onChange={(value) =>
                          setRefractionTableData((prev) => ({
                            ...prev,
                            od: { ...prev.od, c: value },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <Label className="text-xs">A</Label>
                      <Input
                        value={refractionTableData.od.a}
                        onChange={(e) =>
                          setRefractionTableData((prev) => ({
                            ...prev,
                            od: { ...prev.od, a: e.target.value },
                          }))
                        }
                        className={mobileExamInputClass}
                      />
                      <Label className="text-xs">P.D</Label>
                      <Input
                        value={refractionTableData.od.pd}
                        onChange={(e) =>
                          setRefractionTableData((prev) => ({
                            ...prev,
                            od: { ...prev.od, pd: e.target.value },
                          }))
                        }
                        className={mobileExamInputClass}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm text-center">
                    Left (OS)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">UCVA</Label>
                    <RefractionValueSelect
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
                      triggerClassName={mobileExamInputClass}
                    />
                  </div>
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">BCVA</Label>
                    <RefractionValueSelect
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
                      triggerClassName={mobileExamInputClass}
                    />
                  </div>
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">Autoref</Label>
                    <div className="grid grid-cols-3 gap-1">
                      <RefractionValueSelect
                        value={
                          (examData.autorefraction.os as any).s1 ||
                          examData.autorefraction.os.s
                        }
                        onChange={(value) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              os: {
                                ...prev.autorefraction.os,
                                s: value,
                                s1: value,
                              },
                            },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <RefractionValueSelect
                        value={
                          (examData.autorefraction.os as any).c1 ||
                          examData.autorefraction.os.c
                        }
                        onChange={(value) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              os: {
                                ...prev.autorefraction.os,
                                c: value,
                                c1: value,
                              },
                            },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <Input
                        value={
                          (examData.autorefraction.os as any).a1 ??
                          examData.autorefraction.os.axis
                        }
                        onChange={(e) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              os: {
                                ...prev.autorefraction.os,
                                axis: e.target.value,
                                a1: e.target.value,
                              },
                            },
                          }))
                        }
                        className={mobileExamInputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">After</Label>
                    <div className="grid grid-cols-3 gap-1">
                      <RefractionValueSelect
                        value={(examData.autorefraction.os as any).afterS || ""}
                        onChange={(value) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              os: { ...prev.autorefraction.os, afterS: value },
                            },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <RefractionValueSelect
                        value={(examData.autorefraction.os as any).afterC || ""}
                        onChange={(value) =>
                          setExamData((prev) => ({
                            ...prev,
                            autorefraction: {
                              ...prev.autorefraction,
                              os: { ...prev.autorefraction.os, afterC: value },
                            },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <Input
                        value={(examData.autorefraction.os as any).afterA || ""}
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
                        className={mobileExamInputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                    <Label className="text-xs">AirPuff</Label>
                    <RefractionValueSelect
                      value={examData.autorefraction.os.airPuff1}
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            os: { ...prev.autorefraction.os, airPuff1: value },
                          },
                        }))
                      }
                      options={AIR_PUFF_OPTIONS}
                      triggerClassName={mobileExamInputClass}
                    />
                  </div>
                  <div className="pt-1 border-t">
                    <div className="text-xs font-semibold mb-1">Refraction</div>
                    <div className="grid grid-cols-[40px_1fr] gap-1 items-center">
                      <Label className="text-xs">S</Label>
                      <RefractionValueSelect
                        value={refractionTableData.os.s}
                        onChange={(value) =>
                          setRefractionTableData((prev) => ({
                            ...prev,
                            os: { ...prev.os, s: value },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <Label className="text-xs">C</Label>
                      <RefractionValueSelect
                        value={refractionTableData.os.c}
                        onChange={(value) =>
                          setRefractionTableData((prev) => ({
                            ...prev,
                            os: { ...prev.os, c: value },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        triggerClassName={mobileExamInputClass}
                      />
                      <Label className="text-xs">A</Label>
                      <Input
                        value={refractionTableData.os.a}
                        onChange={(e) =>
                          setRefractionTableData((prev) => ({
                            ...prev,
                            os: { ...prev.os, a: e.target.value },
                          }))
                        }
                        className={mobileExamInputClass}
                      />
                      <Label className="text-xs">P.D</Label>
                      <Input
                        value={refractionTableData.os.pd}
                        onChange={(e) =>
                          setRefractionTableData((prev) => ({
                            ...prev,
                            os: { ...prev.os, pd: e.target.value },
                          }))
                        }
                        className={mobileExamInputClass}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {!isMobileViewport && (
            <div
              className="max-w-4xl mx-auto mt-2 space-y-2 overflow-x-auto"
              dir="ltr"
            >
              <div className="min-w-[720px] space-y-2">
                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2 text-base font-bold">
                  <div></div>
                  <div className="text-left pl-1">Right (OD)</div>
                  <div className="text-left pl-1">Left (OS)</div>
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2">
                  <div className="text-base font-semibold">UCVA</div>
                  <RefractionValueSelect
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
                    triggerClassName={desktopVisionSelectClass}
                  />
                  <RefractionValueSelect
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
                    triggerClassName={desktopVisionSelectClass}
                  />
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <div className="text-sm font-semibold">BCVA</div>
                  <RefractionValueSelect
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
                    triggerClassName={desktopVisionSelectClass}
                  />
                  <RefractionValueSelect
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
                    triggerClassName={desktopVisionSelectClass}
                  />
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <div className="text-sm font-semibold">Autoref</div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="w-24 text-center">S</span>
                    <span className="w-24 text-center">C</span>
                    <span className="w-24 text-center">A</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="w-24 text-center">S</span>
                    <span className="w-24 text-center">C</span>
                    <span className="w-24 text-center">A</span>
                  </div>
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <div></div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={
                        (examData.autorefraction.od as any).s1 ||
                        examData.autorefraction.od.s
                      }
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            od: {
                              ...prev.autorefraction.od,
                              s: value,
                              s1: value,
                            },
                          },
                        }))
                      }
                      options={SPHERE_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                    <RefractionValueSelect
                      value={
                        (examData.autorefraction.od as any).c1 ||
                        examData.autorefraction.od.c
                      }
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            od: {
                              ...prev.autorefraction.od,
                              c: value,
                              c1: value,
                            },
                          },
                        }))
                      }
                      options={CYLINDER_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                    <Input
                      value={
                        (examData.autorefraction.od as any).a1 ??
                        examData.autorefraction.od.axis
                      }
                      onChange={(e) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            od: {
                              ...prev.autorefraction.od,
                              axis: e.target.value,
                              a1: e.target.value,
                            },
                          },
                        }))
                      }
                      className={desktopRefractionInputClass}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={
                        (examData.autorefraction.os as any).s1 ||
                        examData.autorefraction.os.s
                      }
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            os: {
                              ...prev.autorefraction.os,
                              s: value,
                              s1: value,
                            },
                          },
                        }))
                      }
                      options={SPHERE_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                    <RefractionValueSelect
                      value={
                        (examData.autorefraction.os as any).c1 ||
                        examData.autorefraction.os.c
                      }
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            os: {
                              ...prev.autorefraction.os,
                              c: value,
                              c1: value,
                            },
                          },
                        }))
                      }
                      options={CYLINDER_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                    <Input
                      value={
                        (examData.autorefraction.os as any).a1 ??
                        examData.autorefraction.os.axis
                      }
                      onChange={(e) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            os: {
                              ...prev.autorefraction.os,
                              axis: e.target.value,
                              a1: e.target.value,
                            },
                          },
                        }))
                      }
                      className={desktopRefractionInputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <div className="text-sm font-semibold">After</div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={(examData.autorefraction.od as any).afterS || ""}
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            od: { ...prev.autorefraction.od, afterS: value },
                          },
                        }))
                      }
                      options={SPHERE_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                    <RefractionValueSelect
                      value={(examData.autorefraction.od as any).afterC || ""}
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            od: { ...prev.autorefraction.od, afterC: value },
                          },
                        }))
                      }
                      options={CYLINDER_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                    <Input
                      value={(examData.autorefraction.od as any).afterA || ""}
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
                      className={desktopRefractionInputClass}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={(examData.autorefraction.os as any).afterS || ""}
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            os: { ...prev.autorefraction.os, afterS: value },
                          },
                        }))
                      }
                      options={SPHERE_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                    <RefractionValueSelect
                      value={(examData.autorefraction.os as any).afterC || ""}
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            os: { ...prev.autorefraction.os, afterC: value },
                          },
                        }))
                      }
                      options={CYLINDER_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                    <Input
                      value={(examData.autorefraction.os as any).afterA || ""}
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
                      className={desktopRefractionInputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <div className="text-sm font-semibold">AirPuff</div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={examData.autorefraction.od.airPuff1}
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            od: { ...prev.autorefraction.od, airPuff1: value },
                          },
                        }))
                      }
                      options={AIR_PUFF_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={examData.autorefraction.os.airPuff1}
                      onChange={(value) =>
                        setExamData((prev) => ({
                          ...prev,
                          autorefraction: {
                            ...prev.autorefraction,
                            os: { ...prev.autorefraction.os, airPuff1: value },
                          },
                        }))
                      }
                      options={AIR_PUFF_OPTIONS}
                      triggerClassName={desktopRefractionInputClass}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div
                      className="text-center text-card-foreground font-bold py-1"
                      style={{
                        background: "var(--primary)",
                        borderRadius: "8px 8px 0 0",
                      }}
                    >
                      RIGHT
                    </div>
                    <table className="w-full border-collapse text-center text-sm bg-background">
                      <thead>
                        <tr>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          ></th>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          >
                            S
                          </th>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          >
                            C
                          </th>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          >
                            A
                          </th>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          >
                            P.D.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ height: 48 }}>
                          <td
                            style={{
                              border: "2px solid var(--primary)",
                              fontWeight: 700,
                            }}
                          >
                            DIST
                          </td>
                          <td
                            style={{ border: "2px solid var(--primary)", padding: 4 }}
                          >
                            <Input
                              value={refractionTableData.od.s}
                              onChange={(e) =>
                                setRefractionTableData((prev) => ({
                                  ...prev,
                                  od: { ...prev.od, s: e.target.value },
                                }))
                              }
                              className="h-7 w-full text-sm text-center border-input"
                            />
                          </td>
                          <td
                            style={{ border: "2px solid var(--primary)", padding: 4 }}
                          >
                            <Input
                              value={refractionTableData.od.c}
                              onChange={(e) =>
                                setRefractionTableData((prev) => ({
                                  ...prev,
                                  od: { ...prev.od, c: e.target.value },
                                }))
                              }
                              className="h-7 w-full text-sm text-center border-input"
                            />
                          </td>
                          <td
                            style={{ border: "2px solid var(--primary)", padding: 4 }}
                          >
                            <Input
                              value={refractionTableData.od.a}
                              onChange={(e) =>
                                setRefractionTableData((prev) => ({
                                  ...prev,
                                  od: { ...prev.od, a: e.target.value },
                                }))
                              }
                              className="h-7 w-full text-sm text-center border-input"
                            />
                          </td>
                          <td
                            style={{ border: "2px solid var(--primary)", padding: 4 }}
                          >
                            <Input
                              value={refractionTableData.od.pd}
                              onChange={(e) =>
                                setRefractionTableData((prev) => ({
                                  ...prev,
                                  od: { ...prev.od, pd: e.target.value },
                                }))
                              }
                              className="h-7 w-full text-sm text-center border-input"
                            />
                          </td>
                        </tr>
                        <tr style={{ height: 48 }}>
                          <td
                            style={{
                              border: "2px solid var(--primary)",
                              fontWeight: 700,
                            }}
                          >
                            NEAR
                          </td>
                          <td style={{ border: "2px solid var(--primary)" }}></td>
                          <td style={{ border: "2px solid var(--primary)" }}></td>
                          <td style={{ border: "2px solid var(--primary)" }}></td>
                          <td style={{ border: "2px solid var(--primary)" }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div
                      className="text-center text-card-foreground font-bold py-1"
                      style={{
                        background: "var(--primary)",
                        borderRadius: "8px 8px 0 0",
                      }}
                    >
                      LEFT
                    </div>
                    <table className="w-full border-collapse text-center text-sm bg-background">
                      <thead>
                        <tr>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          ></th>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          >
                            S
                          </th>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          >
                            C
                          </th>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          >
                            A
                          </th>
                          <th
                            style={{ border: "2px solid var(--primary)", padding: 6 }}
                          >
                            P.D.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ height: 48 }}>
                          <td
                            style={{
                              border: "2px solid var(--primary)",
                              fontWeight: 700,
                            }}
                          >
                            DIST
                          </td>
                          <td
                            style={{ border: "2px solid var(--primary)", padding: 4 }}
                          >
                            <Input
                              value={refractionTableData.os.s}
                              onChange={(e) =>
                                setRefractionTableData((prev) => ({
                                  ...prev,
                                  os: { ...prev.os, s: e.target.value },
                                }))
                              }
                              className="h-7 w-full text-sm text-center border-input"
                            />
                          </td>
                          <td
                            style={{ border: "2px solid var(--primary)", padding: 4 }}
                          >
                            <Input
                              value={refractionTableData.os.c}
                              onChange={(e) =>
                                setRefractionTableData((prev) => ({
                                  ...prev,
                                  os: { ...prev.os, c: e.target.value },
                                }))
                              }
                              className="h-7 w-full text-sm text-center border-input"
                            />
                          </td>
                          <td
                            style={{ border: "2px solid var(--primary)", padding: 4 }}
                          >
                            <Input
                              value={refractionTableData.os.a}
                              onChange={(e) =>
                                setRefractionTableData((prev) => ({
                                  ...prev,
                                  os: { ...prev.os, a: e.target.value },
                                }))
                              }
                              className="h-7 w-full text-sm text-center border-input"
                            />
                          </td>
                          <td
                            style={{ border: "2px solid var(--primary)", padding: 4 }}
                          >
                            <Input
                              value={refractionTableData.os.pd}
                              onChange={(e) =>
                                setRefractionTableData((prev) => ({
                                  ...prev,
                                  os: { ...prev.os, pd: e.target.value },
                                }))
                              }
                              className="h-7 w-full text-sm text-center border-input"
                            />
                          </td>
                        </tr>
                        <tr style={{ height: 48 }}>
                          <td
                            style={{
                              border: "2px solid var(--primary)",
                              fontWeight: 700,
                            }}
                          >
                            NEAR
                          </td>
                          <td style={{ border: "2px solid var(--primary)" }}></td>
                          <td style={{ border: "2px solid var(--primary)" }}></td>
                          <td style={{ border: "2px solid var(--primary)" }}></td>
                          <td style={{ border: "2px solid var(--primary)" }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="space-y-1 pr-6 flex flex-col items-end w-full">
              <Label htmlFor="nurse-signature" className="font-bold text-right">
                توقيع التمريض
              </Label>
              <Input
                id="nurse-signature"
                name="nurse-signature"
                value={nurseSignature}
                onChange={(e) => setNurseSignature(e.target.value)}
                className="text-right w-full max-w-sm ms-auto"
              />
            </div>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
