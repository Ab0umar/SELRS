const fs = require("fs");
const path = "client/src/pages/WorkflowPrototypeLive.tsx";
const source = fs.readFileSync(path, "utf8");
const startMarker = '          <div className="rounded-[18px] border-2 border-slate-300 bg-[#fffdf4]';
const endMarker = '          <div className="mt-4 overflow-x-auto rounded-xl border-2 border-slate-300">';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("AutoRef card boundaries not found");
const replacement = String.raw`          <div className="relative flex justify-center py-3 sm:justify-start lg:justify-end">
            <div className="absolute right-[calc(50%-54px)] top-0 z-10 h-5 w-20 -rotate-6 rounded-sm border border-slate-400 bg-slate-300/80 shadow-sm sm:right-auto sm:left-24 lg:right-20 lg:left-auto print:hidden">
              <span className="sr-only">Stapled AutoRef receipt</span>
            </div>
            <article className="relative w-full max-w-[330px] rotate-[0.5deg] border border-slate-300 bg-[#fffef9] px-4 py-5 text-[12px] leading-5 text-slate-950 shadow-[4px_5px_0_rgba(15,23,42,0.14)] print:max-w-[270px] print:rotate-0 print:shadow-none" dir="ltr">
              <div className="receipt-edge absolute -bottom-1 left-0 right-0 h-2 bg-[radial-gradient(circle_at_4px_0,#fffef9_3px,transparent_3.5px)] bg-[length:8px_8px]" />
              <header className="border-b border-dashed border-slate-500 pb-3 text-center font-mono">
                <p className="text-[10px] font-bold tracking-[0.28em]">SELRS EYE CENTER</p>
                <p className="mt-1 text-base font-black tracking-widest">AUTO REFRACTION</p>
                <p className="mt-1 text-[10px] font-semibold">NIDEK / ARK-560A</p>
                <p className="mt-1 text-[10px]">{selectedDate} &nbsp; {String(selectedLivePatient.visitId ?? "VISIT")}</p>
              </header>
              <div className="border-b border-dashed border-slate-500 py-3 font-mono text-[11px]">
                <p><span className="font-bold">NAME:</span> {selectedLivePatient.fullName ?? data.reception.fullName}</p>
                <p><span className="font-bold">M/F:</span> {data.reception.gender || "—"}</p>
              </div>
              <div className="py-3 font-mono">
                <div className="grid grid-cols-[58px_repeat(3,minmax(0,1fr))] border-b border-slate-400 pb-1 text-center font-black">
                  <span>EYE</span><span>S</span><span>C</span><span>A</span>
                </div>
                {eyeOrder.map((eye) => (
                  <div key={eye} className="grid grid-cols-[58px_repeat(3,minmax(0,1fr))] py-1 text-center text-[13px] font-semibold">
                    <span className="text-left">&lt;{eye === "od" ? "R" : "L"}&gt;</span>
                    <span>{data.nursing.autoref[eye].s || "—"}</span>
                    <span>{data.nursing.autoref[eye].c || "—"}</span>
                    <span>{data.nursing.autoref[eye].a || "—"}</span>
                  </div>
                ))}
              </div>
              <div className="border-y border-dashed border-slate-500 py-3 font-mono text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  {eyeOrder.map((eye) => (
                    <div key={eye}>
                      <p className="font-black">{eye === "od" ? "RIGHT (R)" : "LEFT (L)"}</p>
                      <p>UCVA: {data.nursing.ucva[eye] || "—"}</p>
                      <p>IOP: {data.nursing.iop[eye] || "—"}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2">PD: — &nbsp;&nbsp; VD: —</p>
              </div>
              <footer className="pt-3 text-center font-mono text-[10px] font-bold tracking-[0.18em]">
                <p>COMPUTERIZED MEASUREMENT</p>
                <p className="mt-1">PLEASE VERIFY CLINICALLY</p>
              </footer>
            </article>
          </div>
`;
fs.writeFileSync(path, source.slice(0, start) + replacement + source.slice(end), "utf8");
console.log("AutoRef replaced with thermal receipt");
