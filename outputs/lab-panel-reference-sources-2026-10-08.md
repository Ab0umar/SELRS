# Named laboratory reference entries — verified 2026-10-08

Reference examples are not universal WHO normal ranges. Local laboratory, assay, age, sex and pregnancy context remain controlling. Names below explicitly encode populations because the proposed referenceRanges structure has no separate population fields. Null numerical bounds plus explicit text must preserve strict inequalities; do not turn `<100` into an inclusive `max:100` flag.

## CBC

Source: [Mayo CBC with differential](https://www.mayocliniclabs.com/test-catalog/overview/9109), adult entries following pediatric 15–17-year strata. These are adult examples, not pregnancy or child intervals. No invented pooled-sex ranges.

| name | min | max | unit |
| --- | ---: | ---: | --- |
| WBC — adults | 3.4 | 9.6 | ×10^9/L |
| RBC — adult male | 4.35 | 5.65 | ×10^12/L |
| RBC — adult female | 3.92 | 5.13 | ×10^12/L |
| Hemoglobin — adult male | 13.2 | 16.6 | g/dL |
| Hemoglobin — adult female | 11.6 | 15.0 | g/dL |
| Hematocrit — adult male | 38.3 | 48.6 | % |
| Hematocrit — adult female | 35.5 | 44.9 | % |
| MCV — adult male | 78.2 | 97.9 | fL |
| MCV — adult female | 78.2 | 97.93 | fL |
| Platelets — adult male | 135 | 317 | ×10^9/L |
| Platelets — adult female | 157 | 371 | ×10^9/L |
| RDW — adult male | 11.8 | 14.5 | % |
| RDW — adult female | 12.2 | 16.1 | % |
| Neutrophils — adults, absolute | 1.56 | 6.45 | ×10^9/L |
| Lymphocytes — adults, absolute | 0.95 | 3.07 | ×10^9/L |
| Monocytes — adults, absolute | 0.26 | 0.81 | ×10^9/L |
| Eosinophils — adults, absolute | 0.03 | 0.48 | ×10^9/L |
| Basophils — adults, absolute | 0.01 | 0.08 | ×10^9/L |

Important: female MCV upper bound is literally **97.93** in the current Mayo page, not rounded/invented 97.9. MCH/MCHC were not found in Mayo page reference list. [UCSF RBC indices](https://www.ucsfhealth.org/care/medical-tests/rbc-indices), reviewed 2026-02-27, publishes MCH female 26–33 pg/cell, male 27–33 pg/cell and MCHC 32–36 g/dL. It labels these common examples that can vary by laboratory, not Mayo-derived assay values. If included, source them separately and label adult illustrative values; do not imply all CBC entries came from Mayo. The UCSF page does not explicitly state an age cutoff for its examples, so these are not independently age-validated pediatric/adult partitions.

## Lipid Profile

Source: [Mayo lipid panel](https://www.mayocliniclabs.com/test-catalog/overview/616696). These are **cardiovascular-risk/desirable thresholds**, not population normal intervals or individual treatment goals. Source adult scope is ≥18 years. Lipid targets must consider age, sex, smoking, hypertension, diabetes and established cardiovascular disease.

| name | min | max | text | unit |
| --- | --- | --- | --- | --- |
| Total cholesterol — adults ≥18, desirable | null | null | <200 | mg/dL |
| Triglycerides — adults ≥18, source normal category | null | null | <150 | mg/dL |
| HDL cholesterol — adult male ≥18 | 40 | null | ≥40 | mg/dL |
| HDL cholesterol — adult female ≥18 | 50 | null | ≥50 | mg/dL |
| LDL cholesterol — adults ≥18, desirable | null | null | <100; individual goal depends on cardiovascular risk | mg/dL |
| Non-HDL cholesterol — adults ≥18, desirable | null | null | <130; individual goal depends on cardiovascular risk | mg/dL |

Do not use adult limits for children; source has separate 2–17-year categories.

## PT / INR

[Mayo PTTP](https://prd1.mayocliniclabs.com/test-catalog/overview/40934), corroborated [official PTTP PDF](https://www.mayocliniclabs.com/test-catalog/download-setup?format=pdf&unit_code=40934): named entry `PT — non-anticoagulated reference`, min 9.4 max 12.5 unit s; `INR — reference, not warfarin target`, min 0.9 max 1.1 unit ratio. Assay-specific PT; warfarin 2–3 is a therapeutic target and must not replace healthy reference. Avoid child/general coagulation pooling.

## Kidney panel / creatinine

[Mayo creatinine](https://www.mayocliniclabs.com/test-catalog/overview/48216), also [Mayo serum creatinine within CRCL](https://www.mayocliniclabs.com/test-catalog/Overview/615813): `Creatinine — adult male` min 0.74 max 1.35 mg/dL; `Creatinine — adult female` min 0.59 max 1.04 mg/dL. Source actual boundaries male ≥15, female ≥16; restricting to adults is conservative and leaves children/pregnancy without an assumed interval.

[Oxford University Hospitals urea](https://www.ouh.nhs.uk/biochemistry/tests/tests-catalogue/urea/): `Urea — adults ≥18` min 2.5 max 7.8 mmol/L. Use this with male/female creatinine as three separate named entries for `Serum Urea & Creatinine` panel. Never assign BUN mg/dL numbers to full urea; units/analytes differ.

## TSH

[Mayo STSH setup PDF](https://www.mayocliniclabs.com/api/sitecore/testcatalog/TestCatalogSetupPDF?testid=800096): `TSH — nonpregnant adults ≥20` min 0.3 max 4.2 mIU/L. Do not silently rename ≥20 to ≥18. Pediatric/teen source 11–19 is 0.5–4.3, pregnancy requires trimester/assay-specific interpretation.

## ESR

Source [UChicago ESR](https://uchicagomedlabs.testcatalog.org/show/ESR-1), capillary photometry Alifax Roller 20PN. Not a generic Westergren interval. No ≥80-year reference published on this page.

| name | min | max | unit |
| --- | ---: | ---: | --- |
| ESR — male 18–44 years | 0 | 15 | mm/h |
| ESR — female 18–44 years | 0 | 20 | mm/h |
| ESR — male 45–49 years | 0 | 22 | mm/h |
| ESR — female 45–49 years | 1 | 39 | mm/h |
| ESR — male 50–54 years | 0 | 25 | mm/h |
| ESR — female 50–54 years | 1 | 41 | mm/h |
| ESR — male 55–59 years | 0 | 28 | mm/h |
| ESR — female 55–59 years | 1 | 44 | mm/h |
| ESR — male 60–64 years | 0 | 33 | mm/h |
| ESR — female 60–64 years | 1 | 47 | mm/h |
| ESR — male 65–69 years | 0 | 35 | mm/h |
| ESR — female 65–69 years | 1 | 50 | mm/h |
| ESR — male 70–79 years | 0 | 38 | mm/h |
| ESR — female 70–79 years | 1 | 53 | mm/h |

Source first strata are 0–44; named adult 18–44 subset avoids implying pediatric generality.

## Qualitative entries and simple analytes

Use min/max null, text `Negative / nonreactive` for qualitative screening; no universal numerical index bounds.

- [Mayo ANA ELISA](https://prd1.mayocliniclabs.com/test-catalog/overview/9026): negative ≤1.0 U; [Mayo ANA IFA](https://prd1.mayocliniclabs.com/test-catalog/overview/65161): negative <1:80. Generic ANA: name `ANA — method-specific`, text `Negative; cutoff depends on IFA/ELISA method` rather than choosing one assay.
- [Mayo HBsAg screening](https://microbiology.testcatalog.org/show/HBGSN): negative. Early/window infection can be negative; reactive screening needs confirmation. Not anti-HBs.
- [Mayo HCV antibody screen](https://www.mayocliniclabs.com/test-catalog/Overview/113122): negative. Reactive screen needs RNA; antibody does not establish active versus resolved infection.
- [Mayo HIV screening](https://prd1.mayocliniclabs.com/test-catalog/Overview/620858): negative. Reactive is preliminary; negative does not rule out acute/window infection.
- [Mayo standard CRP](https://prd1.mayocliniclabs.com/test-catalog/Overview/800164): text `<5.0`, mg/L, strict upper threshold. Not hsCRP risk categories.
- [Mayo RF](https://www.mayocliniclabs.com/test-catalog/overview/603415): text `<15`, IU/mL, strict upper threshold; not diagnostic alone.

No database or production source changes made by this research task.
