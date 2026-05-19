# Task: Verify / render a DOCX (DOCX → PNG)

## Why this exists
DOCX editing tools can "succeed" while the visual output is broken. Always verify by rendering.

## Preferred: use the packaged renderer
This uses artifact-tool and produces `page-<N>.png` images. These PNGs satisfy the visual QA gate for this skill.

```bash
python render_docx.py /mnt/data/input.docx --output_dir /mnt/data/out --renderer artifact-tool
# For debugging artifact-tool failures:
python render_docx.py /mnt/data/input.docx --output_dir /mnt/data/out --verbose --renderer artifact-tool
# Optional LibreOffice cross-check with <input_stem>.pdf:
python render_docx.py /mnt/data/input.docx --output_dir /mnt/data/out_lo --renderer libreoffice --emit_pdf
```

## Optional manual LibreOffice cross-check
Use a unique LibreOffice profile (permission/locking issues are common in containers):

```bash
OUTDIR=/mnt/data/out
INPUT=/mnt/data/input.docx
BASENAME=$(basename "$INPUT" .docx)
LO_PROFILE=/mnt/data/.lo_profile_${BASENAME}_$$
mkdir -p "$OUTDIR" "$LO_PROFILE"

HOME="$LO_PROFILE" soffice --headless -env:UserInstallation=file://"$LO_PROFILE" \
  --convert-to pdf --outdir "$OUTDIR" "$INPUT"

pdftoppm -png "$OUTDIR/$BASENAME.pdf" "$OUTDIR/$BASENAME"
```

## Success criteria
- PNGs exist for each page
- Spot-check page count and representative pages

**Note:** LibreOffice sometimes prints scary-looking stderr (e.g., `error : Unknown IO error`) even when output is correct. Treat the conversion as successful if the PNGs exist and look correct (and if you used `--emit_pdf`, the PDF exists and is non-empty).

## What to check in the PNGs
- clipped text (especially headings and table cells)
- overlapping objects
- broken tables (wrapping, misalignment, missing borders)
- unexpected font substitution
- header/footer alignment and page breaks

## Caveats
- **Comments often don’t render** in page images. Use structural checks for comments.
- **Field codes (page numbers, TOC)** may show placeholder values in some renders. If the user needs proof, re-check in Word or update fields before final render.
- **Multi-section docs** can have different page sizes/orientations; DPI is computed from the first section by default. If some pages look scaled oddly, use `--dpi` to override.

## Delivery checklist
- Final DOCX is clean (no internal citation tokens, no placeholder text)
- Final render looks correct on all pages
- `/mnt/data` contains only final outputs (unless user asked for intermediates)
