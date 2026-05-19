# Troubleshooting: Optional LibreOffice headless rendering

## Symptom: `soffice` hangs, times out, or errors in a container
This is commonly caused by LibreOffice failing to create/lock its user profile, or attempting to write config/cache under a non-writable `HOME`.

## Recommended path: use artifact-tool
For `documents`, LibreOffice is optional. Use the canonical helper with the artifact-tool renderer:

```bash
python render_docx.py /mnt/data/input.docx --output_dir /mnt/data/out --renderer artifact-tool
# If you're debugging a artifact-tool render failure:
python render_docx.py /mnt/data/input.docx --output_dir /mnt/data/out --verbose --renderer artifact-tool
```

If artifact-tool fails, fix artifact-tool rendering before delivery. Do not ship from structural DOCX inspection alone.

## LibreOffice cross-check: profile + writable HOME
If you explicitly need a LibreOffice cross-check, use a unique profile:

```bash
OUTDIR=/mnt/data/out
INPUT=/mnt/data/input.docx
BASENAME=$(basename "$INPUT" .docx)
LO_PROFILE=/mnt/data/.lo_profile_${BASENAME}_$$
mkdir -p "$OUTDIR" "$LO_PROFILE"

HOME="$LO_PROFILE" soffice --headless -env:UserInstallation=file://"$LO_PROFILE" \
  --convert-to pdf --outdir "$OUTDIR" "$INPUT"
```

Or use the wrapper:

```bash
python render_docx.py /mnt/data/input.docx --output_dir /mnt/data/out_lo --renderer libreoffice --emit_pdf
```

## About scary stderr on "successful" conversions
LibreOffice sometimes prints scary-looking messages (notably `error : Unknown IO error`) even when the output PDF is correct.

Prefer these success criteria over stderr:
- command completes
- downstream PNGs exist and look correct

## If you still get weird behavior
- Ensure the profile directory is unique per process (use `$$` or a uuid)
- Delete stale profiles between runs
- Prefer `/mnt/data` over `/tmp` if you suspect permission sandboxing
- Return to `--renderer artifact-tool` if LibreOffice is unavailable or unreliable
