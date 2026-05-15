
import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Eye,
  Search,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { serviceTypeLabels } from '@/lib/dashboard-data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TodayPatientRecord {
  patientName: string
  doctorName: string
  serviceType: string
  checkInTime: string
}

/* ─── Mock medical data ─── */
const mockExaminations = [
  { id: 1, date: '2026-01-15', label: 'زيارة - فحص شامل' },
  { id: 2, date: '2025-12-20', label: 'متابعة ما بعد الليزك' },
]

const mockMeasurements = {
  od: { ucva: '6/9', bcva: '6/6', s: '-2.50', c: '-0.75', axis: '180', iop: '14' },
  os: { ucva: '6/12', bcva: '6/6', s: '-3.00', c: '-1.00', axis: '5', iop: '15' },
}

const mockAfterRefraction = {
  od: { s: '-2.25', c: '-0.50', axis: '180' },
  os: { s: '-2.75', c: '-0.75', axis: '5' },
}

const mockGlasses = {
  od: { s: '-2.50', c: '-0.75', axis: '180', pd: '32' },
  os: { s: '-3.00', c: '-1.00', axis: '5', pd: '32' },
}

const mockPentacam = {
  od: { k1: '43.25', k2: '44.00', axis: '90', thinnest: '520', apex: '541', residual: '312', ttt: '485', ablation: '82' },
  os: { k1: '43.50', k2: '44.50', axis: '85', thinnest: '508', apex: '530', residual: '310', ttt: '478', ablation: '85' },
}

const mockFundus = {
  od: { disc: 'Normal', cup: '0.3', macula: 'Normal', vessels: 'Normal' },
  os: { disc: 'Normal', cup: '0.3', macula: 'Normal', vessels: 'Normal' },
}

const mockDiseases = [
  'Myopia', 'Astigmatism', 'Keratoconus', 'Cataract', 'Glaucoma',
  'Dry Eye', 'Pterygium', 'Corneal Ulcer', 'Retinal Detachment', 'Diabetic Retinopathy',
]

const mockMedications = [
  'Tobramycin 0.3%', 'Fluorometholone 0.1%', 'Artificial Tears',
  'Diclofenac 0.1%', 'Cyclopentolate 1%', 'Timolol 0.5%',
  'Latanoprost 0.005%', 'Prednisolone 1%', 'Ofloxacin 0.3%',
  'Vitamin A drops', 'Sodium Hyaluronate 0.1%', 'Chloramphenicol 0.5%',
]

const mockTests = [
  'CBC', 'Blood Sugar', 'HbA1c', 'ESR', 'CRP',
  'OCT - Macula', 'OCT - RNFL', 'Visual Field', 'Corneal Topography',
  'A-scan Biometry', 'B-scan', 'Fundus Photo',
]

/* ─── Component Props ─── */
interface MedicalFilePanelProps {
  patient: TodayPatientRecord | null
  open: boolean
  onClose: () => void
}

