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
      <div className="bg-white p-8 print:p-6 max-w-[780px] mx-auto shadow-sm border border-[#c3c6d6] rounded-lg" dir="ltr">
        {/* Brand Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-300">
          <div>
            <p className="text-xs text-[#003D9B] font-semibold uppercase tracking-wide">REFERRAL LETTER</p>
            <p className="text-[11px] text-[#526069] mt-0.5">Ref: {REF_ID}</p>
            <p className="text-[11px] text-[#526069]">Date: {form.examDate || TODAY}</p>
          </div>
          <div className="text-right flex items-start gap-3">
            <div>
              <h1 className="text-base font-bold text-[#003D9B]">{BRAND_NAME_AR}</h1>
              <p className="text-[11px] text-[#434654]">{BRAND_NAME_EN} SPECIALIZED CLINIC</p>
              <p className="text-[11px] text-[#526069] mt-0.5" dir="rtl">مركز متخصص لطب وجراحة العيون</p>
            </div>
            <div className="border border-[#c3c6d6] rounded-lg p-1.5 flex items-center justify-center shrink-0" style={{ width: 44, height: 44 }}>
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#003D9B]" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="mb-4 border border-[#c3c6d6] rounded-lg overflow-hidden">
          <div className="bg-[#f3f4f6] px-4 py-2 border-b border-[#c3c6d6]">
            <h2 className="text-[12px] font-semibold text-[#003D9B]">Patient Information / معلومات المريض</h2>
          </div>
          <div className="p-3 grid grid-cols-4 gap-3 text-[11px]">
            <div>
              <p className="text-[#526069] mb-0.5">Name / الاسم</p>
              <Input className="h-7 text-[11px] border-[#c3c6d6]" value={form.patientName} onChange={set("patientName")} placeholder="Patient name..." />
            </div>
            <div>
              <p className="text-[#526069] mb-0.5">Age / العمر</p>
              <Input className="h-7 text-[11px] border-[#c3c6d6]" value={form.patientAge} onChange={set("patientAge")} placeholder="45 سنة" />
            </div>
            <div>
              <p className="text-[#526069] mb-0.5">ID / رقم الهوية</p>
              <Input className="h-7 text-[11px] border-[#c3c6d6]" value={form.patientId} onChange={set("patientId")} placeholder="National ID..." />
            </div>
            <div>
              <p className="text-[#526069] mb-0.5">Date / تاريخ الفحص</p>
              <Input className="h-7 text-[11px] border-[#c3c6d6]" type="date" value={form.examDate} onChange={set("examDate")} />
            </div>
          </div>
        </div>

        {/* Current Findings */}
        <div className="mb-4 border border-[#c3c6d6] rounded-lg overflow-hidden">
          <div className="bg-[#f3f4f6] px-4 py-2 border-b border-[#c3c6d6]">
            <h2 className="text-[12px] font-semibold text-[#191c1e]">Current Findings / النتائج السريرية الحالية</h2>
          </div>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#c3c6d6] bg-[#f3f4f6]/50">
                <th className="text-right px-4 py-2 font-medium text-[#434654]">Parameter / المعلمات</th>
                <th className="text-center px-4 py-2 font-medium text-[#434654]">العين اليمنى (OD)</th>
                <th className="text-center px-4 py-2 font-medium text-[#434654]">العين اليسرى (OS)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2 text-right text-[#434654]">حدة الإبصار (Visual Acuity)</td>
                <td className="px-2 py-1 text-center"><Input className="h-6 text-[11px] text-center border-[#c3c6d6] w-24 mx-auto" value={form.vaOD} onChange={set("vaOD")} placeholder="6/12" /></td>
                <td className="px-2 py-1 text-center"><Input className="h-6 text-[11px] text-center border-[#c3c6d6] w-24 mx-auto" value={form.vaOS} onChange={set("vaOS")} placeholder="6/9" /></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2 text-right text-[#434654]">ضغط العين (IOP)</td>
                <td className="px-2 py-1 text-center">
                  <Input className={`h-6 text-[11px] text-center border-[#c3c6d6] w-24 mx-auto ${iopODNum > 21 ? "text-red-600 font-bold border-red-300" : ""}`} value={form.iopOD} onChange={set("iopOD")} placeholder="mmHg" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Input className={`h-6 text-[11px] text-center border-[#c3c6d6] w-24 mx-auto ${iopOSNum > 21 ? "text-red-600 font-bold border-red-300" : ""}`} value={form.iopOS} onChange={set("iopOS")} placeholder="mmHg" />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-right text-[#434654]">الانكسار (Refraction)</td>
                <td className="px-2 py-1 text-center"><Input className="h-6 text-[11px] text-center border-[#c3c6d6] w-32 mx-auto" value={form.refractionOD} onChange={set("refractionOD")} placeholder="-2.50 / -0.75 × 180" /></td>
                <td className="px-2 py-1 text-center"><Input className="h-6 text-[11px] text-center border-[#c3c6d6] w-32 mx-auto" value={form.refractionOS} onChange={set("refractionOS")} placeholder="-2.00 / -0.50 × 175" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Medical History + Diagnosis */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="border border-[#c3c6d6] rounded-lg overflow-hidden">
            <div className="bg-[#f3f4f6] px-4 py-2 border-b border-[#c3c6d6]">
              <h2 className="text-[12px] font-semibold text-[#003D9B]">Medical History / التاريخ الطبي</h2>
            </div>
            <div className="p-3">
              <Textarea
                className="text-[11px] resize-none border-[#c3c6d6] w-full"
                rows={5}
                value={form.medicalHistory}
                onChange={set("medicalHistory")}
                placeholder="Diabetes Mellitus Type II (Controlled)&#10;Family History of Glaucoma (Father)&#10;No known allergies."
                dir="ltr"
              />
            </div>
          </div>
          <div className="border border-[#c3c6d6] rounded-lg overflow-hidden">
            <div className="bg-[#f3f4f6] px-4 py-2 border-b border-[#c3c6d6]">
              <h2 className="text-[12px] font-semibold text-[#003D9B]">Diagnosis / التشخيص الحالي</h2>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {form.diagnosisTags.split(",").filter(Boolean).map((tag) => (
                  <span key={tag} className="bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">{tag.trim()}</span>
                ))}
              </div>
              <Input
                className="h-6 text-[10px] border-[#c3c6d6]"
                value={form.diagnosisTags}
                onChange={set("diagnosisTags")}
                placeholder="Tags: Primary Open-Angle Glaucoma, Myopia"
              />
              <Textarea
                className="text-[11px] resize-none border-[#c3c6d6] w-full"
                rows={3}
                value={form.diagnosis}
                onChange={set("diagnosis")}
                placeholder="Detailed clinical diagnosis..."
                dir="rtl"
              />
            </div>
          </div>
        </div>

        {/* Referred To + Reason */}
        <div className="mb-6 border border-[#003D9B]/30 rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-[#003D9B]/20">
            <div className="p-4">
              <h2 className="text-[12px] font-semibold text-[#191c1e] mb-2">محول إلى / Referred To</h2>
              <Textarea
                className="text-[11px] resize-none border-[#c3c6d6] w-full"
                rows={3}
                value={form.referredTo}
                onChange={set("referredTo")}
                placeholder="استشاري الجلوكوما&#10;مستشفى العيون التخصصي"
                dir="rtl"
              />
            </div>
            <div className="p-4">
              <h2 className="text-[12px] font-semibold text-[#003D9B] mb-2 flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" /></svg>
                Reason for Referral / سبب التحويل
              </h2>
              <Textarea
                className="text-[11px] resize-none border-[#c3c6d6] w-full"
                rows={3}
                value={form.reasonForReferral}
                onChange={set("reasonForReferral")}
                placeholder="Requesting Visual Field (HFA) and OCT - Optic Nerve Head for glaucoma workup and management plan."
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="flex items-end justify-between pt-4 border-t border-[#c3c6d6]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[8px] font-bold text-[#526069] uppercase tracking-wide">OFFICIAL</p>
                <p className="text-[8px] font-bold text-[#526069] uppercase tracking-wide">MEDICAL STAMP</p>
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#737685] mx-auto mt-1" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-[7px] text-[#737685] mt-0.5">{BRAND_NAME_EN}</p>
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <p className="text-[11px] text-[#434654]">الطبيب المحول / Referring Physician</p>
            <Input
              className="h-7 text-[11px] text-right border-[#c3c6d6] w-48"
              value={form.physicianName}
              onChange={set("physicianName")}
              placeholder="د. اسم الطبيب"
              dir="rtl"
            />
            <div className="w-48 border-b border-gray-400 mt-6 mb-1" />
            <Input
              className="h-6 text-[10px] text-right border-[#c3c6d6] w-48"
              value={form.physicianTitle}
              onChange={set("physicianTitle")}
              placeholder="استشاري طب وجراحة العيون"
              dir="rtl"
            />
          </div>
        </div>

        {/* HIPAA Footer */}
        <div className="mt-8 pt-3 border-t border-[#c3c6d6] text-center">
          <p className="text-[9px] text-[#737685] mb-2">
            © {new Date().getFullYear()} {BRAND_NAME_EN}. This document contains protected health information (PHI) and is intended for medical professional use only.
          </p>
          <div className="flex items-center justify-center gap-4 text-[9px] text-[#526069]">
            <span className="font-semibold">HIPAA Compliance</span>
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
    </fieldset>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB]" dir="rtl">
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

      <main className="print:p-0 container mx-auto px-4 py-6 pb-24 sm:pb-6">
        <div className="print:hidden">{renderBody()}</div>
        <div className="hidden print:block">{renderBody(true)}</div>
      </main>
    </div>
  );
}
