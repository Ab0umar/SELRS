import type { ReactNode } from "react";

export type ReportStock = "blank" | "preprinted";

export function ReportDocumentTitle({ arabic, english, onArabicChange, onEnglishChange }: {
  arabic: string;
  english?: string;
  onArabicChange?: (value: string) => void;
  onEnglishChange?: (value: string) => void;
}) {
  return (
    <header className="report-title-header">
      <div className="report-document-title">
        <h1 dir="rtl">{onArabicChange ? <><input aria-label="عنوان التقرير بالعربية" className="report-title-edit print:hidden" value={arabic} onChange={(event) => onArabicChange(event.target.value)} /><span className="hidden print:inline">{arabic}</span></> : arabic}</h1>
        {english ? <p dir="ltr">{onEnglishChange ? <><input aria-label="Report title in English" className="report-title-edit print:hidden" value={english} onChange={(event) => onEnglishChange(event.target.value)} /><span className="hidden print:inline">{english}</span></> : english}</p> : null}
      </div>
    </header>
  );
}

export function ReportPatientGrid({ children }: { children: ReactNode }) {
  return <div className="report-patient-grid" dir="rtl">{children}</div>;
}

export function ReportPatientItem({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`report-patient-field min-w-0 ${className}`}>
      <p className="report-patient-label">{label}</p>
      <div className="report-patient-value">{children}</div>
    </div>
  );
}

export function ReportLetterhead() {
  return (
    <div className="report-stationery-letterhead" aria-label="ترويسة عيون الشروق">
      <img src="/logos/full.png" alt="شعار عيون الشروق" />
      <div>
        <strong>عيون الشروق</strong>
        <span>لليزك وتصحيح الإبصار</span>
        <small dir="ltr">SHOROUK EYES · FOR LASIK & REFRACTIVE SURGERY</small>
      </div>
    </div>
  );
}

export function ReportStationeryFooter() {
  return (
    <div className="report-stationery-footer" aria-label="تذييل عيون الشروق">
      <span>عيون الشروق · لليزك وتصحيح الإبصار</span>
      <span dir="ltr">selrs.cc</span>
    </div>
  );
}

export function ReportSection({ title, children, className = "" }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`report-q-section ${className}`}>
      <h3 className="report-q-heading">{title}</h3>
      {children}
    </section>
  );
}

export function ReportFacts({ children }: { children: ReactNode }) {
  return <div className="report-q-facts">{children}</div>;
}

export function ReportFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="report-q-fact min-w-0">
      <small>{label}</small>
      <div>{children}</div>
    </div>
  );
}
