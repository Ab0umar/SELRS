#!/usr/bin/env python3
"""Fix visual design changes for 8 sheet/print pages."""

from pathlib import Path

ROOT = Path("D:/selrs.cc")


def fix_gradient_bar_before_style(content: str) -> str:
    """Move gradient bar before <style> block if it's after."""
    # Pattern: <style>{`...`}</style> followed by gradient bar
    # We want: gradient bar followed by <style>{`...`}</style>
    if '<div className="h-0.5 selrs-gradient-bar shrink-0" />' not in content:
        return content

    # Find the style block and gradient bar
    style_start = content.find('<style>{`')
    if style_start == -1:
        return content

    style_end_marker = '`}</style>'
    style_end = content.find(style_end_marker, style_start)
    if style_end == -1:
        return content

    style_end_pos = style_end + len(style_end_marker)

    # Check if gradient bar comes right after style block
    after_style = content[style_end_pos:style_end_pos + 200].strip()
    gradient_marker = '<div className="h-0.5 selrs-gradient-bar shrink-0" />'
    if not after_style.startswith(gradient_marker):
        return content

    # Extract the full style block
    full_style_block = content[style_start:style_end_pos]

    # Find the gradient bar line
    gradient_start = content.find(gradient_marker, style_end_pos)
    if gradient_start == -1:
        return content
    gradient_end = gradient_start + len(gradient_marker)

    # Remove both from their current positions and re-insert in correct order
    before_style = content[:style_start]
    between = content[style_end_pos:gradient_start]
    after_gradient = content[gradient_end:]

    # Reconstruct: gradient bar before style block
    result = before_style + '\n      ' + gradient_marker + '\n      ' + full_style_block + between + after_gradient
    return result


def replace_header_consultant_followup(content: str) -> str:
    old = '''      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-[120] print:hidden pointer-events-auto">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="min-w-0 pointer-events-none">
            <h1 className="text-xl font-bold">متابعات الاستشاري</h1>
            <p className="text-sm opacity-90 truncate">{patientName}</p>
          </div>
          <div className="flex gap-1 relative z-[130] pointer-events-auto shrink-0">
            <div className="w-72 max-w-[45vw]">
              <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} />
            </div>
            <Button type="button" variant="default" size="sm" onClick={handleSaveFollowup} disabled={saveFollowupSheetMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">{saveFollowupSheetMutation.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLocation(`/sheets/consultant/${initialPatientId ?? ""}`)} className="text-primary-foreground border-primary-foreground hover:bg-primary/80">الاستمارة</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void printOrExportPdf(`consultant-followup-${initialPatientId ?? "sheet"}.pdf`)} className="text-primary-foreground border-primary-foreground hover:bg-primary/80"><Printer className="h-4 w-4 mr-2"/>طباعة</Button>
          </div>
        </div>
      </header>'''

    new = '''      <div className="h-0.5 selrs-gradient-bar shrink-0" />
      <div className="print:hidden">
        <PageHeader
          title="متابعات الاستشاري"
          subtitle={patientName}
          icon={<UserRound className="h-5 w-5" />}
          action={
            <div className="flex gap-1 shrink-0">
              <div className="w-72 max-w-[45vw]">
                <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} />
              </div>
              <Button type="button" variant="default" size="sm" onClick={handleSaveFollowup} disabled={saveFollowupSheetMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">{saveFollowupSheetMutation.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setLocation(`/sheets/consultant/${initialPatientId ?? ""}`)}>الاستمارة</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void printOrExportPdf(`consultant-followup-${initialPatientId ?? "sheet"}.pdf`)}><Printer className="h-4 w-4 mr-2"/>طباعة</Button>
            </div>
          }
        />
      </div>'''

    if old in content:
        return content.replace(old, new)
    return content


def replace_header_lasik_followup(content: str) -> str:
    old = '''      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-[120] print:hidden pointer-events-auto">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="min-w-0 pointer-events-none">
            <h1 className="text-xl font-bold">متابعات الليزك</h1>
            <p className="text-sm opacity-90 truncate">{patientName}</p>
          </div>
          <div className="flex gap-1 relative z-[130] pointer-events-auto shrink-0">
            <div className="w-72 max-w-[45vw]">
              <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} />
            </div>
            <Button type="button" variant="default" size="sm" onClick={handleSaveFollowup} disabled={saveFollowupSheetMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">{saveFollowupSheetMutation.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLocation(`/sheets/lasik/${initialPatientId ?? ""}`)} className="text-primary-foreground border-primary-foreground hover:bg-primary/80">الاستمارة</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void printOrExportPdf(`lasik-followup-${initialPatientId ?? "sheet"}.pdf`)} className="text-primary-foreground border-primary-foreground hover:bg-primary/80"><Printer className="h-4 w-4 mr-2"/>طباعة</Button>
          </div>
        </div>
      </header>'''

    new = '''      <div className="h-0.5 selrs-gradient-bar shrink-0" />
      <div className="print:hidden">
        <PageHeader
          title="متابعات الليزك"
          subtitle={patientName}
          icon={<Microscope className="h-5 w-5" />}
          action={
            <div className="flex gap-1 shrink-0">
              <div className="w-72 max-w-[45vw]">
                <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} />
              </div>
              <Button type="button" variant="default" size="sm" onClick={handleSaveFollowup} disabled={saveFollowupSheetMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">{saveFollowupSheetMutation.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setLocation(`/sheets/lasik/${initialPatientId ?? ""}`)}>الاستمارة</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void printOrExportPdf(`lasik-followup-${initialPatientId ?? "sheet"}.pdf`)}><Printer className="h-4 w-4 mr-2"/>طباعة</Button>
            </div>
          }
        />
      </div>'''

    if old in content:
        return content.replace(old, new)
    return content


def main():
    files = {
        "client/src/pages/ConsultantSheet.tsx": fix_gradient_bar_before_style,
        "client/src/pages/ConsultantFollowupPage.tsx": replace_header_consultant_followup,
        "client/src/pages/SpecialistSheet.tsx": fix_gradient_bar_before_style,
        "client/src/pages/LasikExamSheet.tsx": fix_gradient_bar_before_style,
        "client/src/pages/LasikFollowupPage.tsx": replace_header_lasik_followup,
        "client/src/pages/ExternalOperationSheet.tsx": fix_gradient_bar_before_style,
    }

    for rel_path, transform in files.items():
        path = ROOT / rel_path
        content = path.read_text(encoding="utf-8-sig")
        original = content
        content = transform(content)
        if content != original:
            path.write_text(content, encoding="utf-8")
            print(f"[OK] Updated {rel_path}")
        else:
            print(f"[SKIP] No changes for {rel_path}")


if __name__ == "__main__":
    main()
