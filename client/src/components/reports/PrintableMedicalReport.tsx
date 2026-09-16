export interface RefractionEntry {
  eye: "OD" | "OS" | string;
  sphere?: string;
  cylinder?: string;
  axis?: string;
}

export interface PhysicianInfo {
  name: string;
  title: string;
}

export interface MedicalReportData {
  title: string;
  patientName: string;
  examinationDate: string;
  procedureDate: string;
  clinicalSummary: string;
  refraction: RefractionEntry[];
  procedure: string;
  followUp: string;
  physician: PhysicianInfo;
}

export const defaultReport: MedicalReportData = {
  title: "MEDICAL REPORT",
  patientName: "Mr. Mohamed Saad Basuny",
  examinationDate: "25 August 2026",
  procedureDate: "26 August 2026",
  clinicalSummary:
    "The patient presented with high astigmatism and was evaluated for refractive surgery.",
  refraction: [
    { eye: "OD", sphere: "", cylinder: "-4.00", axis: "95°" },
    { eye: "OS", sphere: "", cylinder: "-3.00", axis: "80°" },
  ],
  procedure: "Femto-LASIK was performed on 26 August 2026.",
  followUp:
    "Postoperative improvement has been noted. Final visual assessment is recommended after approximately six weeks.",
  physician: {
    name: "Prof. Dr. M. Ghoraba",
    title: "Professor of Ophthalmology",
  },
};

interface MedicalReportProps {
  report?: MedicalReportData;
}

export default function MedicalReport({ report = defaultReport }: MedicalReportProps) {
  const printReport = () => window.print();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end print:hidden">
        <button
          type="button"
          onClick={printReport}
          className="rounded-md bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
        >
          Print / Save as PDF
        </button>
      </div>

      <article
        dir="ltr"
        className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[19mm] py-[22mm] font-sans text-[11pt] leading-relaxed text-slate-900 shadow-lg print:min-h-0 print:max-w-none print:shadow-none"
      >
        <h1 className="mb-6 text-center text-[18pt] font-bold tracking-wide">
          {report.title}
        </h1>

        <section className="mb-5 overflow-hidden rounded-sm border border-sky-800">
          <InfoRow label="Patient Name" value={report.patientName} featured />
          <InfoRow label="Date of Examination" value={report.examinationDate} />
          <InfoRow label="Date of Procedure" value={report.procedureDate} />
        </section>

        <section className="mb-5">
          <h2 className="mb-1 font-bold">Clinical Summary:</h2>
          <p>{report.clinicalSummary}</p>
        </section>

        <section className="mb-5">
          <h2 className="mb-2 font-bold">Refraction:</h2>

          <table className="w-full border-collapse text-center">
            <thead className="bg-sky-800 text-white">
              <tr>
                <th className="border border-sky-900 p-2">Eye</th>
                <th className="border border-sky-900 p-2">S</th>
                <th className="border border-sky-900 p-2">C</th>
                <th className="border border-sky-900 p-2">A</th>
              </tr>
            </thead>

            <tbody>
              {report.refraction.map((item, index) => (
                <tr
                  key={item.eye}
                  className={index % 2 === 0 ? "bg-sky-50" : "bg-white"}
                >
                  <td className="border border-sky-800 p-2 font-bold">
                    {item.eye}
                  </td>
                  <td className="border border-sky-800 p-2">
                    {item.sphere || "—"}
                  </td>
                  <td className="border border-sky-800 p-2">
                    {item.cylinder || "—"}
                  </td>
                  <td className="border border-sky-800 p-2">
                    {item.axis || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3">
          <p>
            <strong>Procedure:</strong> {report.procedure}
          </p>

          <p>
            <strong>Follow-Up:</strong> {report.followUp}
          </p>
        </section>

        <footer className="mt-12">
          <p className="font-bold">Physician</p>
          <p>{report.physician.name}</p>
          <p>{report.physician.title}</p>

          <div className="mt-10 flex items-end gap-3">
            <span className="font-bold">Signature:</span>
            <span className="h-6 flex-1 border-b border-slate-900" />
          </div>
        </footer>
      </article>
    </main>
  );
}

function InfoRow({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[35%_65%] border-b border-sky-800 last:border-b-0 ${
        featured ? "bg-sky-800 text-white" : "bg-sky-50"
      }`}
    >
      <div className="border-r border-sky-800 p-2 font-bold">{label}</div>
      <div className="p-2">{value}</div>
    </div>
  );
}
