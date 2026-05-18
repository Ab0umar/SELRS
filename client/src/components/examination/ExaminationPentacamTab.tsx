import PatientPicker from "@/components/PatientPicker";
import PentacamFilesPanel from "@/components/PentacamFilesPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import type { UseExaminationFormResult } from "@/hooks/examination/useExaminationForm";

interface ExaminationPentacamTabProps {
  form: UseExaminationFormResult;
}

export default function ExaminationPentacamTab({ form }: ExaminationPentacamTabProps) {
  const {
    handleSelectPatient,
    hasPatient,
    isMobileViewport,
    examData,
    setExamData,
    mobileExamInputClass,
    technicianSignature,
    setTechnicianSignature,
    patientInfo,
  } = form;

  return (
          <TabsContent value="pentacam" className="sheet-layout exam-compact-inputs">
            <div className="mb-4 flex justify-end">
              <PatientPicker onSelect={handleSelectPatient} />
            </div>
            {!hasPatient && (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Please select a patient first to enter Pentacam data.
                </CardContent>
              </Card>
            )}
            {hasPatient && (
              <div className="bg-background p-3 sm:p-4">
                {isMobileViewport && (
                  <div className="w-full px-4 space-y-3" dir="ltr">
                    <Card className="border">
                      <CardHeader className="py-2">
                        <CardTitle className="text-sm text-center">Right (OD)</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                          <Label className="text-xs">K1/K2</Label>
                          <div className="grid grid-cols-2 gap-1">
                            <Input value={examData.pentacam.od.k1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, k1: e.target.value } } }))} className={mobileExamInputClass} />
                            <Input value={examData.pentacam.od.k2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, k2: e.target.value } } }))} className={mobileExamInputClass} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                          <Label className="text-xs">AX</Label>
                          <div className="grid grid-cols-2 gap-1">
                            <Input value={examData.pentacam.od.ax1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ax1: e.target.value } } }))} className={mobileExamInputClass} />
                            <Input value={examData.pentacam.od.ax2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ax2: e.target.value } } }))} className={mobileExamInputClass} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Thinnest Point</Label><Input value={examData.pentacam.od.thinnest} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, thinnest: e.target.value } } }))} className={mobileExamInputClass} /></div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Corneal Apex</Label><Input value={examData.pentacam.od.apex} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, apex: e.target.value } } }))} className={mobileExamInputClass} /></div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Residual Stroma</Label><Input value={examData.pentacam.od.residual} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, residual: e.target.value } } }))} className={mobileExamInputClass} /></div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Planned TTT</Label><Input value={examData.pentacam.od.ttt} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ttt: e.target.value } } }))} className={mobileExamInputClass} /></div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Ablation</Label><Input value={examData.pentacam.od.ablation} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ablation: e.target.value } } }))} className={mobileExamInputClass} /></div>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardHeader className="py-2">
                        <CardTitle className="text-sm text-center">Left (OS)</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                          <Label className="text-xs">K1/K2</Label>
                          <div className="grid grid-cols-2 gap-1">
                            <Input value={examData.pentacam.os.k1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, k1: e.target.value } } }))} className={mobileExamInputClass} />
                            <Input value={examData.pentacam.os.k2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, k2: e.target.value } } }))} className={mobileExamInputClass} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                          <Label className="text-xs">AX</Label>
                          <div className="grid grid-cols-2 gap-1">
                            <Input value={examData.pentacam.os.ax1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ax1: e.target.value } } }))} className={mobileExamInputClass} />
                            <Input value={examData.pentacam.os.ax2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ax2: e.target.value } } }))} className={mobileExamInputClass} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Thinnest Point</Label><Input value={examData.pentacam.os.thinnest} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, thinnest: e.target.value } } }))} className={mobileExamInputClass} /></div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Corneal Apex</Label><Input value={examData.pentacam.os.apex} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, apex: e.target.value } } }))} className={mobileExamInputClass} /></div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Residual Stroma</Label><Input value={examData.pentacam.os.residual} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, residual: e.target.value } } }))} className={mobileExamInputClass} /></div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Planned TTT</Label><Input value={examData.pentacam.os.ttt} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ttt: e.target.value } } }))} className={mobileExamInputClass} /></div>
                        <div className="grid grid-cols-[60px_1fr] items-center gap-2"><Label className="text-xs">Ablation</Label><Input value={examData.pentacam.os.ablation} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ablation: e.target.value } } }))} className={mobileExamInputClass} /></div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {!isMobileViewport && (
                <div className="max-w-4xl mx-auto mt-2 overflow-x-auto grid grid-cols-2 gap-4" dir="ltr">
                  {/* RT (Right Eye) */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-500 text-white font-bold p-2 text-center">RT فحص القرنية</div>
                    <table className="w-full border-collapse text-sm">
                      <tbody>
                        <tr>
                          <td className="border p-2 font-semibold w-24">K1</td>
                          <td className="border p-2"><Input value={examData.pentacam.od.k1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, k1: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                          <td className="border p-2 font-semibold text-center" rowSpan={2}>AX</td>
                          <td className="border p-2" rowSpan={2}><div className="flex flex-col h-full"><Input value={examData.pentacam.od.ax1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ax1: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input rounded-b-none" /><div className="border-t"></div><Input value={examData.pentacam.od.ax2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ax2: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input rounded-t-none" /></div></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">K2</td>
                          <td className="border p-2"><Input value={examData.pentacam.od.k2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, k2: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">Thinnest</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.od.thinnest} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, thinnest: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">Apex</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.od.apex} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, apex: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">Residual</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.od.residual} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, residual: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">TTT</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.od.ttt} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ttt: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">Ablation</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.od.ablation} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam.od, ablation: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* LT (Left Eye) */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-500 text-white font-bold p-2 text-center">LT فحص القرنية</div>
                    <table className="w-full border-collapse text-sm">
                      <tbody>
                        <tr>
                          <td className="border p-2 font-semibold w-24">K1</td>
                          <td className="border p-2"><Input value={examData.pentacam.os.k1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, k1: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                          <td className="border p-2 font-semibold text-center" rowSpan={2}>AX</td>
                          <td className="border p-2" rowSpan={2}><div className="flex flex-col h-full"><Input value={examData.pentacam.os.ax1} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ax1: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input rounded-b-none" /><div className="border-t"></div><Input value={examData.pentacam.os.ax2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ax2: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input rounded-t-none" /></div></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">K2</td>
                          <td className="border p-2"><Input value={examData.pentacam.os.k2} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, k2: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">Thinnest</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.os.thinnest} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, thinnest: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">Apex</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.os.apex} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, apex: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">Residual</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.os.residual} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, residual: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">TTT</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.os.ttt} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ttt: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-semibold">Ablation</td>
                          <td className="border p-2" colSpan={3}><Input value={examData.pentacam.os.ablation} onChange={(e) => setExamData((prev) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam.os, ablation: e.target.value } } }))} className="h-7 w-full text-sm text-center border-input" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                )}

                <div className="mt-2">
                  <div className="space-y-1 pr-6 flex flex-col items-end w-full">
                    <Label htmlFor="technician-signature" className="font-bold text-right">توقيع الفني</Label>
                    <Input
                      id="technician-signature"
                      name="technician-signature"
                      value={technicianSignature}
                      onChange={(e) => setTechnicianSignature(e.target.value)}
                      className="text-right w-full max-w-sm ms-auto"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <PentacamFilesPanel patientId={patientInfo.id} compact />
                </div>
              </div>
            )}
          </TabsContent>
  );
}

