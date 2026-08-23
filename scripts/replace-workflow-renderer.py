from pathlib import Path

path = Path('client/src/pages/WorkflowPrototypeLive.tsx')
text = path.read_text(encoding='utf-8')
start = text.index('  const renderLiveWorkspace = () => {')
end = text.index('\n  return (', start)
replacement = r'''  const renderLiveWorkspace = () => {
    if (!selectedLivePatient) return null;

    const optionalSet = new Set(optionalSections);
    const tabs = workflowSectionMeta.filter(
      (item) => !item.optional || optionalSet.has(item.id),
    );
    const hasPentacam = [data.pentacam.od, data.pentacam.os].some((eye) =>
      Object.values(eye).some(Boolean),
    );
    const addOptional = (section: WorkflowSectionId) => {
      setOptionalSections((current) =>
        current.includes(section) ? current : [...current, section],
      );
      setActiveSection(section);
    };
    const removeOptional = (section: WorkflowSectionId) => {
      setOptionalSections((current) => current.filter((id) => id !== section));
      if (activeSection === section) setActiveSection("measurements");
    };

    const renderDigitalFinal = () => (
      <div className="grid gap-3 lg:grid-cols-2" dir="rtl">
        <Panel title="ملخص الزيارة" subtitle="عرض رقمي مختصر" icon={FileText} active>
          <div className="grid gap-2 sm:grid-cols-3">
            <ReadonlySummary title="المريض">
              {selectedLivePatient.fullName ?? data.reception.fullName}
            </ReadonlySummary>
            <ReadonlySummary title="رقم الزيارة">
              {String(selectedLivePatient.visitId ?? "—")}
            </ReadonlySummary>
            <ReadonlySummary title="الحالة">
              {selectedLivePatient.queueStatus ?? "—"}
            </ReadonlySummary>
          </div>
        </Panel>
        <Panel title="الشكوى والأعراض" icon={Stethoscope}>
          <p className="text-sm leading-6 text-slate-700">
            {data.specialist.complains || "لا توجد شكوى مسجلة"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {data.specialist.externalAppearance.ptosis ? "Ptosis، " : ""}
            {data.specialist.externalAppearance.squint ? "Squint، " : ""}
            {data.specialist.externalAppearance.others || "لا توجد أعراض إضافية"}
          </p>
        </Panel>
        <Panel title="القياسات" subtitle="AutoRef / IOP / Refraction" icon={Activity}>
          <div className="grid gap-2 xl:grid-cols-3" dir="ltr">
            {eyeOrder.map((eye) => (
              <div key={eye} className="rounded-lg border border-slate-200 p-2 text-xs">
                <strong className="block mb-1">{eye.toUpperCase()}</strong>
                <div>UCVA: {data.nursing.ucva[eye] || "—"}</div>
                <div>IOP: {data.nursing.iop[eye] || "—"}</div>
                <div>AutoRef: {data.nursing.autoref[eye].s || "—"} / {data.nursing.autoref[eye].c || "—"} / {data.nursing.autoref[eye].a || "—"}</div>
                <div>BCVA: {data.specialist.bcva[eye] || "—"}</div>
              </div>
            ))}
            <div className="rounded-lg border border-slate-200 p-2 text-xs" dir="ltr">
              Reading: {data.specialist.reading || "—"}
            </div>
          </div>
        </Panel>
        <Panel title="الفحص والتشخيص" icon={ClipboardList}>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <ReadonlySummary title="Muscle action">{data.specialist.muscleAction}</ReadonlySummary>
            <ReadonlySummary title="Fundus">{data.specialist.fundus}</ReadonlySummary>
            <ReadonlySummary title="Diseases">{data.specialist.diseases || "—"}</ReadonlySummary>
            <ReadonlySummary title="Diagnosis">{data.consultant.diagnosis || data.specialist.diagnosis || "—"}</ReadonlySummary>
          </div>
        </Panel>
        {hasPentacam ? (
          <Panel title="Pentacam" subtitle="يظهر عند وجود البيانات" icon={ScanLine}>
            <div className="grid gap-2 sm:grid-cols-2" dir="ltr">
              {eyeOrder.map((eye) => (
                <div key={eye} className="rounded-lg border border-slate-200 p-2 text-xs">
                  <strong className="block mb-1">{eye.toUpperCase()}</strong>
                  <div>K1: {data.pentacam[eye].k1 || "—"}</div>
                  <div>K2: {data.pentacam[eye].k2 || "—"}</div>
                  <div>Axis: {data.pentacam[eye].axis || "—"}</div>
                  <div>Thinnest: {data.pentacam[eye].thinnestLocation || "—"}</div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
        {data.specialist.testsRays || data.consultant.testsRays ? (
          <Panel title="تحاليل وأشعة" icon={FileText}>
            <p className="text-sm leading-6 text-slate-700">
              {data.consultant.testsRays || data.specialist.testsRays}
            </p>
          </Panel>
        ) : null}
        {data.specialist.prescription || data.consultant.prescription ? (
          <Panel title="الروشتة" icon={ClipboardList}>
            <p className="text-sm leading-6 text-slate-700">
              {data.consultant.prescription || data.specialist.prescription}
            </p>
          </Panel>
        ) : null}
      </div>
    );

    const sectionContent: Record<WorkflowSectionId, ReactNode> = {
      measurements: renderNursingPanel(),
      examination: (
        <div className="grid gap-3 lg:grid-cols-2" dir="rtl">
          <Panel title="Complains" subtitle="الشكوى والأعراض" icon={Stethoscope} active>
            <Field label="Complains" value={data.specialist.complains} onChange={(value) => update("specialist", { ...data.specialist, complains: value })} />
          </Panel>
          <Panel title="Examination" icon={ClipboardList}>
            <div className="grid gap-2 sm:grid-cols-2" dir="ltr">
              <label className="flex items-center gap-2 rounded-lg border p-2 text-xs"><Checkbox checked={data.specialist.externalAppearance.ptosis} onCheckedChange={(checked) => update("specialist", { ...data.specialist, externalAppearance: { ...data.specialist.externalAppearance, ptosis: checked === true } })} />Ptosis</label>
              <label className="flex items-center gap-2 rounded-lg border p-2 text-xs"><Checkbox checked={data.specialist.externalAppearance.squint} onCheckedChange={(checked) => update("specialist", { ...data.specialist, externalAppearance: { ...data.specialist.externalAppearance, squint: checked === true } })} />Squint</label>
            </div>
            <Field label="Others" value={data.specialist.externalAppearance.others} onChange={(value) => update("specialist", { ...data.specialist, externalAppearance: { ...data.specialist.externalAppearance, others: value } })} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2" dir="ltr">
              <SelectBox label="Muscle action" value={data.specialist.muscleAction} options={["Normal", "Abnormal"]} onChange={(value) => update("specialist", { ...data.specialist, muscleAction: value as "Normal" | "Abnormal" })} ariaLabel="Muscle action" />
              <SelectBox label="Fundus" value={data.specialist.fundus} options={["Normal", "Abnormal"]} onChange={(value) => update("specialist", { ...data.specialist, fundus: value as "Normal" | "Abnormal" })} ariaLabel="Fundus" />
            </div>
            <Field label="Other abnormalities" value={data.specialist.otherAbnormalities} onChange={(value) => update("specialist", { ...data.specialist, otherAbnormalities: value })} />
          </Panel>
        </div>
      ),
      diagnosis: (
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="Diseases" icon={ClipboardList}><Field label="Diseases" value={data.specialist.diseases} onChange={(value) => update("specialist", { ...data.specialist, diseases: value })} /></Panel>
          <Panel title="Diagnosis" icon={ClipboardList}><Field label="Diagnosis" value={data.consultant.diagnosis || data.specialist.diagnosis} onChange={(value) => update("consultant", { ...data.consultant, diagnosis: value })} /></Panel>
        </div>
      ),
      pentacam: (
        <Panel title="Pentacam" subtitle="اختياري — Text Inputs" icon={ScanLine} active>
          <div className="grid gap-3 lg:grid-cols-2" dir="ltr">
            {eyeOrder.map((eye) => (
              <div key={eye} className="rounded-xl border border-slate-200 p-3"><h3 className="mb-2 font-bold">{eye.toUpperCase()}</h3><div className="grid grid-cols-2 gap-2"><Field label="K1" value={data.pentacam[eye].k1} onChange={(value) => update("pentacam", { ...data.pentacam, [eye]: { ...data.pentacam[eye], k1: value } })} dir="ltr" /><Field label="K2" value={data.pentacam[eye].k2} onChange={(value) => update("pentacam", { ...data.pentacam, [eye]: { ...data.pentacam[eye], k2: value } })} dir="ltr" /><Field label="Axis" value={data.pentacam[eye].axis} onChange={(value) => update("pentacam", { ...data.pentacam, [eye]: { ...data.pentacam[eye], axis: value } })} dir="ltr" /><Field label="Thinnest Location" value={data.pentacam[eye].thinnestLocation} onChange={(value) => update("pentacam", { ...data.pentacam, [eye]: { ...data.pentacam[eye], thinnestLocation: value } })} dir="ltr" /></div></div>
            ))}
          </div>
        </Panel>
      ),
      tests: (
        <Panel title="تحاليل وأشعة" subtitle="اختياري" icon={FileText} active><Field label="Tests & Rays" value={data.consultant.testsRays || data.specialist.testsRays} onChange={(value) => update("consultant", { ...data.consultant, testsRays: value })} /></Panel>
      ),
      prescription: (
        <Panel title="الروشتة" subtitle="اختياري" icon={ClipboardList} active><Field label="Prescription" value={data.consultant.prescription || data.specialist.prescription} onChange={(value) => update("consultant", { ...data.consultant, prescription: value })} /></Panel>
      ),
      final: renderDigitalFinal(),
    };

    return (
      <div className="grid gap-3 lg:h-[calc(100vh-260px)] lg:grid-cols-[auto_minmax(0,1fr)] lg:overflow-hidden">
        <aside className={`rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-all ${sidebarOpen ? "lg:w-52" : "lg:w-14"}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            {sidebarOpen ? <span className="text-xs font-bold text-slate-700">أقسام الزيارة</span> : null}
            <Button type="button" variant="ghost" size="icon" onClick={() => setSidebarOpen((open) => !open)} aria-label="فتح أو قفل القائمة">{sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</Button>
          </div>
          <div className="space-y-1">
            {tabs.map((tab) => { const Icon = tab.icon; const active = activeSection === tab.id; return <div key={tab.id} className="flex items-center gap-1"><Button type="button" variant={active ? "default" : "ghost"} className={`${sidebarOpen ? "w-full justify-start gap-2" : "w-full justify-center"} ${active ? "bg-blue-900 text-white" : ""}`} onClick={() => { setActiveSection(tab.id); setEmbeddedSheetPath(null); }} title={tab.label}><Icon className="h-4 w-4 shrink-0" />{sidebarOpen ? <span className="truncate">{tab.label}</span> : null}</Button>{sidebarOpen && tab.optional ? <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOptional(tab.id)} aria-label={`إغلاق ${tab.label}`}><X className="h-3.5 w-3.5" /></Button> : null}</div>; })}
          </div>
          {sidebarOpen ? <div className="mt-3 border-t border-slate-100 pt-2"><Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => { const next = workflowSectionMeta.find((item) => item.optional && !optionalSet.has(item.id)); if (next) addOptional(next.id); else toast.info("كل الأقسام الاختيارية مضافة"); }}><Plus className="h-4 w-4" />إضافة قسم</Button></div> : null}
        </aside>
        <main className="min-w-0 overflow-y-auto rounded-xl border border-slate-200 bg-[#f7f9fc] p-3 lg:overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-lg font-black">{workflowSectionMeta.find((item) => item.id === activeSection)?.label}</h2><p className="text-xs text-slate-500">{selectedLivePatient.fullName ?? "المريض المحدد"}</p></div><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">قراءة فقط</Badge></div>
          <div className="lg:h-[calc(100%-64px)] lg:overflow-hidden">{sectionContent[activeSection]}</div>
        </main>
      </div>
    );
  };
'''
path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
print('replaced renderer')
nd = Path('client/src/pages/WorkflowPrototypeLive.tsx').read_text(encoding='utf-8')
print('renderer_present=', 'const renderLiveWorkspace = () =>' in nd, 'final_tab=', 'الشيت النهائي' in nd)