/* ─── Medical File Panel ─── */
export function MedicalFilePanel({ patient, open, onClose }: MedicalFilePanelProps) {
  const [activeTab, setActiveTab] = useState('medical-history')
  const [isFollowup, setIsFollowup] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState('1')

  // Medical history
  const [medicalHistory, setMedicalHistory] = useState('لا يوجد أمراض مزمنة\nلا يوجد عمليات سابقة\nلا يوجد حساسية دوائية')

  // Measurements
  const [measurements, setMeasurements] = useState(mockMeasurements)
  const [afterRefraction, setAfterRefraction] = useState(mockAfterRefraction)
  const [glasses, setGlasses] = useState(mockGlasses)

  // Pentacam
  const [pentacam, setPentacam] = useState(mockPentacam)

  // Fundus
  const [fundus, setFundus] = useState(mockFundus)

  // Investigation
  const [testSearch, setTestSearch] = useState('')
  const [selectedTests, setSelectedTests] = useState<string[]>(['CBC', 'Blood Sugar', 'OCT - Macula'])

  // Diagnosis
  const [diagnosis, setDiagnosis] = useState('Myopia with Astigmatism - Both Eyes\nMyopic LASIK candidate')
  const [diseaseSearch, setDiseaseSearch] = useState('')
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>(['Myopia', 'Astigmatism'])
  const [recommendations, setRecommendations] = useState('إجراء فحص بنتاكام\nمناقشة خيارات الليزك مع المريض')

  // Treatment
  const [medSearch, setMedSearch] = useState('')
  const [selectedMeds, setSelectedMeds] = useState<string[]>(['Artificial Tears', 'Tobramycin 0.3%'])

  const toggleItem = useCallback((list: string[], item: string) =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item], [])

  const filteredTests = useMemo(
    () => mockTests.filter((t) => t.toLowerCase().includes(testSearch.toLowerCase()) && !selectedTests.includes(t)),
    [testSearch, selectedTests]
  )

  const filteredDiseases = useMemo(
    () => mockDiseases.filter((d) => d.toLowerCase().includes(diseaseSearch.toLowerCase()) && !selectedDiseases.includes(d)),
    [diseaseSearch, selectedDiseases]
  )

  const filteredMeds = useMemo(
    () => mockMedications.filter((m) => m.toLowerCase().includes(medSearch.toLowerCase()) && !selectedMeds.includes(m)),
    [medSearch, selectedMeds]
  )

  if (!patient) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full h-full sm:max-w-[95vw] sm:h-[90vh] sm:w-[900px] sm:max-h-[95vh] sm:rounded-xl p-0 flex flex-col gap-0 overflow-hidden rounded-none sm:rounded-xl"
        dir="rtl"
      >
        {/* ─── Header ─── */}
        <DialogHeader className="border-b px-4 py-3 sm:px-5 sm:py-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5 min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground truncate">
                {patient.patientName}
              </DialogTitle>
              <DialogDescription className="sr-only">
                ملف طبي للمريض {patient.patientName}
              </DialogDescription>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] sm:text-xs font-medium bg-muted/50">
                  {serviceTypeLabels[patient.serviceType]}
                </Badge>
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {patient.doctorName}
                </Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              aria-label="إغلاق الملف الطبي"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </DialogHeader>

        {/* ─── Followup + Exam selector ─── */}
        <div className="border-b px-4 py-2 sm:px-5 sm:py-2.5 flex items-center gap-3 sm:gap-6 flex-wrap flex-shrink-0 bg-muted/30">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={isFollowup} onCheckedChange={(v) => setIsFollowup(Boolean(v))} />
            <span className="text-sm font-medium">متابعه</span>
          </label>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <div className="flex items-center gap-2 text-sm min-w-0">
            <label htmlFor="exam-select" className="font-medium text-muted-foreground shrink-0">الفحص:</label>
            <select
              id="exam-select"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="h-8 text-sm border rounded-md px-2 bg-background flex-1 min-w-0 max-w-[200px]"
              aria-label="اختر الفحص السابق"
            >
              {mockExaminations.map((exam) => (
                <option key={exam.id} value={String(exam.id)}>
                  {exam.date} — {exam.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Tabs + Content ─── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          dir="rtl"
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="px-3 pt-3 sm:px-5 sm:pt-4 flex-shrink-0">
            <TabsList className="w-full justify-start gap-0.5 sm:gap-1 h-9 overflow-x-auto scrollbar-none">
              <TabsTrigger value="medical-history" className="text-xs whitespace-nowrap px-2.5">
                التاريخ المرضي
              </TabsTrigger>
              <TabsTrigger value="measurements" className="text-xs whitespace-nowrap px-2.5">
                القياسات
              </TabsTrigger>
              <TabsTrigger value="pentacam" className="text-xs whitespace-nowrap px-2.5">
                بنتاكام
              </TabsTrigger>
              <TabsTrigger value="investigation" className="text-xs whitespace-nowrap px-2.5">
                التحاليل
              </TabsTrigger>
              <TabsTrigger value="diagnosis" className="text-xs whitespace-nowrap px-2.5">
                التشخيص
              </TabsTrigger>
              <TabsTrigger value="treatment" className="text-xs whitespace-nowrap px-2.5">
                العلاج
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            {/* ════════════════ Tab 1: التاريخ المرضي ════════════════ */}
            <TabsContent value="medical-history" className="mt-0 space-y-6">
              {/* Profile Data */}
              <div>
                <h3 className="text-base font-semibold mb-4">بيانات المريض</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">الاسم</Label>
                    <Input value={patient.patientName} disabled className="mt-1 text-xs h-9" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">الطبيب</Label>
                    <Input value={patient.doctorName} disabled className="mt-1 text-xs h-9" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">الخدمة</Label>
                    <Input value={serviceTypeLabels[patient.serviceType]} disabled className="mt-1 text-xs h-9" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">الوقت</Label>
                    <Input value={patient.checkInTime} disabled className="mt-1 text-xs h-9" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Medical History Text */}
              <div>
                <Label htmlFor="medical-history" className="text-base font-semibold block mb-4">التاريخ المرضي</Label>
                <Textarea
                  id="medical-history"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="اكتب التاريخ المرضي هنا..."
                  className="mt-1 text-sm"
                  rows={6}
                  aria-label="التاريخ المرضي للمريض"
                />
              </div>
            </TabsContent>

            {/* ════════════════ Tab 2: القياسات ════════════════ */}
            <TabsContent value="measurements" className="mt-0 space-y-6">
              {/* AutoRef | IOP */}
              <div>
                <h3 className="text-base font-semibold mb-4">AutoRef | IOP</h3>

                {/* UCVA row */}
                <div className="flex items-center gap-2 mb-4" dir="ltr">
                  <span className="font-semibold text-sm min-w-[50px]">UCVA</span>
                  <Input value={measurements.od.ucva} readOnly className="w-20 h-8 text-xs text-center" />
                  <span className="text-muted-foreground">/</span>
                  <Input value={measurements.os.ucva} readOnly className="w-20 h-8 text-xs text-center" />
                  <span className="text-muted-foreground text-xs mr-auto">(OD / OS)</span>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block rounded-xl border overflow-hidden">
                  <table className="w-full border-collapse text-center text-xs" dir="ltr" aria-label="القياسات الضوئية والضغط">
                    <thead className="bg-muted/60">
                      <tr>
                        <th scope="col" className="border px-3 py-2 font-semibold">Eye</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">UCVA</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">BCVA</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">S</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">C</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">Axis</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">IOP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['od', 'os'] as const).map((eye) => (
                        <tr key={eye} className="bg-background hover:bg-muted/30">
                          <td className="border px-3 py-2 font-bold">{eye.toUpperCase()}</td>
                          <td className="border px-3 py-2">{measurements[eye].ucva}</td>
                          <td className="border px-3 py-2">{measurements[eye].bcva}</td>
                          <td className="border px-3 py-2 font-medium">{measurements[eye].s}</td>
                          <td className="border px-3 py-2 font-medium">{measurements[eye].c}</td>
                          <td className="border px-3 py-2">{measurements[eye].axis}</td>
                          <td className="border px-3 py-2">{measurements[eye].iop}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2" dir="ltr">
                  {(['od', 'os'] as const).map((eye) => (
                    <div key={eye} className="rounded-lg border p-3 bg-background">
                      <div className="text-xs font-bold mb-2">{eye.toUpperCase()}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground block">UCVA</span>{measurements[eye].ucva}</div>
                        <div><span className="text-muted-foreground block">BCVA</span>{measurements[eye].bcva}</div>
                        <div><span className="text-muted-foreground block">IOP</span>{measurements[eye].iop}</div>
                        <div><span className="text-muted-foreground block">S</span>{measurements[eye].s}</div>
                        <div><span className="text-muted-foreground block">C</span>{measurements[eye].c}</div>
                        <div><span className="text-muted-foreground block">Axis</span>{measurements[eye].axis}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* After Refraction */}
              <div>
                <h3 className="text-base font-semibold mb-4">After Refraction</h3>
                <div className="hidden md:block rounded-xl border overflow-hidden">
                  <table className="w-full border-collapse text-center text-xs" dir="ltr" aria-label="القياسات بعد الانكسار">
                    <thead className="bg-muted/60">
                      <tr>
                        <th scope="col" className="border px-3 py-2 font-semibold">Eye</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">S</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">C</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">Axis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['od', 'os'] as const).map((eye) => (
                        <tr key={eye} className="bg-background">
                          <td className="border px-3 py-2 font-bold">{eye.toUpperCase()}</td>
                          <td className="border px-3 py-2">{afterRefraction[eye].s}</td>
                          <td className="border px-3 py-2">{afterRefraction[eye].c}</td>
                          <td className="border px-3 py-2">{afterRefraction[eye].axis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2" dir="ltr">
                  {(['od', 'os'] as const).map((eye) => (
                    <div key={eye} className="rounded-lg border p-3 bg-background">
                      <div className="text-xs font-bold mb-2">{eye.toUpperCase()} - After</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground block">S</span>{afterRefraction[eye].s}</div>
                        <div><span className="text-muted-foreground block">C</span>{afterRefraction[eye].c}</div>
                        <div><span className="text-muted-foreground block">Axis</span>{afterRefraction[eye].axis}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refraction (Glasses) */}
              <div>
                <h3 className="text-base font-semibold mb-4">الانكسار (النظارة)</h3>
                <div className="hidden md:block rounded-xl border overflow-hidden">
                  <table className="w-full border-collapse text-center text-xs" dir="ltr" aria-label="بيانات النظارة الطبية">
                    <thead className="bg-muted/60">
                      <tr>
                        <th scope="col" className="border px-3 py-2 font-semibold">Type</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">Eye</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">S</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">C</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">Axis</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">PD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['od', 'os'] as const).map((eye) => (
                        <tr key={eye} className="bg-background">
                          <td className="border px-3 py-2 font-bold">DIST</td>
                          <td className="border px-3 py-2 font-bold">{eye.toUpperCase()}</td>
                          <td className="border px-3 py-2">{glasses[eye].s}</td>
                          <td className="border px-3 py-2">{glasses[eye].c}</td>
                          <td className="border px-3 py-2">{glasses[eye].axis}</td>
                          <td className="border px-3 py-2">{glasses[eye].pd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2" dir="ltr">
                  {(['od', 'os'] as const).map((eye) => (
                    <div key={eye} className="rounded-lg border p-3 bg-background">
                      <div className="text-xs font-bold mb-2">{eye.toUpperCase()} - Glasses</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground block">S</span>{glasses[eye].s}</div>
                        <div><span className="text-muted-foreground block">C</span>{glasses[eye].c}</div>
                        <div><span className="text-muted-foreground block">Axis</span>{glasses[eye].axis}</div>
                        <div><span className="text-muted-foreground block">PD</span>{glasses[eye].pd}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fundus */}
              <div>
                <h3 className="text-base font-semibold mb-4">فحص قاع العين</h3>
                <div className="hidden md:block rounded-xl border overflow-hidden">
                  <table className="w-full border-collapse text-center text-xs" dir="ltr" aria-label="فحص قاع العين">
                    <thead className="bg-muted/60">
                      <tr>
                        <th scope="col" className="border px-3 py-2 font-semibold">Eye</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">Disc</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">Cup/Disc</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">Macula</th>
                        <th scope="col" className="border px-3 py-2 font-semibold">Vessels</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['od', 'os'] as const).map((eye) => (
                        <tr key={eye} className="bg-background">
                          <td className="border px-3 py-2 font-bold">{eye.toUpperCase()}</td>
                          <td className="border px-3 py-2">{fundus[eye].disc}</td>
                          <td className="border px-3 py-2">{fundus[eye].cup}</td>
                          <td className="border px-3 py-2">{fundus[eye].macula}</td>
                          <td className="border px-3 py-2">{fundus[eye].vessels}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2" dir="ltr">
                  {(['od', 'os'] as const).map((eye) => (
                    <div key={eye} className="rounded-lg border p-3 bg-background">
                      <div className="text-xs font-bold mb-2">{eye.toUpperCase()} - Fundus</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground block">Disc</span>{fundus[eye].disc}</div>
                        <div><span className="text-muted-foreground block">C/D</span>{fundus[eye].cup}</div>
                        <div><span className="text-muted-foreground block">Macula</span>{fundus[eye].macula}</div>
                        <div><span className="text-muted-foreground block">Vessels</span>{fundus[eye].vessels}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ════════════════ Tab 3: بنتاكام ════════════════ */}
            <TabsContent value="pentacam" className="mt-0 space-y-5">
              <div>
                <h3 className="text-base font-semibold mb-4">بنتاكام</h3>
                <Button variant="outline" className="mb-4 gap-2" onClick={() => toast.info('البنتاكام', { description: 'عرض صور البنتاكام — قريباً' })} aria-label="عرض صور البنتاكام">
                  <Eye className="h-4 w-4" aria-hidden />
                  عرض صور البنتاكام
                </Button>

                {/* Desktop table */}
                <div className="hidden md:block rounded-xl border overflow-hidden">
                  <table className="w-full border-collapse text-center text-xs" dir="ltr" aria-label="قياسات البنتاكام">
                    <thead className="bg-muted/60 uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th scope="col" className="border px-3 py-2.5">Eye</th>
                        <th scope="col" className="border px-3 py-2.5">K1</th>
                        <th scope="col" className="border px-3 py-2.5">K2</th>
                        <th scope="col" className="border px-3 py-2.5">Axis</th>
                        <th scope="col" className="border px-3 py-2.5">Thinnest</th>
                        <th scope="col" className="border px-3 py-2.5">Apex</th>
                        <th scope="col" className="border px-3 py-2.5">Residual</th>
                        <th scope="col" className="border px-3 py-2.5">TTT</th>
                        <th scope="col" className="border px-3 py-2.5">Ablation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['od', 'os'] as const).map((eye) => (
                        <tr key={eye} className="bg-background text-sm">
                          <td className="border px-3 py-2.5 font-bold">{eye.toUpperCase()}</td>
                          {(['k1', 'k2', 'axis', 'thinnest', 'apex', 'residual', 'ttt', 'ablation'] as const).map((field) => (
                            <td key={field} className="border px-3 py-2.5">
                              {pentacam[eye][field]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {(['od', 'os'] as const).map((eye) => (
                    <div key={eye} className="rounded-xl border p-4 bg-background" dir="ltr">
                      <div className="text-sm font-bold mb-3">{eye.toUpperCase()} - Pentacam</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(['k1', 'k2', 'axis', 'thinnest', 'apex', 'residual', 'ttt', 'ablation'] as const).map((field) => (
                          <div key={field}>
                            <span className="text-muted-foreground capitalize block">{field}</span>
                            <span className="font-medium">{pentacam[eye][field]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ════════════════ Tab 4: التحاليل و الأشعة ════════════════ */}
            <TabsContent value="investigation" className="mt-0 space-y-5">
              <div>
                <h3 className="text-base font-semibold mb-4">التحاليل و الأشعة</h3>

                {/* Selected tests */}
                {selectedTests.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg border bg-muted/30">
                    <div className="text-xs font-semibold mb-2 text-muted-foreground">الفحوصات المطلوبة:</div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {selectedTests.map((test) => (
                        <Badge key={test} variant="secondary" className="text-xs gap-1 px-2.5 py-1">
                          {test}
                          <button
                            onClick={() => setSelectedTests((p) => toggleItem(p, test))}
                            className="hover:text-error transition-colors"
                            aria-label={`إزالة ${test}`}
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search tests */}
                <div className="relative mb-3">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input
                    placeholder="ابحث عن الفحوصات..."
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    className="pr-9 text-sm h-9"
                    aria-label="ابحث عن الفحوصات والتحاليل"
                  />
                </div>

                {testSearch && (
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto border rounded-lg p-2">
                    {filteredTests.map((test) => (
                      <label key={test} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <Checkbox checked={selectedTests.includes(test)} onCheckedChange={() => setSelectedTests((p) => toggleItem(p, test))} />
                        <span className="flex-1">{test}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ════════════════ Tab 5: التشخيص ════════════════ */}
            <TabsContent value="diagnosis" className="mt-0 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Diagnosis */}
                <div>
                  <Label htmlFor="diagnosis-field" className="text-base font-semibold block mb-4">التشخيص</Label>
                  <Textarea
                    id="diagnosis-field"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="أدخل تفاصيل التشخيص..."
                    className="text-sm min-h-[140px]"
                    rows={6}
                    aria-label="تفاصيل التشخيص الطبي"
                  />
                </div>

                {/* Diseases */}
                <div>
                  <h3 className="text-base font-semibold mb-4">الأمراض</h3>

                  {/* Selected diseases tags */}
                  {selectedDiseases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
                      {selectedDiseases.map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs gap-1 px-2.5 py-1 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border-primary/20 dark:border-primary/30">
                          {d}
                          <button
                            onClick={() => setSelectedDiseases((p) => toggleItem(p, d))}
                            className="hover:text-error transition-colors"
                            aria-label={`إزالة ${d}`}
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Disease search */}
                  <div className="relative mb-3">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                    <Input
                      placeholder="ابحث عن الأمراض..."
                      value={diseaseSearch}
                      onChange={(e) => setDiseaseSearch(e.target.value)}
                      className="pr-9 text-sm h-9"
                      aria-label="ابحث عن الأمراض والحالات المرضية"
                    />
                  </div>

                  {diseaseSearch && (
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto border rounded-lg p-2">
                      {filteredDiseases.map((d) => (
                        <label key={d} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                          <Checkbox checked={selectedDiseases.includes(d)} onCheckedChange={() => setSelectedDiseases((p) => toggleItem(p, d))} />
                          <span className="flex-1">{d}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="mt-5">
                    <Label htmlFor="recommendations-field" className="text-sm font-medium block mb-2">التوصيات</Label>
                    <Textarea
                      id="recommendations-field"
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      placeholder="أدخل التوصيات والملاحظات..."
                      className="text-sm min-h-[100px]"
                      rows={4}
                      aria-label="التوصيات الطبية"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ════════════════ Tab 6: العلاج ════════════════ */}
            <TabsContent value="treatment" className="mt-0 space-y-5">
              <div>
                <h3 className="text-base font-semibold mb-4">العلاج</h3>

                {/* Selected medications */}
                {selectedMeds.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg border bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30">
                    <div className="text-xs font-semibold mb-2 text-primary dark:text-primary">الأدوية المختارة:</div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {selectedMeds.map((med) => (
                        <Badge key={med} variant="outline" className="text-xs gap-1 px-2.5 py-1 border-primary/30 dark:border-primary/40">
                          {med}
                          <button
                            onClick={() => setSelectedMeds((p) => toggleItem(p, med))}
                            className="text-error hover:text-error/80 transition-colors"
                            aria-label={`إزالة ${med}`}
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medication search */}
                <div className="relative mb-3">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input
                    placeholder="ابحث عن الأدوية..."
                    value={medSearch}
                    onChange={(e) => setMedSearch(e.target.value)}
                    className="pr-9 text-sm h-9"
                    aria-label="ابحث عن الأدوية والعلاجات"
                  />
                </div>

                {medSearch && (
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto border rounded-lg p-2">
                    {filteredMeds.map((med) => (
                      <label key={med} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <Checkbox checked={selectedMeds.includes(med)} onCheckedChange={() => setSelectedMeds((p) => toggleItem(p, med))} />
                        <span className="flex-1">{med}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* ─── Footer ─── */}
        <div className="border-t px-4 py-3 sm:px-5 flex items-center justify-between gap-2 flex-shrink-0 bg-muted/20">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={onClose}>
            إغلاق
          </Button>
          <Button size="sm" className="selrs-gradient-btn text-white gap-2 text-xs sm:text-sm" onClick={() => toast.success('تم الحفظ', { description: 'تم حفظ الملف الطبي بنجاح' })}>
            <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
