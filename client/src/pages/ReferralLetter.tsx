import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Download, Printer } from "lucide-react";
import { BRAND_NAME_AR, BRAND_NAME_EN } from "@/lib/brand";

const TODAY = new Date().toISOString().split("T")[0];
const REF_ID = `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

interface FormData {
  patientName: string;
  patientAge: string;
  patientId: string;
  examDate: string;
  vaOD: string;
  vaOS: string;
  iopOD: string;
  iopOS: string;
  refractionOD: string;
  refractionOS: string;
  medicalHistory: string;
  diagnosis: string;
  diagnosisTags: string;
  referredTo: string;
  reasonForReferral: string;
  physicianName: string;
  physicianTitle: string;
}

const initialForm: FormData = {
  patientName: "",
  patientAge: "",
  patientId: "",
  examDate: TODAY,
  vaOD: "",
  vaOS: "",
  iopOD: "",
  iopOS: "",
  refractionOD: "",
  refractionOS: "",
  medicalHistory: "",
  diagnosis: "",
  diagnosisTags: "",
  referredTo: "",
  reasonForReferral: "",
  physicianName: "",
  physicianTitle: "استشاري طب وجراحة العيون",
};

export default function ReferralLetter() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormData>(initialForm);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handlePrint = () => window.print();
  const handleDownloadPDF = () => window.print();

  const iopODNum = Number(form.iopOD);
  const iopOSNum = Number(form.iopOS);

  const renderBody = (readOnly = false) => (
    <fieldset disabled={readOnly} className="border-0 p-0 m-0 min-w-0 disabled:opacity-95 referral-print-root">
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-10 md:p-12 shadow-sm border border-gray-200 flex flex-col mx-auto" dir="rtl">
        {/* Clinic Branding Header */}
        <header className="flex justify-between items-start border-b-2 border-[#003d9b] pb-3 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#003d9b]/10 rounded-lg flex items-center justify-center">
              <svg className="w-10 h-10 text-[#003d9b]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M3 12c0-3 3-6 9-6s9 3 9 6-3 6-9 6-9-3-9-6z" />
              </svg>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-[#003d9b]">{BRAND_NAME_AR}</h1>
              <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">{BRAND_NAME_EN} SPECIALIZED CLINIC</p>
              <p className="text-xs text-gray-500 mt-1">الرياض، المملكة العربية السعودية | هاتف: ٩٢٠٠١٢٣٤٥</p>
            </div>
          </div>
          <div className="text-left" dir="ltr">
            <h2 className="text-lg font-bold text-[#003d9b] uppercase">Referral Letter</h2>
            <p className="text-xs text-gray-500 font-mono">Ref: {REF_ID}</p>
            <p className="text-xs text-gray-500 font-mono">Date: {form.examDate || TODAY}</p>
          </div>
        </header>

        {/* Patient Information Section */}
        <section className="mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-xs font-bold text-[#003d9b] border-b border-gray-200 pb-1 mb-3">معلومات المريض / Patient Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500 block mb-1">الاسم / Name</span>
                <Input className="h-8 text-sm border-gray-300 font-semibold" value={form.patientName} onChange={set("patientName")} placeholder="أحمد محمود..." />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">العمر / Age</span>
                <Input className="h-8 text-sm border-gray-300 font-semibold" value={form.patientAge} onChange={set("patientAge")} placeholder="٤٥ سنة" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">رقم الهوية / ID</span>
                <Input className="h-8 text-sm border-gray-300 font-semibold" value={form.patientId} onChange={set("patientId")} placeholder="١٠٩٨٧..." />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">تاريخ الفحص / Date</span>
                <Input className="h-8 text-sm border-gray-300 font-semibold" type="date" value={form.examDate} onChange={set("examDate")} />
              </div>
            </div>
          </div>
        </section>

        {/* Clinical Summary */}
        <section className="mb-6 space-y-6">
          {/* Current Findings Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-700">النتائج السريرية الحالية / Current Findings</h3>
            </div>
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-bold border-b border-gray-200">
                  <th className="p-3 border-l border-gray-200">المعطيات / Parameter</th>
                  <th className="p-3 border-l border-gray-200 bg-[#003d9b]/5 text-center">العين اليمنى (OD)</th>
                  <th className="p-3 text-center">العين اليسرى (OS)</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm text-gray-800">
                <tr className="border-b border-gray-200">
                  <td className="p-3 border-l border-gray-200 font-sans">حدة الإبصار (Visual Acuity)</td>
                  <td className="p-2 border-l border-gray-200 bg-[#003d9b]/5 text-center">
                    <Input className="h-8 text-sm text-center border-gray-300 w-24 mx-auto" value={form.vaOD} onChange={set("vaOD")} placeholder="6/12" />
                  </td>
                  <td className="p-2 text-center">
                    <Input className="h-8 text-sm text-center border-gray-300 w-24 mx-auto" value={form.vaOS} onChange={set("vaOS")} placeholder="6/9" />
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 border-l border-gray-200 font-sans">ضغط العين (IOP)</td>
                  <td className="p-2 border-l border-gray-200 bg-[#003d9b]/5 text-center">
                    <Input className={`h-8 text-sm text-center border-gray-300 w-24 mx-auto ${iopODNum > 21 ? "text-red-600 font-bold border-red-300" : ""}`} value={form.iopOD} onChange={set("iopOD")} placeholder="mmHg" />
                  </td>
                  <td className="p-2 text-center">
                    <Input className={`h-8 text-sm text-center border-gray-300 w-24 mx-auto ${iopOSNum > 21 ? "text-red-600 font-bold border-red-300" : ""}`} value={form.iopOS} onChange={set("iopOS")} placeholder="mmHg" />
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 border-l border-gray-200 font-sans">الانكسار (Refraction)</td>
                  <td className="p-2 border-l border-gray-200 bg-[#003d9b]/5 text-center">
                    <Input className="h-8 text-sm text-center border-gray-300 w-36 mx-auto" value={form.refractionOD} onChange={set("refractionOD")} placeholder="-2.50 / -0.75 x 180" />
                  </td>
                  <td className="p-2 text-center">
                    <Input className="h-8 text-sm text-center border-gray-300 w-36 mx-auto" value={form.refractionOS} onChange={set("refractionOS")} placeholder="-2.00 / -0.50 x 175" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Diagnosis & Medical History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-xs font-bold text-[#003d9b] uppercase tracking-wider mb-2">التشخيص الحالي / Diagnosis</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.diagnosisTags.split(",").filter(Boolean).map((tag) => (
                  <span key={tag} className="bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">{tag.trim()}</span>
                ))}
              </div>
              <Input
                className="h-7 text-xs border-gray-300 mb-2"
                value={form.diagnosisTags}
                onChange={set("diagnosisTags")}
                placeholder="Tags: Primary Open-Angle Glaucoma, Myopia"
              />
              <Textarea
                className="text-sm border-gray-300 w-full resize-none"
                rows={3}
                value={form.diagnosis}
                onChange={set("diagnosis")}
                placeholder="Detailed clinical diagnosis..."
              />
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-xs font-bold text-[#003d9b] uppercase tracking-wider mb-2">التاريخ الطبي / Medical History</h4>
              <Textarea
                className="text-sm border-gray-300 w-full resize-none"
                rows={5}
                value={form.medicalHistory}
                onChange={set("medicalHistory")}
                placeholder="Diabetes Mellitus Type II (Controlled)&#10;Family History of Glaucoma (Father)&#10;No known allergies."
                dir="ltr"
              />
            </div>
          </div>
        </section>

        {/* Reason for Referral */}
        <section className="mb-8">
          <div className="bg-[#003d9b]/5 border-2 border-dashed border-[#003d9b]/30 p-5 rounded-xl">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-grow">
                <h3 className="text-base font-bold text-[#003d9b] mb-2 flex items-center gap-2">
                  <span>📨</span>
                  سبب التحويل / Reason for Referral
                </h3>
                <Textarea
                  className="text-sm border-gray-300 w-full resize-none bg-white"
                  rows={3}
                  value={form.reasonForReferral}
                  onChange={set("reasonForReferral")}
                  placeholder="Requesting Visual Field (HFA) and OCT - Optic Nerve Head for glaucoma workup and management plan..."
                  dir="ltr"
                />
              </div>
              <div className="md:w-1/3 border-r border-gray-200 pr-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">محول إلى / Referred To</span>
                <Textarea
                  className="text-sm border-gray-300 w-full resize-none bg-white"
                  rows={2}
                  value={form.referredTo}
                  onChange={set("referredTo")}
                  placeholder="استشاري الجلوكوما&#10;مستشفى العيون التخصصي"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer: Signatures & Stamp */}
        <footer className="mt-auto pt-6 border-t border-gray-200 flex justify-between items-end">
          <div className="text-right space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">الطبيب المحول / Referring Physician</p>
            <Input
              className="h-8 text-sm text-right border-gray-300 w-48 font-bold text-[#003d9b]"
              value={form.physicianName}
              onChange={set("physicianName")}
              placeholder="د. اسم الطبيب"
            />
            <div className="h-16 w-48 border-b border-gray-400 mb-2 italic font-serif flex items-end justify-center text-gray-400">
              {form.physicianName || "Adrian Miller, M.D."}
            </div>
            <Input
              className="h-8 text-xs text-right border-gray-300 w-48"
              value={form.physicianTitle}
              onChange={set("physicianTitle")}
              placeholder="استشاري طب وجراحة العيون"
            />
          </div>
          <div className="relative w-32 h-32 flex items-center justify-center border-2 border-[#003d9b]/20 rounded-full rotate-12 bg-white shrink-0">
            <div className="absolute inset-2 border border-[#003d9b]/40 rounded-full flex flex-col items-center justify-center text-center p-2">
              <span className="text-[10px] font-bold text-[#003d9b]/60 uppercase leading-none">Official</span>
              <span className="text-[10px] font-bold text-[#003d9b]/60 uppercase leading-none">Medical Stamp</span>
              <span className="text-[8px] text-[#003d9b]/50 mt-1">{BRAND_NAME_EN}</span>
              <span className="text-[16px] mt-1 text-[#003d9b]/40">🛡️</span>
            </div>
          </div>
        </footer>

        {/* HIPAA Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-[10px] text-gray-400 mb-2">
            © {new Date().getFullYear()} {BRAND_NAME_EN}. This document contains protected health information (PHI) and is intended for medical professional use only.
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
            <span className="font-semibold">HIPAA Compliance</span>
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
    </fieldset>
  );

  return (
    <div className="min-h-screen bg-[#dde1e7]" dir="rtl">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body > *:not(.referral-print-root) { display: none !important; }
          .referral-print-root { display: block !important; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>

      <header className="sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-[#f8f9fb] border-b border-[#c3c6d6]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex items-center gap-4">
          <button type="button" className="text-[#434654] hover:text-[#003D9B] text-sm font-bold flex items-center gap-1" onClick={() => setLocation(-1 as any)}>
            <ArrowRight className="h-4 w-4" /> رجوع
          </button>
          <span className="text-base font-bold text-[#003D9B]">خطاب إحالة / Referral Letter</span>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" className="border-[#003D9B] text-[#003D9B] font-bold hover:bg-[#003D9B]/5 gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> طباعة
          </Button>
          <Button size="sm" className="bg-[#003D9B] hover:opacity-90 text-white font-bold gap-1.5" onClick={handleDownloadPDF}>
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
