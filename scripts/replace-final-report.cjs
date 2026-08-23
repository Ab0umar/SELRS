const fs = require("fs");
const path = "client/src/pages/WorkflowPrototypeLive.tsx";
const source = fs.readFileSync(path, "utf8");
const start = source.indexOf("    const renderDigitalFinal = () => (");
const end = source.indexOf("    const sectionContent: Record<WorkflowSectionId, ReactNode> = {", start);
if (start < 0 || end < 0) throw new Error("Final report boundaries not found");
const replacement = String.raw`    const renderDigitalFinal = () => (
      <div
        className="final-report-sheet mx-auto max-w-[1120px] space-y-5 rounded-2xl border border-slate-300 bg-white p-5 text-[15px] leading-7 text-slate-900 shadow-lg sm:p-7 print:rounded-none print:border-0 print:p-0 print:shadow-none"
        dir="rtl"
      >
        <header className="border-b-4 border-blue-900 pb-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-blue-900" dir="ltr">
                SELRS EYE CENTER
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                التقرير الطبي النهائي
              </h2>
              <p className="mt-1 text-base font-semibold text-slate-600">
                ملخص زيارة المريض والبيانات الطبية المسجلة
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center sm:min-w-[190px]" dir="ltr">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">FINAL MEDICAL REPORT</p>
              <p className="mt-1 text-sm font-semibold text-blue-950">Digital Visit Summary</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-bold text-slate-500">اسم المريض</p>
              <p className="mt-1 text-lg font-black text-slate-950">{selectedLivePatient.fullName ?? data.reception.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">رقم الزيارة</p>
              <p className="mt-1 text-lg font-bold text-slate-950" dir="ltr">{String(selectedLivePatient.visitId ?? "—")}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">كود المريض</p>
              <p className="mt-1 text-lg font-bold text-slate-950" dir="ltr">{String(selectedLivePatient.patientCode ?? selectedLivePatient.id ?? "—")}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">حالة الزيارة</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{selectedLivePatient.queueStatus ?? "—"}</p>
            </div>
          </div>
        </header>

        <section className="report-section">
          <div className="mb-3 flex items-center gap-3 border-b-2 border-slate-200 pb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-sm font-black text-white">1</span>
            <h3 className="text-xl font-black text-blue-950">الشكوى والأعراض</h3>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold">
            {data.specialist.complains || "لا توجد شكوى مسجلة"}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 px-3 py-2"><span className="font-bold">Ptosis:</span> {data.specialist.externalAppearance.ptosis ? "موجود" : "غير موجود"}</div>
            <div className="rounded-lg border border-slate-200 px-3 py-2"><span className="font-bold">Squint:</span> {data.specialist.externalAppearance.squint ? "موجود" : "غير موجود"}</div>
            <div className="rounded-lg border border-slate-200 px-3 py-2"><span className="font-bold">Others:</span> {data.specialist.externalAppearance.others || "—"}</div>
          </div>
        </section>

        <section className="report-section">
          <div className="mb-3 flex items-center gap-3 border-b-2 border-slate-200 pb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-sm font-black text-white">2</span>
            <h3 className="text-xl font-black text-blue-950">القياسات الطبية</h3>
          </div>
          <div className="overflow-x-auto rounded-xl border-2 border-slate-300">
            <table className="w-full min-w-[760px] border-collapse text-center text-[14px]" dir="ltr">
              <thead className="bg-blue-900 font-black text-white">
                <tr>
                  <th className="border border-blue-700 px-3 py-3">Eye</th>
                  <th className="border border-blue-700 px-3 py-3">UCVA</th>
                  <th className="border border-blue-700 px-3 py-3">IOP (Air Puff)</th>
                  <th className="border border-blue-700 px-3 py-3">AutoRef S</th>
                  <th className="border border-blue-700 px-3 py-3">AutoRef C</th>
                  <th className="border border-blue-700 px-3 py-3">AutoRef Axis</th>
                  <th className="border border-blue-700 px-3 py-3">BCVA</th>
                </tr>
              </thead>
              <tbody>
                {eyeOrder.map((eye) => (
                  <tr key={eye} className="even:bg-slate-50">
                    <td className="border border-slate-300 px-3 py-3 text-base font-black">{eye.toUpperCase()}</td>
                    <td className="border border-slate-300 px-3 py-3 font-semibold">{data.nursing.ucva[eye] || "—"}</td>
                    <td className="border border-slate-300 px-3 py-3 font-semibold">{data.nursing.iop[eye] || "—"}</td>
                    <td className="border border-slate-300 px-3 py-3">{data.nursing.autoref[eye].s || "—"}</td>
                    <td className="border border-slate-300 px-3 py-3">{data.nursing.autoref[eye].c || "—"}</td>
                    <td className="border border-slate-300 px-3 py-3">{data.nursing.autoref[eye].a || "—"}</td>
                    <td className="border border-slate-300 px-3 py-3 font-semibold">{data.specialist.bcva[eye] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border-2 border-slate-300">
            <table className="w-full min-w-[700px] border-collapse text-center text-[14px]" dir="ltr">
              <thead className="bg-slate-100 font-black text-slate-800">
                <tr>
                  <th className="border border-slate-300 px-3 py-3">Eye</th>
                  <th className="border border-slate-300 px-3 py-3">BCVA</th>
                  <th className="border border-slate-300 px-3 py-3">Distance S</th>
                  <th className="border border-slate-300 px-3 py-3">Distance C</th>
                  <th className="border border-slate-300 px-3 py-3">Distance A</th>
                </tr>
              </thead>
              <tbody>
                {eyeOrder.map((eye) => (
                  <tr key={eye} className="even:bg-slate-50">
                    <td className="border border-slate-300 px-3 py-3 text-base font-black">{eye.toUpperCase()}</td>
                    <td className="border border-slate-300 px-3 py-3 font-semibold">{data.specialist.bcva[eye] || "—"}</td>
                    <td className="border border-slate-300 px-3 py-3">{data.specialist.distance[eye].s || "—"}</td>
                    <td className="border border-slate-300 px-3 py-3">{data.specialist.distance[eye].c || "—"}</td>
                    <td className="border border-slate-300 px-3 py-3">{data.specialist.distance[eye].a || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-xl border border-slate-300 bg-blue-50 px-4 py-3 text-base font-bold" dir="ltr">
            Reading — shared for OD &amp; OS: <span className="font-black">{data.specialist.reading || "—"}</span>
          </div>
        </section>

        <section className="report-section">
          <div className="mb-3 flex items-center gap-3 border-b-2 border-slate-200 pb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-sm font-black text-white">3</span>
            <h3 className="text-xl font-black text-blue-950">الفحص والتشخيص</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-300 p-4"><p className="text-xs font-bold text-slate-500">Muscle action</p><p className="mt-1 text-lg font-black" dir="ltr">{data.specialist.muscleAction}</p></div>
            <div className="rounded-xl border border-slate-300 p-4"><p className="text-xs font-bold text-slate-500">Fundus</p><p className="mt-1 text-lg font-black" dir="ltr">{data.specialist.fundus}</p></div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-300 p-4"><p className="text-sm font-black text-blue-900">Diseases</p><p className="mt-1 text-base">{data.consultant.diseases || data.specialist.diseases || "لا توجد أمراض مسجلة"}</p></div>
            <div className="rounded-xl border border-slate-300 p-4"><p className="text-sm font-black text-blue-900">Diagnosis</p><p className="mt-1 text-base">{data.consultant.diagnosis || data.specialist.diagnosis || "لا يوجد تشخيص نهائي مسجل"}</p></div>
          </div>
          <div className="mt-3 rounded-xl border border-slate-300 p-4">
            <p className="text-sm font-black text-blue-900">Other abnormalities</p>
            <p className="mt-1 text-base">{data.specialist.otherAbnormalities || "—"}</p>
          </div>
        </section>

        {hasPentacam ? (
          <section className="report-section">
            <div className="mb-3 flex items-center gap-3 border-b-2 border-slate-200 pb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-sm font-black text-white">4</span>
              <h3 className="text-xl font-black text-blue-950" dir="ltr">Pentacam</h3>
            </div>
            <div className="overflow-x-auto rounded-xl border-2 border-slate-300">
              <table className="w-full min-w-[650px] border-collapse text-center text-[14px]" dir="ltr">
                <thead className="bg-slate-100 font-black text-slate-800">
                  <tr><th className="border border-slate-300 px-3 py-3">Eye</th><th className="border border-slate-300 px-3 py-3">K1</th><th className="border border-slate-300 px-3 py-3">K2</th><th className="border border-slate-300 px-3 py-3">Axis</th><th className="border border-slate-300 px-3 py-3">Thinnest Location</th></tr>
                </thead>
                <tbody>
                  {eyeOrder.map((eye) => (
                    <tr key={eye} className="even:bg-slate-50"><td className="border border-slate-300 px-3 py-3 text-base font-black">{eye.toUpperCase()}</td><td className="border border-slate-300 px-3 py-3">{data.pentacam[eye].k1 || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.pentacam[eye].k2 || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.pentacam[eye].axis || "—"}</td><td className="border border-slate-300 px-3 py-3">{data.pentacam[eye].thinnestLocation || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {data.specialist.testsRays || data.consultant.testsRays ? (
          <section className="report-section rounded-xl border-2 border-slate-300 p-4">
            <h3 className="text-xl font-black text-blue-950">التحاليل والأشعة</h3>
            <p className="mt-2 text-base font-semibold">{data.consultant.testsRays || data.specialist.testsRays}</p>
          </section>
        ) : null}
        {data.specialist.prescription || data.consultant.prescription ? (
          <section className="report-section rounded-xl border-2 border-slate-300 p-4">
            <h3 className="text-xl font-black text-blue-950">الروشتة والعلاج</h3>
            <p className="mt-2 text-base font-semibold">{data.consultant.prescription || data.specialist.prescription}</p>
          </section>
        ) : null}

        <section className="rounded-xl border-2 border-blue-900 bg-blue-50 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold text-blue-800">القرار النهائي للاستشاري</p>
              <p className="mt-1 text-2xl font-black text-blue-950">{consultant.finalDecision}</p>
            </div>
            <div className="rounded-lg bg-white px-4 py-3 text-center text-sm font-bold text-slate-700">
              التقرير الرقمي النهائي
              <br />
              <span className="text-xs font-normal">تم تجميع البيانات من مراحل الزيارة</span>
            </div>
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-2 border-t-2 border-slate-200 pt-4 text-sm font-semibold text-slate-500 sm:flex-row">
          <span>تاريخ التقرير: {selectedDate}</span>
          <span>SELRS — Digital Medical Workflow</span>
        </footer>
      </div>
    );

`;
const updated = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(path, updated, "utf8");
console.log("Final report replaced");
