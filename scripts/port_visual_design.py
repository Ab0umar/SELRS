#!/usr/bin/env python3
"""Port visual design changes to 8 sheet/print pages."""

import re
from pathlib import Path

ROOT = Path("D:/selrs.cc")

PAGES = {
    "client/src/pages/ConsultantSheet.tsx": {
        "icon": "ClipboardList",
        "title_expr": "consultantTemplate.sheetTitle",
        "subtitle_expr": "formData.patientName",
        "has_sheet_layout": True,
        "has_header": True,
    },
    "client/src/pages/ConsultantFollowupPage.tsx": {
        "icon": "UserRound",
        "title": "متابعات الاستشاري",
        "subtitle_expr": "patientName",
        "has_sheet_layout": True,
        "has_header": True,
    },
    "client/src/pages/SpecialistSheet.tsx": {
        "icon": "Stethoscope",
        "title_expr": "sheetTemplate.sheetTitle",
        "subtitle_expr": "formData.patientName",
        "has_sheet_layout": True,
        "has_header": True,
    },
    "client/src/pages/LasikExamSheet.tsx": {
        "icon": "Microscope",
        "title_expr": "sheetTemplate.sheetTitle",
        "subtitle_expr": "formData.patientName",
        "has_sheet_layout": True,
        "has_header": True,
    },
    "client/src/pages/LasikFollowupPage.tsx": {
        "icon": "Microscope",
        "title": "متابعات الليزك",
        "subtitle_expr": "patientName",
        "has_sheet_layout": True,
        "has_header": True,
    },
    "client/src/pages/PentacamSheet.tsx": {
        "icon": "Scan",
        "title": "البنتاكام",
        "subtitle": "عرض وإدارة ملفات البنتاكام",
        "has_sheet_layout": False,
        "has_header": True,
    },
    "client/src/pages/ExternalOperationSheet.tsx": {
        "icon": "Globe2",
        "title_expr": "sheetTemplate.sheetTitle",
        "subtitle_expr": "formData.patientName",
        "has_sheet_layout": True,
        "has_header": True,
    },
    "client/src/pages/RefractionPage.tsx": {
        "icon": "Eye",
        "title": "روشتة المقاس",
        "subtitle": "تسجيل قياسات الانكسار",
        "has_sheet_layout": False,
        "has_header": False,
    },
}


def add_import(content: str, icon: str | None) -> str:
    """Add PageHeader import and optionally the icon import."""
    # Add PageHeader import after the last existing import
    page_header_import = 'import { PageHeader } from "@/components/shared/PageHeader"'
    if page_header_import in content:
        return content

    # Find the last import line
    lines = content.splitlines()
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("import "):
            last_import_idx = i

    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, page_header_import)
    else:
        lines.insert(0, page_header_import)

    content = "\n".join(lines)

    # Add icon to lucide-react import if needed and not already present
    if icon and f'"{icon}"' not in content:
        # Find lucide-react import and add icon
        pattern = re.compile(r'import \{([^}]*)\} from "lucide-react"')

        def repl(m):
            existing = m.group(1).strip()
            if icon in existing:
                return m.group(0)
            return f'import {{ {existing}, {icon} }} from "lucide-react"'

        content = pattern.sub(repl, content)

    return content


def build_page_header(config: dict) -> str:
    icon = config.get("icon")
    title_expr = config.get("title_expr")
    subtitle_expr = config.get("subtitle_expr")
    title = config.get("title")
    subtitle = config.get("subtitle")

    parts = ['      <PageHeader']
    if title_expr:
        parts.append(f'        title={{{title_expr}}}')
    else:
        parts.append(f'        title="{title}"')
    if subtitle_expr:
        parts.append(f'        subtitle={{{subtitle_expr}}}')
    elif subtitle:
        parts.append(f'        subtitle="{subtitle}"')
    if icon:
        parts.append(f'        icon={{<{icon} className="h-5 w-5" />}}')
    parts.append('      />')
    return "\n".join(parts)


