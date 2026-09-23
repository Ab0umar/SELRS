import type { ReactNode } from "react";
import { displaySheetDate } from "@/lib/sheetDates";

type PatientDetails = {
  name?: ReactNode;
  code?: ReactNode;
  age?: ReactNode;
  birthDate?: string | null;
  phone?: ReactNode;
  occupation?: ReactNode;
};

interface ClinicalReportFrameProps {
  title: string;
  generatedDate?: string;
  patient: PatientDetails;
  sidePanel?: ReactNode;
  children: ReactNode;
  signatureLabel?: string;
  dir?: "rtl" | "ltr";
  className?: string;
}

function Detail({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 truncate text-center text-base font-bold">
        {value || "—"}
      </div>
    </div>
  );
}

function ReportTitle({ title }: { title: string }) {
  const [englishTitle, arabicTitle] = title
    .split("|")
    .map((part) => part.trim());
  return (
    <h1 className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-tight text-foreground">
      <span dir="ltr">{englishTitle}</span>
      {arabicTitle ? (
        <>
          <span aria-hidden>|</span>
          <span dir="rtl">{arabicTitle}</span>
        </>
      ) : null}
    </h1>
  );
}

export function ClinicalReportFrame({
  title,
  generatedDate = new Date().toISOString().split("T")[0],
  patient,
  sidePanel,
  children,
  signatureLabel = "توقيع الطبيب المعالج",
  dir = "rtl",
  className = "",
}: ClinicalReportFrameProps) {
  return (
    <main
      className={`clinical-report-frame medical-report-page mx-auto max-w-[210mm] bg-background p-4 text-foreground sm:p-8 ${className}`}
      dir={dir}
    >
      <style>{`
        @media print {
          /* Letterhead padding on .report-sheet-body (Chrome ignores large @page top) */
          html, body {
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          /* Letterhead ~5cm + compact content for single A4 page */
          main.clinical-report-frame {
            padding: 0 !important;
          }

          /* Tighten vertical rhythm so sheet fits one A4 under 5cm letterhead */
          @page {
            size: A4 portrait;
            margin: 0;
          }
          main.clinical-report-frame .report-sheet-body {
            padding: 50mm 15mm 4mm 15mm !important;
            font-size: 12px !important;
            line-height: 1.25 !important;
          }
          main.clinical-report-frame .report-sheet-body > header {
            margin-bottom: 3mm !important;
            padding-bottom: 2mm !important;
          }
          main.clinical-report-frame .report-sheet-body h1 {
            font-size: 15px !important;
            line-height: 1.15 !important;
          }
          main.clinical-report-frame .report-sheet-body section {
            margin-bottom: 2mm !important;
          }
          main.clinical-report-frame .report-sheet-body .mb-6 {
            margin-bottom: 3mm !important;
          }
          main.clinical-report-frame .report-sheet-body .mb-4 {
            margin-bottom: 2mm !important;
          }
          main.clinical-report-frame .report-sheet-body .mb-3,
          main.clinical-report-frame .report-sheet-body .mb-2 {
            margin-bottom: 1.5mm !important;
          }
          main.clinical-report-frame .report-sheet-body .gap-4,
          main.clinical-report-frame .report-sheet-body .gap-x-4,
          main.clinical-report-frame .report-sheet-body .gap-y-6 {
            gap: 2mm !important;
          }
          main.clinical-report-frame .report-sheet-body .gap-3,
          main.clinical-report-frame .report-sheet-body .gap-x-3,
          main.clinical-report-frame .report-sheet-body .gap-y-2 {
            gap: 1.5mm !important;
          }
          main.clinical-report-frame .report-sheet-body .p-4,
          main.clinical-report-frame .report-sheet-body .p-3,
          main.clinical-report-frame .report-sheet-body .px-3,
          main.clinical-report-frame .report-sheet-body .py-2 {
            padding: 1.5mm !important;
          }
          main.clinical-report-frame .report-sheet-body table th,
          main.clinical-report-frame .report-sheet-body table td,
          main.clinical-report-frame .report-sheet-body .clinical-report-content table th,
          main.clinical-report-frame .report-sheet-body .clinical-report-content table td {
            padding: 2px 4px !important;
            font-size: 12px !important;
            line-height: 1.25 !important;
          }
          main.clinical-report-frame .report-sheet-body p,
          main.clinical-report-frame .report-sheet-body label,
          main.clinical-report-frame .report-sheet-body input,
          main.clinical-report-frame .report-sheet-body textarea,
          main.clinical-report-frame .report-sheet-body select {
            font-size: 12px !important;
            line-height: 1.25 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          /* Hide empty field chrome only — do not restyle typography/spacing */
          main.clinical-report-frame input::placeholder,
          main.clinical-report-frame textarea::placeholder {
            color: transparent !important;
            opacity: 0 !important;
          }
          main.clinical-report-frame [data-placeholder] {
            color: transparent !important;
          }
          main.clinical-report-frame input[type="date"][value=""]::-webkit-datetime-edit,
          main.clinical-report-frame input[type="date"]:not([value])::-webkit-datetime-edit {
            color: transparent !important;
          }
          main.clinical-report-frame input[type="date"][value=""]::-webkit-calendar-picker-indicator,
          main.clinical-report-frame input[type="date"]:not([value])::-webkit-calendar-picker-indicator {
            visibility: hidden !important;
          }
        }
      `}</style>
      <div className="report-sheet-body rounded-xl border border-border/60 bg-card p-4 sm:p-8 print:rounded-none print:border-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between border-b-2 border-primary pb-4">
          <div />
          <div className="text-left" dir="ltr">
            <ReportTitle title={title} />
            <p className="text-xs text-muted-foreground">
              Generated: {displaySheetDate(generatedDate)}
            </p>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-12 gap-3" dir="rtl">
          <div
            className={`${sidePanel ? "col-span-8" : "col-span-12"} grid grid-cols-12 content-center gap-x-3 gap-y-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-center`}
          >
            <Detail
              label="اسم المريض:"
              value={patient.name}
              className="col-span-6"
            />
            <Detail
              label="الكود:"
              value={patient.code}
              className="col-span-3"
            />
            <Detail label="السن:" value={patient.age} className="col-span-3" />
            <Detail
              label="تاريخ الميلاد:"
              value={
                patient.birthDate ? displaySheetDate(patient.birthDate) : "—"
              }
              className="col-span-5"
            />
            <Detail
              label="موبايل:"
              value={patient.phone}
              className="col-span-4"
            />
            <Detail
              label="الوظيفة:"
              value={patient.occupation}
              className="col-span-3"
            />
          </div>
          {sidePanel ? (
            <aside className="col-span-4 flex flex-col gap-2">
              {sidePanel}
            </aside>
          ) : null}
        </section>

        <div className="clinical-report-content">{children}</div>

        <footer className="mt-8 flex items-end justify-between border-t border-border/60 pt-4">
          <div />
          <div className="w-48 text-center">
            <div className="mb-1 h-10 border-b border-border" />
            <p className="text-[10px] uppercase text-muted-foreground">
              {signatureLabel}
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
