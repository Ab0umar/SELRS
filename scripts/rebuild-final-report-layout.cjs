const fs = require("fs");
const path = "client/src/pages/WorkflowPrototypeLive.tsx";
const source = fs.readFileSync(path, "utf8");
const start = source.indexOf("    const renderDigitalFinal = () => (");
const end = source.indexOf("    const sectionContent: Record<WorkflowSectionId, ReactNode> = {", start);
if (start < 0 || end < 0) throw new Error("Final report boundaries not found");
const replacement = String.raw`    const renderDigitalFinal = () => (
      <div
        className="final-report-sheet mx-auto max-w-[1180px] space-y-5 rounded-2xl border border-slate-300 bg-white p-5 text-[15px] leading-7 text-slate-900 shadow-lg sm:p-7 print:space-y-2 print:text-[11px] print:leading-4 print:rounded-none print:border-0 print:p-0 print:shadow-none"
        dir="ltr"
      >
        <header className="border-b-4 border-blue-900 pb-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-blue-900">SELRS EYE CENTER</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">FINAL MEDICAL REPORT</h2>
              <p className="mt-1 text-base font-semibold text-slate-600">Digital Visit Summary</p>
            </div>
            <Button type="button" variant="outline" className="print:hidden" onClick={printSheet}>
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
          <div className="mt-5 grid gap-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
            <div><p className="text-xs font-bold text-slate-500">Patient Name</p><p className="mt-1 text-lg font-black text-slate-950" dir="rtl">{selectedLivePatient.fullName ?? data.reception.fullName}</p></div>
            <div><p className="text-xs font-bold text-slate-500">Visit ID</p><p className="mt-1 text-lg font-bold" dir="ltr">{String(selectedLivePatient.visitId ?? "—")}</p></div>
            <div><p className="text-xs font-bold text-slate-500">Patient Code</p><p className="mt-1 text-lg font-bold" dir="ltr">{String(selectedLivePatient.patientCode ?? selectedLivePatient.id ?? "—")}</p></div>
            <div><p className="text-xs font-bold text-slate-500">Visit Status</p><p className="mt-1 text-lg font-bold" dir="rtl">{selectedLivePatient.queueStatus ?? "—"}</p></div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-2" dir="ltr">
          <div className="rounded-xl border-2 border-slate-300 bg-white p-4">
            <h3 className="mb-3 border-b-2 border-slate-200 pb-2 text-xl font-black text-blue-950">Patient Information</h3>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="font-bold text-slate-500">Medical History:</span><p className="mt-1" dir="rtl">{data.reception.medicalHistory || "—"}</p></div>
              <div><span className="font-bold text-slate-500">Previous Operations:</span><p className="mt-1" dir="rtl">{data.reception.previousOperations || "—"}</p></div>
              <div><span className="font-bold text-slate-500">Allergies:</span><p className="mt-1" dir="rtl">{data.reception.medicationsAllergies || "—"}</p></div>
              <div><span className="font-bold text-slate-500">Notes:</span><p className="mt-1" dir="rtl">{data.reception.notes || "—"}</p></div>
            </div>
          </div>
          <div className="rounded-xl border-2 border-slate-300 bg-white p-4">
            <h3 className="mb-3 border-b-2 border-slate-200 pb-2 text-xl font-black text-blue-950">Complaints &amp; Symptoms</h3>
            <p className="rounded-lg bg-slate-50 px-3 py-3 text-base font-semibold" dir="rtl">{data.specialist.complains || "No complaints recorded"}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
              <div className="rounded border border-slate-200 px-2 py-2"><b>Ptosis:</b> {data.specialist.externalAppearance.ptosis ? "Present" : "Absent"}</div>
              <div className="rounded border border-slate-200 px-2 py-2"><b>Squint:</b> {data.specialist.externalAppearance.squint ? "Present" : "Absent"}</div>
              <div className="rounded border border-slate-200 px-2 py-2"><b>Others:</b> <span dir="rtl">{data.specialist.externalAppearance.others || "—"}</span></div>
            </div>
          </div>
        </section>

        <section className="report-section">
          <div className="mb-3 flex items-center gap-3 border-b-2 border-slate-200 pb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-sm font-black text-white">1</span>
            <h3 className="text-xl font-black text-blue-950">Measurements</h3>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]" dir="ltr">
            <div className="relative flex justify-center py-3 lg:justify-start">
              <div className="absolute left-24 top-0 z-10 h-5 w-20 -rotate-6 rounded-sm border border-slate-400 bg-slate-300/80 shadow-sm print:hidden"><span className="sr-only">Stapled AutoRef receipt</span></div>
              <article className="relative w-full max-w-[390px] rotate-[0.5deg] border border-slate-300 bg-[#fffef9] px-5 py-6 text-[14px] leading-6 text-slate-950 shadow-[4px_5px_0_rgba(15,23,42,0.14)] print:max-w-[320px] print:rotate-0 print:shadow-none">
                <div className="receipt-edge absolute -bottom-1 left-0 right-0 h-2 bg-[radial-gradient(circle_at_4px_0,#fffef9_3px,transparent_3.5px)] bg-[length:8px_8px]" />
                <header className="border-b border-dashed border-slate-500 pb-3 text-center font-mono">
                  <p className="text-[11px] font-bold tracking-[0.28em]">SELRS EYE CENTER</p>
                  <p className="mt-1 text-xl font-black tracking-widest">AUTO REFRACTION</p>
                </header>
                <div className="py-4 font-mono">
                  <div className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] border-b border-slate-400 pb-2 text-center text-[14px] font-black"><span>EYE</span><span>S</span><span>C</span><span>A</span></div>
                  {eyeOrder.map((eye) => (
                    <div key={eye} className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] py-2 text-center text-[17px] font-semibold"><span className="text-left">&lt;{eye === "od" ? "R" : "L"}&gt;</span><span>{data.nursing.autoref[eye].s || "—"}</span><span>{data.nursing.autoref[eye].c || "—"}</span><span>{data.nursing.autoref[eye].a || "—"}</span></div>
                  ))}
                </div>
                <div className="border-y border-dashed border-slate-500 py-4 font-mono text-[14px]">
                  <div className="grid grid-cols-2 gap-4">
                    {eyeOrder.map((eye) => (
                      <div key={eye}><p className="text-lg font-black">{eye === "od" ? "RIGHT (R)" : "LEFT (L)"}</p><p className="text-[16px] font-semibold">UCVA: {data.nursing.ucva[eye] || "—"}</p><p className="text-[16px] font-semibold">IOP: {data.nursing.iop[eye] || "—"}</p></div>
                    ))}
                  </div>
                  <p className="mt-3">PD: — &nbsp;&nbsp; VD: —</p>
                </div>
              </article>
            </div>
            <div className="space-y-5">
              <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white">
                <table className="w-full min-w-[700px] border-collapse text-center text-[14px]" dir="ltr">
                  <thead className="bg-[#e7e8ea] text-xs font-bold uppercase text-slate-800">
                    <tr><th className="border border-slate-300 px-3 py-3">Refraction</th><th className="border border-slate-300 px-3 py-3 text-[#003d9b]" colSpan={3}>OD (Right)</th><th className="border border-slate-300 px-3 py-3 text-[#526069]" colSpan={3}>OS (Left)</th></tr>
                    <tr><th className="border border-slate-300 bg-[#f3f4f6] px-3 py-3">Distance</th><th className="border border-slate-300 px-3 py-3">S</th><th className="border border-slate-300 px-3 py-3">C</th><th className="border border-slate-300 px-3 py-3">A</th><th className="border border-slate-300 px-3 py-3">S</th><th className="border border-slate-300 px-3 py-3">C</th><th className="border border-slate-300 px-3 py-3">A</th></tr>
                  </thead>
                  <tbody className="font-mono">
                    <tr><td className="border border-slate-300 bg-[#f3f4f6] px-3 py-3">&nbsp;</td><td className="border border-slate-300 px-3 py-3">{data.specialist.distance.od.s || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.specialist.distance.od.c || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.specialist.distance.od.a || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.specialist.distance.os.s || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.specialist.distance.os.c || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.specialist.distance.os.a || "—"}</td></tr>
                    <tr><td className="border border-slate-300 bg-[#f3f4f6] px-3 py-3 font-bold text-[#003d9b]">Reading</td><td className="border border-slate-300 p-0" colSpan={6}><div className="flex w-full items-center gap-3 px-3 py-2"><span className="whitespace-nowrap font-bold">Add +</span><span className="flex-1 rounded border border-slate-300 bg-slate-50 px-4 py-2 text-center font-mono text-base font-semibold">{data.specialist.reading || "—"}</span></div></td></tr>
                  </tbody>
                </table>
              </div>
              {hasPentacam ? (
                <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white">
                  <table className="w-full min-w-[650px] border-collapse text-center text-[14px]" dir="ltr">
                    <thead className="bg-slate-100 font-black text-slate-800"><tr><th className="border border-slate-300 px-3 py-3">Pentacam</th><th className="border border-slate-300 px-3 py-3">K1</th><th className="border border-slate-300 px-3 py-3">K2</th><th className="border border-slate-300 px-3 py-3">Axis</th><th className="border border-slate-300 px-3 py-3">Thinnest Location</th></tr></thead>
                    <tbody>{eyeOrder.map((eye) => <tr key={eye} className="even:bg-slate-50"><td className="border border-slate-300 px-3 py-3 text-base font-black">{eye.toUpperCase()}</td><td className="border border-slate-300 px-3 py-3">{data.pentacam[eye].k1 || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.pentacam[eye].k2 || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.pentacam[eye].axis || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.pentacam[eye].thinnestLocation || "—"}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {hasExaminationData ? (
          <section className="report-section rounded-xl border-2 border-slate-300 p-4" dir="ltr">
            <h3 className="mb-3 border-b-2 border-slate-200 pb-2 text-xl font-black text-blue-950">Examination</h3>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-300 p-4"><p className="text-xs font-bold text-slate-500">Muscle Action</p><p className="mt-1 text-lg font-black">{data.specialist.muscleAction}</p></div><div className="rounded-xl border border-slate-300 p-4"><p className="text-xs font-bold text-slate-500">Fundus</p><p className="mt-1 text-lg font-black">{data.specialist.fundus}</p></div></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-300 p-4"><p className="text-sm font-black text-blue-900">Other Abnormalities</p><p className="mt-1 text-base" dir="rtl">{data.specialist.otherAbnormalities || "—"}</p></div><div className="rounded-xl border border-slate-300 p-4"><p className="text-sm font-black text-blue-900">External Appearance</p><p className="mt-1 text-base">Ptosis: {data.specialist.externalAppearance.ptosis ? "Present" : "Absent"} | Squint: {data.specialist.externalAppearance.squint ? "Present" : "Absent"}</p></div></div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2" dir="ltr">
          <div className="rounded-xl border-2 border-slate-300 p-4"><h3 className="mb-2 text-xl font-black text-blue-950">Diseases</h3><p className="text-base" dir="rtl">{data.consultant.diseases || data.specialist.diseases || "No diseases recorded"}</p></div>
          <div className="rounded-xl border-2 border-slate-300 p-4"><h3 className="mb-2 text-xl font-black text-blue-950">Diagnosis</h3><p className="text-base" dir="rtl">{data.consultant.diagnosis || data.specialist.diagnosis || "No final diagnosis recorded"}</p></div>
        </section>

        {(data.specialist.testsRays || data.consultant.testsRays || data.specialist.prescription || data.consultant.prescription) ? (
          <section className="grid gap-4 sm:grid-cols-2" dir="ltr">
            <div className="rounded-xl border-2 border-slate-300 p-4"><h3 className="text-xl font-black text-blue-950">Tests &amp; Rays</h3><p className="mt-2 text-base" dir="rtl">{data.consultant.testsRays || data.specialist.testsRays || "—"}</p></div>
            <div className="rounded-xl border-2 border-slate-300 p-4"><h3 className="text-xl font-black text-blue-950">Prescription</h3><p className="mt-2 text-base" dir="rtl">{data.consultant.prescription || data.specialist.prescription || "—"}</p></div>
          </section>
        ) : null}

        <section className="rounded-xl border-2 border-blue-900 bg-blue-50 p-5" dir="ltr"><p className="text-sm font-bold text-blue-800">Final Decision</p><p className="mt-1 text-2xl font-black text-blue-950">{consultant.finalDecision}</p></section>
        <footer className="flex flex-col justify-between gap-2 border-t-2 border-slate-200 pt-4 text-sm font-semibold text-slate-500 sm:flex-row"><span>Report Date: {selectedDate}</span><span>SELRS — Digital Medical Workflow</span></footer>
      </div>
    );

`;
fs.writeFileSync(path, source.slice(0, start) + replacement + source.slice(end), "utf8");
console.log("Final report layout rebuilt");
