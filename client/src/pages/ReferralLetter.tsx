import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Download, Printer } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { BRAND_NAME_AR, BRAND_NAME_EN } from "@/lib/brand";

const TODAY = new Date().toISOString().split("T")[0];
const REF_ID = `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

interface FormData {
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientId: string;
  nationality: string;
  contact: string;
  examDate: string;
  // refraction
  refractionOD: string;
  refractionOS: string;
  // VA uncorrected
  vaOD: string;
  vaOS: string;
  // VA best corrected
  vaBestOD: string;
  vaBestOS: string;
  // IOP
  iopOD: string;
  iopOS: string;
  slitLamp: string;
  fundus: string;
  diagnosisTags: string;
  reasonForReferral: string;
  referredPhysician: string;
  referredPhysicianTitle: string;
  referredFacility: string;
  referredDept: string;
  physicianName: string;
  physicianTitle: string;
  physicianLicense: string;
}

const initialForm: FormData = {
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientId: "",
  nationality: "",
  contact: "",
  examDate: TODAY,
  refractionOD: "",
  refractionOS: "",
  vaOD: "",
  vaOS: "",
  vaBestOD: "",
  vaBestOS: "",
  iopOD: "",
  iopOS: "",
  slitLamp: "",
  fundus: "",
  diagnosisTags: "",
  reasonForReferral: "",
  referredPhysician: "",
  referredPhysicianTitle: "",
  referredFacility: "",
  referredDept: "",
  physicianName: "",
  physicianTitle: "استشاري طب وجراحة العيون",
  physicianLicense: "",
};

// Shared input style: invisible chrome, prints clean
const FIELD =
  "h-auto border-none shadow-none bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-300 disabled:opacity-100 disabled:cursor-default";

export default function ReferralLetter() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormData>(initialForm);

  const set =
    (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const handlePrint = () => window.print();
  const handleDownloadPDF = () => window.print();

  const iopODNum = Number(form.iopOD);
  const iopOSNum = Number(form.iopOS);

  const renderBody = (readOnly = false) => (
    <fieldset
      disabled={readOnly}
      className="border-0 p-0 m-0 min-w-0 disabled:opacity-95 referral-print-root"
    >
      {/* A4 document */}
      <article
        className="a4-canvas print-container flex flex-col border border-border/70 bg-card w-[210mm] min-h-[297mm] mx-auto shadow-2xl shadow-primary/5 rounded-2xl print:rounded-none text-foreground overflow-hidden"
        dir="rtl"
      >
        {/* Letterhead */}
        <header className="flex justify-between items-start bg-primary text-white px-[15mm] py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-card/15 rounded-lg flex items-center justify-center">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M3 12c0-3 3-6 9-6s9 3 9 6-3 6-9 6-9-3-9-6z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">{BRAND_NAME_AR}</h1>
              <p className="text-[11px] font-bold tracking-widest uppercase opacity-80">
                {BRAND_NAME_EN} — Ophthalmic ERP
              </p>
            </div>
          </div>
          <div className="text-left" dir="ltr">
            <h2 className="text-lg font-bold uppercase tracking-wider">Medical Referral</h2>
            <p className="text-xs font-mono opacity-80">REF: {REF_ID}</p>
            <div className="flex items-center gap-1 justify-end mt-1">
              <span className="text-xs opacity-80">DATE:</span>
              <DateInput
                className={`${FIELD} h-5 w-28 text-xs font-mono text-white`}
                value={form.examDate}
                onChange={set("examDate")}
              />
            </div>
          </div>
        </header>

        <div className="px-[15mm] py-8 space-y-8 flex-1 flex flex-col">
          {/* Patient Info */}
          <section>
            <div className="grid grid-cols-3 gap-4 bg-muted/40 p-4 rounded-lg border border-border/70">
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Full Name / الاسم الكامل
                </label>
                <Input className={`${FIELD} text-base font-bold`} value={form.patientName} onChange={set("patientName")} placeholder="اسم المريض" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Patient ID / رقم المريض
                </label>
                <Input className={`${FIELD} text-base font-mono`} value={form.patientId} onChange={set("patientId")} placeholder="P-0000000" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Age &amp; Gender / العمر والجنس
                </label>
                <div className="flex gap-2">
                  <Input className={`${FIELD} text-base w-16`} value={form.patientAge} onChange={set("patientAge")} placeholder="45" />
                  <Input className={`${FIELD} text-base`} value={form.patientGender} onChange={set("patientGender")} placeholder="ذكر" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Nationality / الجنسية
                </label>
                <Input className={`${FIELD} text-base`} value={form.nationality} onChange={set("nationality")} placeholder="—" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Contact / التواصل
                </label>
                <Input className={`${FIELD} text-base`} dir="ltr" value={form.contact} onChange={set("contact")} placeholder="+20 ..." />
              </div>
            </div>
          </section>

          {/* Clinical Findings table */}
          <section>
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">
              Clinical Findings
            </h3>
            <div className="border border-border/70 rounded-lg overflow-hidden" dir="ltr">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 text-left">
                    <th className="py-2 px-3 border-b border-border/70 w-24">Eye</th>
                    <th className="py-2 px-3 border-b border-border/70">Refraction (S/C/A)</th>
                    <th className="py-2 px-3 border-b border-border/70">VA (Uncorrected)</th>
                    <th className="py-2 px-3 border-b border-border/70">VA (Best Corrected)</th>
                    <th className="py-2 px-3 border-b border-border/70">IOP (mmHg)</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="bg-primary/5">
                    <td className="py-2 px-3 border-b border-border/70 font-bold text-primary font-sans">OD (Right)</td>
                    <td className="py-1 px-2 border-b border-border/70"><Input className={`${FIELD} text-sm`} value={form.refractionOD} onChange={set("refractionOD")} placeholder="-0.00 / -0.00 x 000" /></td>
                    <td className="py-1 px-2 border-b border-border/70"><Input className={`${FIELD} text-sm`} value={form.vaOD} onChange={set("vaOD")} placeholder="6/12" /></td>
                    <td className="py-1 px-2 border-b border-border/70"><Input className={`${FIELD} text-sm`} value={form.vaBestOD} onChange={set("vaBestOD")} placeholder="6/6" /></td>
                    <td className="py-1 px-2 border-b border-border/70"><Input className={`${FIELD} text-sm font-bold ${iopODNum > 21 ? "text-destructive" : ""}`} value={form.iopOD} onChange={set("iopOD")} placeholder="18.0" /></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-slate-500 dark:text-slate-400 font-sans">OS (Left)</td>
                    <td className="py-1 px-2"><Input className={`${FIELD} text-sm`} value={form.refractionOS} onChange={set("refractionOS")} placeholder="-0.00 / -0.00 x 000" /></td>
                    <td className="py-1 px-2"><Input className={`${FIELD} text-sm`} value={form.vaOS} onChange={set("vaOS")} placeholder="6/9" /></td>
                    <td className="py-1 px-2"><Input className={`${FIELD} text-sm`} value={form.vaBestOS} onChange={set("vaBestOS")} placeholder="6/6" /></td>
                    <td className="py-1 px-2"><Input className={`${FIELD} text-sm font-bold ${iopOSNum > 21 ? "text-destructive" : ""}`} value={form.iopOS} onChange={set("iopOS")} placeholder="18.0" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Slit lamp + fundus */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-background rounded-lg border border-border/70">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Slit Lamp
                </p>
                <Textarea className={`${FIELD} text-[13px] w-full resize-none min-h-[56px]`} rows={3} value={form.slitLamp} onChange={set("slitLamp")} placeholder="OD: ... OS: ..." />
              </div>
              <div className="p-3 bg-background rounded-lg border border-border/70">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Fundus
                </p>
                <Textarea className={`${FIELD} text-[13px] w-full resize-none min-h-[56px]`} rows={3} value={form.fundus} onChange={set("fundus")} placeholder="OD: ... OS: ..." />
              </div>
            </div>
          </section>

          {/* Diagnosis + Reason */}
          <div className="grid grid-cols-2 gap-8">
            <section>
              <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">
                Diagnosis
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.diagnosisTags.split(",").filter((t) => t.trim()).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    {tag.trim()}
                  </span>
                ))}
              </div>
              <Input
                className={`${FIELD} text-[11px] print:hidden border-b border-dotted border-border/70 w-full`}
                value={form.diagnosisTags}
                onChange={set("diagnosisTags")}
                placeholder="افصل التشخيصات بفاصلة: جلوكوما, قصر نظر"
              />
            </section>
            <section>
              <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">
                Reason for Referral
              </h3>
              <Textarea
                className={`${FIELD} text-[13px] italic bg-muted/40 p-3 rounded-lg w-full resize-none min-h-[70px]`}
                rows={3}
                value={form.reasonForReferral}
                onChange={set("reasonForReferral")}
                placeholder="سبب التحويل والإجراء المطلوب..."
              />
            </section>
          </div>

          {/* Referred To */}
          <section className="bg-primary/5 p-4 rounded-xl border border-primary/20">
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">
              Referred To
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-600 dark:text-slate-400 uppercase block">Physician Name</label>
                <Input className={`${FIELD} text-base font-bold`} value={form.referredPhysician} onChange={set("referredPhysician")} placeholder="د. ..." />
                <Input className={`${FIELD} text-[12px] text-slate-500 dark:text-slate-400`} value={form.referredPhysicianTitle} onChange={set("referredPhysicianTitle")} placeholder="استشاري ..." />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 dark:text-slate-400 uppercase block">Facility</label>
                <Input className={`${FIELD} text-base font-bold`} value={form.referredFacility} onChange={set("referredFacility")} placeholder="المستشفى / المركز" />
                <Input className={`${FIELD} text-[12px] text-slate-500 dark:text-slate-400`} value={form.referredDept} onChange={set("referredDept")} placeholder="القسم" />
              </div>
            </div>
          </section>

          {/* Signature footer */}
          <footer className="mt-auto flex justify-between items-end border-t border-border/70 pt-6">
            <div className="text-[13px] space-y-0.5">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Referring Clinician / الطبيب المحوِّل</p>
              <Input className={`${FIELD} text-base font-bold`} value={form.physicianName} onChange={set("physicianName")} placeholder="د. ..." />
              <Input className={`${FIELD} text-[13px]`} value={form.physicianTitle} onChange={set("physicianTitle")} placeholder="استشاري طب وجراحة العيون" />
              <div className="flex items-center gap-1 text-muted-foreground/80" dir="ltr">
                <span className="text-[11px]">License:</span>
                <Input className={`${FIELD} text-[11px] w-32`} value={form.physicianLicense} onChange={set("physicianLicense")} placeholder="MOH-EYE-0000" />
              </div>
            </div>
            <div className="text-center">
              <div className="w-48 h-16 border-b-2 border-foreground/80" />
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mt-1">Signature &amp; Stamp / التوقيع والختم</p>
            </div>
          </footer>

          <div className="text-center border-t border-border/40 pt-3 opacity-50">
            <p className="text-[8px] font-mono uppercase tracking-widest">
              {BRAND_NAME_EN} © {new Date().getFullYear()} — Confidential Medical Record
            </p>
          </div>
        </div>
      </article>
    </fieldset>
  );

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap');

        .referral-print-root {
          font-family: 'Noto Sans Arabic', 'Inter', sans-serif;
        }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          .print-container {
              box-shadow: none !important; background-color: var(--card) !important;
              margin: 0 !important;
              width: 100% !important;
              min-height: 297mm !important;
              border: none !important;
          }
        }
      `}</style>

      <header className="sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-background border-b border-border/70" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex items-center gap-4">
          <button type="button" className="text-slate-600 dark:text-slate-400 hover:text-primary text-sm font-bold flex items-center gap-1" onClick={() => setLocation(-1 as any)}>
            <ArrowRight className="h-4 w-4" /> رجوع
          </button>
          <span className="text-base font-bold text-primary">خطاب إحالة / Referral Letter</span>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" className="border-primary text-primary font-bold hover:bg-primary/10 gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> طباعة
          </Button>
          <Button size="sm" className="bg-primary hover:opacity-90 text-white font-bold gap-1.5" onClick={handleDownloadPDF}>
            <Download className="h-3.5 w-3.5" /> Print PDF
          </Button>
        </div>
      </header>

      <main className="print:p-0 px-4 py-8">
        <div className="print:hidden">{renderBody()}</div>
        <div className="hidden print:block">{renderBody(true)}</div>
      </main>
    </div>
  );
}
