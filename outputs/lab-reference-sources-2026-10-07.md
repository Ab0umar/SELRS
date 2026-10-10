# Laboratory reference candidates — 2026-10-07

These are performing-laboratory reference examples, NOT universal WHO ranges. They need reconciliation with the local laboratory's assay, units, population and reporting. Adult examples below must not automatically apply to children or pregnancy. Numeric limits remain unset for qualitative/age- or sex-specific catalog entries unless the application can represent the relevant distinctions. Each proposed normalRange string is below 255 characters.

| Catalog analyte | Candidate normalRange text | Source and restrictions |
| --- | --- | --- |
| ESR | Adults 18–44 y: male 0–15, female 0–20 mm/h; ≥45 y: age/sex and method-specific laboratory interval. | [UChicago Medicine ESR](https://uchicagomedlabs.testcatalog.org/show/ESR-1). Alifax capillary photometry; older-age strata vary substantially, so no blanket adult upper bound. |
| CRP | Standard CRP: <5.0 mg/L (not hs-CRP cardiovascular risk categories). | [Mayo CRP](https://prd1.mayocliniclabs.com/test-catalog/Overview/800164); [Mayo CRP definition](https://www.mayocliniclabs.com/api/sitecore/TestCatalog/DownloadTestCatalog?testId=9731). Standard inflammatory marker, nonspecific. Do not apply hsCRP <1/1–3/>3 risk bands. |
| RF | <15 IU/mL; assay-specific. | [Mayo RHUT](https://www.mayocliniclabs.com/test-catalog/overview/603415). Turbidimetry; positive results alone do not diagnose RA; RF isotypes are separate tests with separate units/thresholds. |
| TSH | Nonpregnant adults ≥20 y: 0.3–4.2 mIU/L; pregnancy/younger ages require separate intervals. | [Mayo STSH setup PDF](https://www.mayocliniclabs.com/api/sitecore/testcatalog/TestCatalogSetupPDF?testid=800096). Explicit source age boundary is ≥20, NOT ≥18. |
| Creatinine | Adults: male 0.74–1.35 mg/dL; female 0.59–1.04 mg/dL; use age/sex and local assay interval. | [Mayo CRTS1](https://www.mayocliniclabs.com/test-catalog/overview/48216); [Mayo CRCL serum reference](https://www.mayocliniclabs.com/test-catalog/Overview/615813). CRTS1 uses male ≥15 and female ≥16 thresholds; restricting candidate to adults avoids applying pediatric values. |
| Urea | Adults ≥18 y: 2.5–7.8 mmol/L (urea, not BUN). | [Oxford University Hospitals urea](https://www.ouh.nhs.uk/biochemistry/tests/tests-catalogue/urea/), reviewed 2025-04-23; corroborated [North West London Pathology](https://www.nwlpathology.nhs.uk/test/urea/). Use mmol/L; do not silently copy BUN mg/dL numbers into urea. |
| BUN, if separately present | Adults ≥18 y: male 8–24 mg/dL; female 6–21 mg/dL (BUN). | [Mayo BUN](https://www.mayocliniclabs.com/test-catalog/overview/81793). Although catalog aliases include urea, these mg/dL values measure nitrogen, not full urea mass. |
| PT / INR | PT 9.4–12.5 s; INR 0.9–1.1 (not anticoagulation treatment targets; method-specific). | [Mayo PTTP](https://prd1.mayocliniclabs.com/test-catalog/overview/40934); [Mayo official PTTP PDF](https://www.mayocliniclabs.com/test-catalog/download-setup?format=pdf&unit_code=40934). Warfarin 2–3 is therapeutic, not healthy reference interval. |
| ANA | Negative; numeric cutoff depends on method (IFA titer vs ELISA units). | [Mayo ANA ELISA](https://prd1.mayocliniclabs.com/test-catalog/overview/9026) uses ≤1.0 U; [Mayo ANA IFA](https://prd1.mayocliniclabs.com/test-catalog/overview/65161) uses <1:80. An unspecified ANA catalog entry must not get a universal numeric cutoff. |
| HBsAg | Negative / nonreactive; qualitative screen. | [Mayo HBGSN](https://microbiology.testcatalog.org/show/HBGSN); [official definition PDF](https://www.mayocliniclabs.com/test-catalog/download-setup?format=pdf&unit_code=610466). Do not confuse surface antigen with anti-HBs immune antibody or quantitative HBsAg. Reactive screens need confirmation; negative can occur in early/window infection. |
| HCV Ab | Negative / nonreactive; reactive screen requires HCV RNA assessment. | [Mayo HCSRN](https://www.mayocliniclabs.com/test-catalog/Overview/113122). Negative does not exclude very recent infection; reactive antibody does not distinguish active from resolved infection. |
| HIV screening | Negative / nonreactive; reactive screening result requires confirmatory testing. | [Mayo HIVSS](https://prd1.mayocliniclabs.com/test-catalog/Overview/620858). Qualitative antigen/antibody screen; negative does not exclude acute/window infection. |
| Culture (unspecified specimen) | Specimen-specific interpretation; no universal numeric normal range. | [Mayo urine culture](https://www.testcatalog.org/show/URNS) accepts no growth, low counts or urogenital microbiota; [wound culture](https://sjhnhlab.testcatalog.org/show/WDC) says no growth. Therefore do not assign "no growth" as a universal rule to a generic culture item. |

## Unit identity notes

- Urea mmol/L to full-urea mg/dL is a calculated conversion: multiply by approximately 6.006; 2.5–7.8 mmol/L corresponds to approximately 15.0–46.8 mg/dL **urea**. These converted bounds are calculations, not a separately validated mg/dL interval from Oxford.
- BUN mg/dL to urea mg/dL is a calculated conversion: multiply by approximately 2.143. Never use BUN 8–24 mg/dL as a full-urea mass interval.
- For generic catalog names with no method/unit metadata, prefer explicit textual context and leave numeric min/max null instead of forcing one sex/age subgroup into automated abnormal flags.

No database changes were made by this research task.
