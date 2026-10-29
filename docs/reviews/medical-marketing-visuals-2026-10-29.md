# Medical marketing images — 2026-10-29

## Approved placement revision

Doctor artwork also receives a restrained navy/gold edge matching the supplied logo, with a light clinical background, echoing the center's branded artwork treatment. The medical subject stays visible and the logo stays inside the artwork. Generation instructions no longer mention a separate header or page-name text.

The subsequent user request supersedes the external-header layout below: logos now sit inside the top-right image corner, on the same circular white backing for both page roles. No page name is rendered on the image; original dimensions are preserved. Non-logo artwork below the corner is verified unchanged. Cached output uses `branded-v3`; its pristine source is retained separately for changing page identity without stacking logos. Previous v2 headers are removed before the new overlay is applied. Four previews were recomposed from saved originals with zero additional AI requests. Contact details remain in the caption. Targeted composition/publication tests, typecheck and production build were rerun for this revision; production still needs the manual service restart.

## Scope and behavior

User direction: topic-specific medical illustrations or original equipment photographs; no women; original logo for the selected page; address and phone in the image or caption. The implementation puts verified page contact details in the publication caption and the approved original logo in a separate white image header.

Previous dry-eye prompts requested a decorative tear; corneal-thickness prompts requested a probe near the eye; general instructions forced cinematic photographs. Four regression assertions failed before the correction. A shared visual catalog now covers all 23 scheduled topics with anatomy, subject, and exclusions. Old image suggestions cannot override the clinical direction. Known medical topics do not feed old logo/reference images into the generation request.

The supplied MG doctor logo is preserved at `client/public/marketing/doctor-logo.png`. The center uses `client/public/center-logo.png`. Native Sharp 0.35.4 composes these assets outside the artwork. Tests compare recovered artwork pixels and the normalized doctor logo. Changing targets removes the previously composed header before adding the correct one.

Public Meta page name, street and phone are resolved for the exact connected page, cached for six hours, and checked against the publishing claim. Missing contact data fails before Facebook submission and releases the claim. No contacts are invented or copied across roles. Caption preparation is idempotent.

Equipment selection is available in `/ai/marketing/brand`, separately for each page and device. Only references owned by that page can be selected. Without an original photograph, equipment topics use an educational diagram; generated machines are not presented as real photographs. Original-photo image actions bypass paid image generation. Their request UUID is accepted transactionally with the post update; retrying an accepted request does not dispatch a paid provider after settings change. Full Manus content tasks retain their existing task costs.

Paid generated output is persisted before branding so a composition failure does not discard an already paid result. Existing publication uncertainty and request ownership protections remain in place. No new migration is required: assignments use independent systemSettings keys per role/device.

## Real-provider evidence

Six real Gemini image requests completed using synthetic public educational topics, with normal application budget accounting. No patient data, draft creation or Facebook publication was involved. Initial dry-eye artwork was refined to isolate the tear film. The initial generated Pentacam machine was rejected; the final fallback is a corneal mapping diagram. Initial corner-logo placement obscured artwork and was replaced with the external header without another AI request.

Reviewed local outputs under `outputs/medical-marketing-visuals/`:

- `final-dry-eye.png`: center branding, tear-film illustration.
- `final-corneal-thickness.png`: center branding, corneal illustration.
- `final-cataract.png`: original supplied doctor logo and doctor page name.
- `final-pentacam.png`: educational diagram, not an equipment photograph.

These are marketing illustrations, not a guarantee of diagnostic or anatomical precision. No publishing smoke test was performed.

## Verification

- `pnpm check`: passed; `pnpm build`: passed.
- Targeted backend run: 13 files, 122 tests passed, including actual isolated SQL workflow, original-photo ownership, retry binding, claim release and native image composition.
- Frontend Vitest run: 101 files, 680 tests passed.
- `scripts/verify-equipment-library-ui.ts`: six browser cases, light/dark at 360/768/1440 px; page isolation, save/restore, no overflow, no page errors and no provider dispatch passed.
- `pnpm db:sync-check`: passed, no missing in-repository tables. No schema writes.
- Graph refreshed with `graphify update .`.

Antislop delivery gate: PASS for existing design controls; PASS for responsive layouts across the six browser cases; PASS for state/error/page ownership behavior; PASS for original brand identity and artwork preservation. DESIGN.md was read; energy/rhythm/motion remain 1/1/1. Clean-code and test-guard review focused on bounded interfaces, provider billing, ownership and meaningful negative cases.

Source and production bundle are prepared. The running SRV100 backend still requires an authorized manual service restart; production activation and live publication are unverified. Automatic approval previously rejected elevated service control, so it was not bypassed.

## Primary references for visual direction

- [NEI: dry eye](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/dry-eye)
- [NEI: cataracts](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/cataracts/cataracts-and-eye)
- [NEI: refractive surgery](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/refractive-errors/surgery-refractive-errors)
- [AAO: PRK](https://www.aao.org/eye-health/treatments/photorefractive-keratectomy-prk)
- [FDA: phakic lenses](https://www.fda.gov/medical-devices/phakic-intraocular-lenses/what-are-phakic-lenses)
- [OCULUS: Pentacam](https://www.oculus.de/uploads/media/pentacam_neuhann_english.pdf)
- [Sharp: composite](https://sharp.pixelplumbing.com/api-composite/)
