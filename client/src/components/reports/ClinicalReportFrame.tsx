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
      <p className="mb-1 text-xs font-bold uppercase text-[#434654]">
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
    <h1 className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-tight text-[#191c1e]">
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
      className={`clinical-report-frame medical-report-page mx-auto max-w-[210mm] p-8 ${className}`}
      dir={dir}
    >
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          main.clinical-report-frame {
            box-sizing: border-box !important;
            display: block !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 auto !important;
            padding: 40mm 18mm 8mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          main.clinical-report-frame > div {
            position: static !important;
            box-sizing: border-box !important;
            width: 212.2mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            zoom: 0.82 !important;
            transform: none !important;
            transform-origin: top center !important;
          }
          main.clinical-report-frame > div > header {
            margin-bottom: 4mm !important;
            padding-bottom: 3mm !important;
          }
          main.clinical-report-frame > div > section {
            margin-bottom: 4mm !important;
            gap: 3mm !important;
          }
          main.clinical-report-frame .clinical-report-content {
            line-height: 1.35 !important;
          }
          main.clinical-report-frame .clinical-report-content > div {
            gap: 3mm !important;
          }
          main.clinical-report-frame .clinical-report-content section {
            margin-top: 0 !important;
            margin-bottom: 3mm !important;
            gap: 2mm !important;
          }
          main.clinical-report-frame .clinical-report-content section + section,
          main.clinical-report-frame .clinical-report-content > * + * {
            margin-top: 3mm !important;
          }
          main.clinical-report-frame .clinical-report-content table th,
          main.clinical-report-frame .clinical-report-content table td {
            padding-top: 1.2mm !important;
            padding-bottom: 1.2mm !important;
          }
          main.clinical-report-frame .clinical-report-content table th {
            font-size: 13px !important;
          }
          main.clinical-report-frame .clinical-report-content table td,
          main.clinical-report-frame .clinical-report-content table td input,
          main.clinical-report-frame .clinical-report-content table td select {
            font-size: 15px !important;
            font-weight: 700 !important;
          }
          main.clinical-report-frame .clinical-report-content textarea {
            min-height: 14mm !important;
          }
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
          main.clinical-report-frame > div > footer {
            margin-top: 4mm !important;
            padding-top: 3mm !important;
          }
        }
      `}</style>
      <div className="rounded-xl border border-[#c3c6d6] bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between border-b-2 border-[#003d9b] pb-4">
          <div />
          <div className="text-left" dir="ltr">
            <ReportTitle title={title} />
            <p className="text-xs text-[#434654]">
              Generated: {displaySheetDate(generatedDate)}
            </p>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-12 gap-3" dir="rtl">
          <div
            className={`${sidePanel ? "col-span-8" : "col-span-12"} grid grid-cols-12 content-center gap-x-3 gap-y-2 rounded-lg border border-[#c3c6d6] bg-[#f3f4f6] px-3 py-2 text-center`}
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

        <footer className="mt-8 flex items-end justify-between border-t border-[#c3c6d6] pt-4">
          <div />
          <div className="w-48 text-center">
            <div className="mb-1 h-10 border-b border-[#434654]" />
            <p className="text-[10px] uppercase text-[#434654]">
              {signatureLabel}
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
