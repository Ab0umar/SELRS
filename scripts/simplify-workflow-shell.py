from pathlib import Path

path = Path('client/src/pages/WorkflowPrototypeLive.tsx')
text = path.read_text(encoding='utf-8')

header_start = text.index('      <header className="sticky top-0')
header_end = text.index('      </header>', header_start) + len('      </header>')
header = '''      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3">
          <p className="font-bold text-blue-900">SELRS — مرضى اليوم</p>
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            قراءة فقط
          </Badge>
        </div>
      </header>'''
text = text[:header_start] + header + text[header_end:]

hero_start = text.index('        <div className="flex flex-wrap items-end justify-between gap-3">')
picker_marker = '        {renderLivePatientPicker()}\n'
picker_end = text.index(picker_marker, hero_start) + len(picker_marker)
hero = '''        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-black">مرضى اليوم</h1>
          <span className="text-xs text-slate-500">اختر المريض ثم افتح تاب المرحلة المطلوبة</span>
        </div>
'''
text = text[:hero_start] + hero + picker_marker + text[picker_end:]

summary_start = text.index('        <Card className="border-slate-200 shadow-sm">\n          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">')
tabs_start = text.index('        <div className="overflow-x-auto rounded-xl', summary_start)
text = text[:summary_start] + text[tabs_start:]

grid_start = text.index('        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">')
footer_start = text.index('        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl', grid_start)
worklist = '''        <section className="min-w-0">
          {selectedLivePatient ? renderLiveWorkspace() : null}
        </section>
'''
text = text[:grid_start] + worklist + text[footer_start:]

footer_start = text.index('        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl')
main_end = text.index('      </main>', footer_start)
text = text[:footer_start] + text[main_end:]

path.write_text(text, encoding='utf-8')
print('workflow_shell_simplified')
