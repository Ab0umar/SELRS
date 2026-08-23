const fs = require("fs");
const path = "client/src/pages/WorkflowPrototypeLive.tsx";
let source = fs.readFileSync(path, "utf8");
const autoRefStart = '          <div className="relative flex justify-center py-3 sm:justify-start lg:justify-end">';
if (!source.includes(autoRefStart)) throw new Error("AutoRef start not found");
source = source.replace(autoRefStart, '          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">\n' + autoRefStart);
const refStart = '          <div className="mt-4 overflow-x-auto rounded-xl border-2 border-slate-300">';
const refEnd = '          <div className="mt-3 rounded-xl border border-slate-300 bg-blue-50 px-4 py-3 text-base font-bold" dir="ltr">';
const start = source.indexOf(refStart);
const end = source.indexOf(refEnd, start);
if (start < 0 || end < 0) throw new Error("Refraction block boundaries not found");
const replacement = String.raw`          <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white">
            <table className="w-full min-w-[700px] border-collapse text-center text-[14px]" dir="ltr">
              <thead className="bg-[#e7e8ea] text-xs font-bold uppercase text-slate-800">
                <tr>
                  <th className="border border-slate-300 px-3 py-3">Refraction</th>
                  <th className="border border-slate-300 px-3 py-3 text-[#003d9b]" colSpan={3}>OD (Right)</th>
                  <th className="border border-slate-300 px-3 py-3 text-[#526069]" colSpan={3}>OS (Left)</th>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-[#f3f4f6] px-3 py-3">Distance</th>
                  <th className="border border-slate-300 px-3 py-3">S</th>
                  <th className="border border-slate-300 px-3 py-3">C</th>
                  <th className="border border-slate-300 px-3 py-3">A</th>
                  <th className="border border-slate-300 px-3 py-3">S</th>
                  <th className="border border-slate-300 px-3 py-3">C</th>
                  <th className="border border-slate-300 px-3 py-3">A</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className="border border-slate-300 bg-[#f3f4f6] px-3 py-3">&nbsp;</td>
                  <td className="border border-slate-300 px-3 py-3">{data.specialist.distance.od.s || "—"}</td>
                  <td className="border border-slate-300 px-3 py-3">{data.specialist.distance.od.c || "—"}</td>
                  <td className="border border-slate-300 px-3 py-3">{data.specialist.distance.od.a || "—"}</td>
                  <td className="border border-slate-300 px-3 py-3">{data.specialist.distance.os.s || "—"}</td>
                  <td className="border border-slate-300 px-3 py-3">{data.specialist.distance.os.c || "—"}</td>
                  <td className="border border-slate-300 px-3 py-3">{data.specialist.distance.os.a || "—"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 bg-[#f3f4f6] px-3 py-3 font-bold text-[#003d9b]">Reading</td>
                  <td className="border border-slate-300 px-3 py-3" colSpan={6}>
                    <div className="flex items-center justify-center gap-2">
                      <span className="whitespace-nowrap font-bold">Add +</span>
                      <span className="rounded border border-slate-300 bg-slate-50 px-4 py-1 font-mono">{data.specialist.reading || "—"}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
`;
source = source.slice(0, start) + replacement + source.slice(end);
const readingEnd = '          <div className="mt-3 rounded-xl border border-slate-300 bg-blue-50 px-4 py-3 text-base font-bold" dir="ltr">\n            Reading — shared for OD &amp; OS: <span className="font-black">{data.specialist.reading || "—"}</span>\n          </div>\n        </section>';
if (!source.includes(readingEnd)) throw new Error("Refraction section closing boundary not found");
source = source.replace(readingEnd, '          <div className="mt-3 rounded-xl border border-slate-300 bg-blue-50 px-4 py-3 text-base font-bold" dir="ltr">\n            Reading — shared for OD &amp; OS: <span className="font-black">{data.specialist.reading || "—"}</span>\n          </div>\n          </div>\n        </section>');
fs.writeFileSync(path, source, "utf8");
console.log("Consultant-style Refraction table placed beside AutoRef");