def process_file(rel_path: str, config: dict) -> None:
    path = ROOT / rel_path
    content = path.read_text(encoding="utf-8-sig")
    original = content

    # 1. Add imports
    content = add_import(content, config.get("icon"))

    # 2. Add gradient bar and PageHeader
    has_sheet_layout = config["has_sheet_layout"]
    has_header = config["has_header"]

    if has_sheet_layout and has_header:
        # Replace the old <header>...</header> block with PageHeader
        # The header is typically:
        # <header className={`... print:hidden ...`}>...</header>
        # We replace it with a print-hidden div containing PageHeader

        # Strategy: find the header block and replace it
        header_pattern = re.compile(
            r'      \{\/\* Header \*\/\}\n'
            r'      <header[^>]*className=\{`[^`]*print:hidden[^`]*`\}[^>]*>.*?'
            r'      </header>',
            re.DOTALL,
        )

        if not header_pattern.search(content):
            # Try without the {/* Header */} comment
            header_pattern = re.compile(
                r'      <header[^>]*className=\{`[^`]*print:hidden[^`]*`\}[^>]*>.*?'
                r'      </header>',
                re.DOTALL,
            )

        if header_pattern.search(content):
            page_header = build_page_header(config)
            replacement = f'      <div className="h-0.5 selrs-gradient-bar shrink-0" />\n      <div className="print:hidden">\n{page_header}\n      </div>'
            content = header_pattern.sub(replacement, content)
        else:
            print(f"  [!] Could not find header in {rel_path}")
    elif not has_sheet_layout and has_header:
        # PentacamSheet: replace the header div block
        if "PentacamSheet" in rel_path:
            old = '''    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => goBack()}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </button>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">البنتاكام</h1>
            <p className="text-slate-600 mt-1">عرض وإدارة ملفات البنتاكام</p>
          </div>
        </div>'''
            new = '''    <div className="min-h-screen bg-background max-w-[1280px] mx-auto w-full py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="h-0.5 selrs-gradient-bar shrink-0" />
        <PageHeader
          title="البنتاكام"
          subtitle="عرض وإدارة ملفات البنتاكام"
          icon={<Scan className="h-5 w-5" />}
        />'''
            if old in content:
                content = content.replace(old, new)
            else:
                print(f"  [!] Could not find Pentacam header block")
    elif not has_sheet_layout and not has_header:
        # RefractionPage
        old = '''  return (
    <div data-mobile-pdf-root className={`container mx-auto ${printMode.printView ? "px-3 py-3" : "px-4 py-6"}`}>
      {printMode.printView ? ('''
        new = '''  return (
    <div data-mobile-pdf-root className={`max-w-[1280px] mx-auto w-full ${printMode.printView ? "px-3 py-3" : "px-4 py-6"}`}>
      <div className="h-0.5 selrs-gradient-bar shrink-0" />
      <div className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
        <PageHeader
          title="روشتة المقاس"
          subtitle="تسجيل قياسات الانكسار"
          icon={<Eye className="h-5 w-5" />}
        />
      </div>
      {printMode.printView ? ('''
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"  [!] Could not find Refraction outer div")

        # Also remove the Back button from the action row
        old_back = '''          <div className="flex gap-2 refraction-no-print">
            <Button type="button" onClick={handleSave} disabled={saveSheetMutation.isPending}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => goBack()}
            >
              Back
            </Button>
          </div>'''
        new_back = '''          <div className="flex gap-2 refraction-no-print">
            <Button type="button" onClick={handleSave} disabled={saveSheetMutation.isPending}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              Print
            </Button>
          </div>'''
        if old_back in content:
            content = content.replace(old_back, new_back)
        else:
            print(f"  [!] Could not find Refraction back button block")

    if content != original:
        path.write_text(content, encoding="utf-8")
        print(f"  [OK] Updated {rel_path}")
    else:
        print(f"  [SKIP] No changes for {rel_path}")


def main():
    for rel_path, config in PAGES.items():
        print(f"Processing {rel_path} ...")
        process_file(rel_path, config)


if __name__ == "__main__":
    main()
