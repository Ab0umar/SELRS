import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  FlaskConical,
  HeartPulse,
  Microscope,
  RotateCcw,
  ScanLine,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

type Role = "reception" | "nursing" | "specialist" | "consultant";
type EyeSide = "od" | "os";

type VisitData = {
  patientName: string;
  patientCode: string;
  age: string;
  phone: string;
  service: string;
  consultant: string;
  complaint: string;
  bloodPressure: string;
  pulse: string;
  diabetes: boolean;
  hypertension: boolean;
  allergy: string;
  measurements: Record<EyeSide, { iop: string; ucva: string; bcva: string }>;
  refraction: Record<EyeSide, { sphere: string; cylinder: string; axis: string }>;
  fundus: Record<EyeSide, string>;
  fundusNormal: Record<EyeSide, boolean>;
  pentacamRequested: boolean;
  pentacam: Record<EyeSide, { k1: string; k2: string; axis: string; thinnest: string }>;
  diagnosis: string;
  imagingRequests: string[];
  labRequests: string[];
  treatment: string;
  followup: string;
};

const ROLE_META: Record<Role, { label: string; short: string; icon: typeof UserRound; tone: string }> = {
  reception: {
    label: "الاستقبال",
    short: "بيانات الزيارة",
    icon: UserRound,
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
  nursing: {
    label: "التمريض",
    short: "القياسات والبنتاكام",
    icon: HeartPulse,
    tone: "bg-amber-50 text-amber-800 border-amber-200",
  },
  specialist: {
    label: "الطبيب الأخصائي",
    short: "الفحص والمقاس",
    icon: Eye,
    tone: "bg-blue-50 text-blue-800 border-blue-200",
  },
  consultant: {
    label: "الطبيب الاستشاري",
    short: "القرار النهائي",
    icon: Stethoscope,
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
};

const ROLES = Object.keys(ROLE_META) as Role[];
const IMAGING_OPTIONS = ["OCT", "Pentacam", "Visual Field", "B-Scan", "FFA"];
const LAB_OPTIONS = ["CBC", "FBS / HbA1c", "PT / PTT / INR", "Kidney Function", "Thyroid Profile"];

const createVisit = (): VisitData => ({
  patientName: "سارة محمد علي",
  patientCode: "P-18352",
  age: "27",
  phone: "01012345678",
  service: "كشف استشاري",
  consultant: "د. أحمد الصواف",
  complaint: "زغللة بالمسافات مع صداع متكرر",
  bloodPressure: "125/80",
  pulse: "78",
  diabetes: false,
  hypertension: false,
  allergy: "لا توجد حساسية مسجلة",
  measurements: {
    od: { iop: "15", ucva: "6/18", bcva: "6/6" },
    os: { iop: "16", ucva: "6/12", bcva: "6/6" },
  },
  refraction: {
    od: { sphere: "-2.25", cylinder: "-0.50", axis: "170" },
    os: { sphere: "-2.00", cylinder: "-0.75", axis: "10" },
  },
  fundus: { od: "", os: "" },
  fundusNormal: { od: false, os: false },
  pentacamRequested: true,
  pentacam: {
    od: { k1: "43.1", k2: "44.0", axis: "92", thinnest: "512" },
    os: { k1: "43.3", k2: "44.2", axis: "88", thinnest: "508" },
  },
  diagnosis: "",
  imagingRequests: ["OCT"],
  labRequests: [],
  treatment: "",
  followup: "بعد أسبوعين",
});

function SectionHeader({
  number,
  title,
  owner,
  icon: Icon,
  complete,
  note,
}: {
  number: number;
  title: string;
  owner: Role;
  icon: typeof UserRound;
  complete: boolean;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/45 px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </span>
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">{title}</h2>
        {note ? <span className="hidden text-[11px] text-muted-foreground sm:inline">{note}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("rounded px-2 py-0.5 text-[10px]", ROLE_META[owner].tone)}>
          {ROLE_META[owner].label}
        </Badge>
        {complete ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            مكتمل
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-amber-700">قيد الاستكمال</span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        dir={dir}
        className="h-9 rounded border-border bg-background text-sm disabled:cursor-default disabled:opacity-100"
      />
    </label>
  );
}

function EyeTable({
  title,
  data,
  fields,
  onChange,
  disabled,
}: {
  title: string;
  data: Record<EyeSide, Record<string, string>>;
  fields: { key: string; label: string }[];
  onChange: (eye: EyeSide, key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="overflow-hidden rounded border border-border" dir="ltr">
      <div className="border-b border-border bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-700">{title}</div>
      <div className="grid" style={{ gridTemplateColumns: `76px repeat(${fields.length}, minmax(74px, 1fr))` }}>
        <div className="border-b border-r border-border bg-muted/50 p-2 text-center text-[10px] font-bold">EYE</div>
        {fields.map((field) => (
          <div key={field.key} className="border-b border-r border-border bg-muted/50 p-2 text-center text-[10px] font-bold last:border-r-0">
            {field.label}
          </div>
        ))}
        {(["od", "os"] as EyeSide[]).map((eye) => (
          <div key={eye} className="contents">
            <div className={cn("border-r border-t border-border p-2 text-center text-xs font-bold", eye === "od" ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-700")}>
              {eye.toUpperCase()}
            </div>
            {fields.map((field) => (
              <div key={`${eye}-${field.key}`} className="border-r border-t border-border p-1 last:border-r-0">
                <input
                  value={data[eye][field.key] ?? ""}
                  onChange={(event) => onChange(eye, field.key, event.target.value)}
                  disabled={disabled}
                  className="h-8 w-full min-w-0 bg-transparent px-1 text-center font-mono text-xs outline-none disabled:opacity-100"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function OptionChecklist({
  options,
  selected,
  onToggle,
  disabled,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {options.map((option) => (
        <label key={option} className="flex min-h-8 items-center gap-2 text-xs font-medium">
          <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} disabled={disabled} />
          <span dir="ltr">{option}</span>
        </label>
      ))}
    </div>
  );
}

export default function WorkflowPrototype() {
  const [, setLocation] = useLocation();
  const [activeRole, setActiveRole] = useState<Role>("nursing");
  const [visit, setVisit] = useState<VisitData>(createVisit);

  const canEdit = (roles: Role[]) => roles.includes(activeRole);
  const update = <K extends keyof VisitData>(key: K, value: VisitData[K]) => {
    setVisit((current) => ({ ...current, [key]: value }));
  };

  const updateEye = <K extends "measurements" | "refraction" | "pentacam">(
    section: K,
    eye: EyeSide,
    key: string,
    value: string,
  ) => {
    setVisit((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [eye]: { ...current[section][eye], [key]: value },
      },
    }));
  };

  const toggleRequest = (key: "imagingRequests" | "labRequests", option: string) => {
    setVisit((current) => {
      const selected = current[key];
      return {
        ...current,
        [key]: selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option],
      };
    });
  };

  const sectionState = useMemo(
    () => ({
      reception: Boolean(visit.patientName && visit.patientCode && visit.service),
      nursing: Boolean(visit.measurements.od.iop && visit.measurements.os.iop && visit.measurements.od.ucva && visit.measurements.os.ucva),
      specialist: Boolean((visit.fundusNormal.od || visit.fundus.od) && (visit.fundusNormal.os || visit.fundus.os)),
      pentacam: !visit.pentacamRequested || Boolean(visit.pentacam.od.k1 && visit.pentacam.os.k1 && visit.pentacam.od.thinnest && visit.pentacam.os.thinnest),
      consultant: Boolean(visit.diagnosis && visit.treatment),
    }),
    [visit],
  );

  const completedCount = Object.values(sectionState).filter(Boolean).length;
  const moveToNextRole = () => {
    const index = ROLES.indexOf(activeRole);
    if (index < ROLES.length - 1) setActiveRole(ROLES[index + 1]);
  };

  return (
    <div className="min-h-screen bg-slate-100/70" dir="rtl">
      <div className="mx-auto max-w-[1480px] px-3 py-4 sm:px-5 lg:px-6">
        <PageHeader
          title="شيت الزيارة الرقمي"
          description="نموذج تجريبي · نفس الشيت يُستكمل من الاستقبال حتى الاستشاري"
          icon={<ClipboardCheck />}
          actions={
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="outline" size="sm" onClick={() => setVisit(createVisit())} title="إعادة ضبط النموذج">
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">إعادة ضبط</span>
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLocation("/workflow-hub")}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">مركز سير العمل</span>
              </Button>
            </div>
          }
          className="mb-4"
        />

        <div className="sticky top-0 z-20 mb-4 border border-border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <strong className="text-sm">{visit.patientName}</strong>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">{visit.patientCode}</span>
                  <Badge variant="outline" className="rounded text-[10px]">زيارة اليوم · 09:12</Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{visit.service} · {visit.consultant}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">اكتمال الشيت</span>
              <div className="h-2 w-28 overflow-hidden rounded bg-muted">
                <div className="h-full bg-emerald-600" style={{ width: `${(completedCount / 5) * 100}%` }} />
              </div>
              <strong className="tabular-nums">{completedCount}/5</strong>
            </div>
          </div>

          <div className="flex overflow-x-auto [scrollbar-width:none]">
            {ROLES.map((role, index) => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              const active = role === activeRole;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRole(role)}
                  className={cn(
                    "flex min-w-[180px] flex-1 items-center gap-2 border-l border-border px-3 py-2.5 text-right last:border-l-0",
                    active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50",
                  )}
                >
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded", active ? "bg-white/15" : "bg-muted")}>
                    {index < ROLES.indexOf(activeRole) ? <Check className="h-4 w-4 text-emerald-500" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span>
                    <span className="block text-xs font-bold">{meta.label}</span>
                    <span className={cn("mt-0.5 block text-[10px]", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{meta.short}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <section className="overflow-hidden border border-border bg-background">
            <SectionHeader number={1} title="بيانات المريض والزيارة" owner="reception" icon={UserRound} complete={sectionState.reception} />
            <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-6 lg:p-4">
              <div className="lg:col-span-2"><Field label="اسم المريض" value={visit.patientName} onChange={(value) => update("patientName", value)} disabled={!canEdit(["reception"])} /></div>
              <Field label="كود المريض" value={visit.patientCode} onChange={(value) => update("patientCode", value)} disabled={!canEdit(["reception"])} dir="ltr" />
              <Field label="السن" value={visit.age} onChange={(value) => update("age", value)} disabled={!canEdit(["reception"])} />
              <Field label="رقم الهاتف" value={visit.phone} onChange={(value) => update("phone", value)} disabled={!canEdit(["reception"])} dir="ltr" />
              <Field label="نوع الزيارة" value={visit.service} onChange={(value) => update("service", value)} disabled={!canEdit(["reception"])} />
              <div className="sm:col-span-2 lg:col-span-3"><Field label="الاستشاري" value={visit.consultant} onChange={(value) => update("consultant", value)} disabled={!canEdit(["reception"])} /></div>
              <div className="sm:col-span-2 lg:col-span-3"><Field label="الشكوى الرئيسية" value={visit.complaint} onChange={(value) => update("complaint", value)} disabled={!canEdit(["reception", "nursing", "specialist"])} /></div>
            </div>
          </section>

          <section className="overflow-hidden border border-border bg-background">
            <SectionHeader number={2} title="القياسات والتاريخ الطبي" owner="nursing" icon={Activity} complete={sectionState.nursing} note="تظهر مباشرة لباقي الفريق" />
            <div className="grid gap-4 p-3 lg:grid-cols-[1.5fr_1fr] lg:p-4">
              <div className="overflow-x-auto">
                <div className="min-w-[430px]">
                  <EyeTable
                    title="Visual Acuity & IOP"
                    data={visit.measurements}
                    fields={[{ key: "iop", label: "IOP" }, { key: "ucva", label: "UCVA" }, { key: "bcva", label: "BCVA" }]}
                    onChange={(eye, key, value) => updateEye("measurements", eye, key, value)}
                    disabled={!canEdit(["nursing"])}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="ضغط الدم" value={visit.bloodPressure} onChange={(value) => update("bloodPressure", value)} disabled={!canEdit(["nursing"])} dir="ltr" />
                <Field label="النبض" value={visit.pulse} onChange={(value) => update("pulse", value)} disabled={!canEdit(["nursing"])} dir="ltr" />
                <label className="flex min-h-9 items-center gap-2 text-xs font-semibold"><Checkbox checked={visit.diabetes} onCheckedChange={(value) => update("diabetes", value === true)} disabled={!canEdit(["nursing"])} />سكر</label>
                <label className="flex min-h-9 items-center gap-2 text-xs font-semibold"><Checkbox checked={visit.hypertension} onCheckedChange={(value) => update("hypertension", value === true)} disabled={!canEdit(["nursing"])} />ضغط</label>
                <div className="sm:col-span-2"><Field label="الحساسية والأدوية الحالية" value={visit.allergy} onChange={(value) => update("allergy", value)} disabled={!canEdit(["nursing"])} /></div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden border border-border bg-background">
            <SectionHeader number={3} title="فحص الأخصائي ومقاس النظارة" owner="specialist" icon={Eye} complete={sectionState.specialist} note="المقاس يمكن إدخاله بواسطة الأخصائي أو التمريض" />
            <div className="grid gap-4 p-3 lg:grid-cols-2 lg:p-4">
              <div className="overflow-x-auto">
                <div className="min-w-[430px]">
                  <EyeTable
                    title="Clinical Refraction"
                    data={visit.refraction}
                    fields={[{ key: "sphere", label: "SPH" }, { key: "cylinder", label: "CYL" }, { key: "axis", label: "AXIS" }]}
                    onChange={(eye, key, value) => updateEye("refraction", eye, key, value)}
                    disabled={!canEdit(["nursing", "specialist"])}
                  />
                </div>
              </div>
              <div className="overflow-hidden rounded border border-border">
                <div className="border-b border-border bg-slate-50 px-3 py-2 text-center text-xs font-bold">Fundus Examination</div>
                {(["od", "os"] as EyeSide[]).map((eye) => (
                  <div key={eye} className="grid grid-cols-[64px_110px_1fr] items-center gap-2 border-b border-border p-2 last:border-b-0">
                    <strong className={cn("text-center text-xs", eye === "od" ? "text-blue-800" : "text-slate-600")}>{eye.toUpperCase()}</strong>
                    <label className="flex items-center gap-2 text-xs"><Checkbox checked={visit.fundusNormal[eye]} onCheckedChange={(value) => update("fundusNormal", { ...visit.fundusNormal, [eye]: value === true })} disabled={!canEdit(["specialist"])} />Normal</label>
                    <Input value={visit.fundus[eye]} onChange={(event) => update("fundus", { ...visit.fundus, [eye]: event.target.value })} disabled={!canEdit(["specialist"])} placeholder="Abnormal findings" dir="ltr" className="h-9 rounded text-xs disabled:opacity-100" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden border border-border bg-background">
            <SectionHeader number={4} title="Pentacam" owner="nursing" icon={ScanLine} complete={sectionState.pentacam} note="يُستكمل فقط إذا طلبه الطبيب" />
            <div className="p-3 lg:p-4">
              <label className="mb-3 flex items-center gap-2 text-xs font-bold">
                <Checkbox checked={visit.pentacamRequested} onCheckedChange={(value) => update("pentacamRequested", value === true)} disabled={!canEdit(["specialist", "consultant"])} />
                مطلوب Pentacam لهذه الزيارة
              </label>
              {visit.pentacamRequested ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[540px]">
                    <EyeTable
                      title="Pentacam Measurements"
                      data={visit.pentacam}
                      fields={[{ key: "k1", label: "K1" }, { key: "k2", label: "K2" }, { key: "axis", label: "AXIS" }, { key: "thinnest", label: "THINNEST" }]}
                      onChange={(eye, key, value) => updateEye("pentacam", eye, key, value)}
                      disabled={!canEdit(["nursing"])}
                    />
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground">غير مطلوب في الزيارة الحالية.</p>}
            </div>
          </section>

          <section className="overflow-hidden border border-primary/25 bg-background">
            <SectionHeader number={5} title="قرار الاستشاري" owner="consultant" icon={Stethoscope} complete={sectionState.consultant} note="يظهر أمامه الشيت كاملًا للقراءة" />
            <div className="grid gap-5 p-3 lg:grid-cols-2 lg:p-4">
              <label className="lg:col-span-2">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-bold"><Microscope className="h-4 w-4 text-primary" />التشخيص النهائي</span>
                <Textarea value={visit.diagnosis} onChange={(event) => update("diagnosis", event.target.value)} disabled={!canEdit(["consultant"])} placeholder="اكتب التشخيص النهائي..." className="min-h-20 rounded disabled:opacity-100" />
              </label>
              <div className="border-t border-border pt-3">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold"><ScanLine className="h-4 w-4 text-primary" />الأشعات المطلوبة</h3>
                <OptionChecklist options={IMAGING_OPTIONS} selected={visit.imagingRequests} onToggle={(option) => toggleRequest("imagingRequests", option)} disabled={!canEdit(["consultant"])} />
              </div>
              <div className="border-t border-border pt-3">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold"><FlaskConical className="h-4 w-4 text-primary" />التحاليل المطلوبة</h3>
                <OptionChecklist options={LAB_OPTIONS} selected={visit.labRequests} onToggle={(option) => toggleRequest("labRequests", option)} disabled={!canEdit(["consultant"])} />
              </div>
              <label>
                <span className="mb-1.5 block text-xs font-bold">العلاج والخطة</span>
                <Textarea value={visit.treatment} onChange={(event) => update("treatment", event.target.value)} disabled={!canEdit(["consultant"])} placeholder="الأدوية، الجرعات، والتعليمات..." className="min-h-28 rounded disabled:opacity-100" />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold">المتابعة القادمة</span>
                <Textarea value={visit.followup} onChange={(event) => update("followup", event.target.value)} disabled={!canEdit(["consultant"])} className="min-h-28 rounded disabled:opacity-100" />
              </label>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-20 mt-4 flex flex-col gap-2 border border-border bg-background/95 p-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded border", ROLE_META[activeRole].tone)}>{(() => { const Icon = ROLE_META[activeRole].icon; return <Icon className="h-4 w-4" />; })()}</span>
            <span><strong>{ROLE_META[activeRole].label}</strong><span className="mr-2 text-muted-foreground">يعدّل الجزء المخصص له فقط</span></span>
          </div>
          {activeRole !== "consultant" ? (
            <Button type="button" onClick={moveToNextRole} className="min-h-10 sm:min-w-52">
              حفظ وإتاحة لـ {ROLE_META[ROLES[ROLES.indexOf(activeRole) + 1]].label}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" disabled={!sectionState.consultant} className="min-h-10 bg-emerald-700 hover:bg-emerald-800 sm:min-w-52">
              <CheckCircle2 className="h-4 w-4" />
              اعتماد وإغلاق الزيارة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
