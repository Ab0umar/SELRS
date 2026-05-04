# Legacy Reports Inventory

Task 05 output for SRV100 Accounting Phase 1. Sources inspected first:

- `specs/CONSTITUTION.md`
- `specs/PROJECT_PRINCIPLES.md`
- `specs/specify.md`
- `specs/plan.md`
- `specs/tasks.md` Task 05
- `Acc_SRV100/OP_QU.txt`
- `Acc_SRV100/lasik_op.txt`
- `Acc_SRV100/SRV100_Plan.txt`
- `Acc_SRV100/*.rtm`

Rules applied: read-only accounting, service-based revenue, no database redesign, no Medical module changes, no invented SQL. Legacy report predicates such as `(1<>1)` are copied as found because OP appears to inject runtime filters there.

## RTM Mapping

- Daily Revenue: `Acc_SRV100/استعلام ايراد يومي ورديه.rtm`, `Acc_SRV100/ايراد يومي ورديات.rtm`, `Acc_SRV100/خدمات.rtm`, `Acc_SRV100/اجمالي الايراد.rtm`
- Service Revenue: `Acc_SRV100/خدمات الاطباء مفصل.rtm`, `Acc_SRV100/خدمات الاطباء اجمالي.rtm`; canonical OP query also documented in `Acc_SRV100/OP_QU.txt` as `D:\OP\اطباء.rtm`
- Receipts Inquiry: `Acc_SRV100/ايصال استقبال رمد.rtm`; canonical OP query also documented in `Acc_SRV100/OP_QU.txt` as `D:\OP\تقرير الرمد.rtm`
- Patient Account: `Acc_SRV100/كشف حساب مريض.rtm`; supporting canonical patient/service link query in `Acc_SRV100/OP_QU.txt`
- Doctor Account: `Acc_SRV100/كشف حساب طبيب.rtm`; supporting canonical doctor/service query in `Acc_SRV100/OP_QU.txt`
- Non-target / supporting reports inspected: `Acc_SRV100/الخدمات.rtm`, `Acc_SRV100/اعداد مرضي طبيب.rtm`, `Acc_SRV100/مرضي طبيب مفصل.rtm`, `Acc_SRV100/ايصال استقبال.rtm`, `Acc_SRV100/ايصال.rtm`, `Acc_SRV100/فاتوره.rtm`

TODO: Confirm whether `Acc_SRV100/خدمات.rtm` is a duplicate/variant of `Acc_SRV100/استعلام ايراد يومي ورديه.rtm`; the inspected layout and SQL shape match closely.

## Daily Revenue

### Legacy Source Path

- `Acc_SRV100/استعلام ايراد يومي ورديه.rtm`
- `Acc_SRV100/ايراد يومي ورديات.rtm`
- `Acc_SRV100/اجمالي الايراد.rtm`
- `Acc_SRV100/خدمات.rtm`

### SELECT Query

From `Acc_SRV100/استعلام ايراد يومي ورديه.rtm` / `Acc_SRV100/خدمات.rtm`:

```sql
select 1 grp,
( select dpt_nm_ar from dept where dpt_no= PAJRNRCVH.sec_cd) as sec_nm,
( select ca_nm_ar from cmpmf where ca_cd= PAJRNRCVH.ca_ACC) as ca_nm,
(select dscr_ar from  appcodes where id=1015 and seq =  pajrnrcvh.shft) as shft_nm,
PAT_CD, NAM,
CASE TR_TY
  WHEN 1 THEN 'نقدى'
  WHEN 5 THEN 'آجل'
  WHEN 6 THEN 'نزلاء'
  WHEN 7 THEN 'مدفوع مقدما'
  WHEN 8 THEN 'مسترد'
END TRTYN, TR_NO, tr_DT,cnclrsn,
CASE WHEN ISNULL(CNCL, '') = '*' THEN 'ملغي' ELSE 'ساري' END STATE,
SUM(PA_VL) SUM_PA_VL, SUM(CA_VL) SUM_CA_VL, SUM(DISC) SUM_DISC_VL,
SUM(CASE WHEN TR_TY <> 8  THEN PA_VL Else - pa_vl END) TOT_PA_VL,
SUM(CASE WHEN TR_TY <> 8  THEN DISC ELSE -DISC END) TOT_DISC_VL,
SUM(CASE WHEN TR_TY <> 8  THEN CA_VL ELSE -CA_VL END) TOT_CA_VL
from PAJRNRCVH
where(1<>1)
group by PAJRNRCVH.sec_cd, PAJRNRCVH.ca_ACC, PAJRNRCVH.PAT_CD, PAJRNRCVH.NAM, tr_ty, TR_NO, tr_DT, CNCL,cnclrsn,shft
order by cncl,tr_DT
```

From `Acc_SRV100/اجمالي الايراد.rtm`:

```sql
select 1grp,sec_cd,sum(totl)as totl,sum(ca_vl)as ca_vl,sum(disc)as disc,
(sum(totl)+sum(ca_vl)+ SUM(DISC))as tot,
( select dpt_nm_Ar from dept where dpt_no=sec_cd) As dep_nm
from pajrnrcvh
where tr_ty <> 8 and cncl is null
and tr_ty <> 6
and (1<>1)
group by sec_Cd
```

### Visible Columns

- `PAT_CD` / patient number
- `NAM` / patient name
- `TR_NO` / receipt number
- `tr_DT` / date
- `sec_nm` / section
- `ca_nm` / payer/company
- `SUM_PA_VL` / patient share
- `SUM_DISC_VL` / discount
- `SUM_CA_VL` / company share
- `TRTYN` / receipt type
- `STATE` / receipt state

### Grouping

- `grp` report group.
- `STATE` group in the daily inquiry layout.
- `sec_nm` group with section totals.
- `اجمالي الايراد.rtm` groups by `sec_cd`.

### Totals

- Per state: `TOT_PA_VL`, `TOT_DISC_VL`, `TOT_CA_VL`, receipt count (`TRTYN` count).
- Per section: `TOT_PA_VL`, `TOT_DISC_VL`, `TOT_CA_VL`.
- Overall summary variant: `sum(totl)`, `sum(ca_vl)`, `sum(disc)`, computed `tot`.

### Footer

- No signature/footer content found; totals render in group footer bands.

### Notes

- TODO: `(1<>1)` is the runtime filter injection point; exact date/section/shift predicates are not visible in the `.rtm`.
- TODO: `اجمالي الايراد.rtm` computes `tot` as `sum(totl)+sum(ca_vl)+SUM(DISC)` while the daily inquiry uses `PA_VL`, `CA_VL`, and `DISC` signed by `TR_TY`; parity work must choose the correct legacy report for each UI endpoint.

## Service Revenue

### Legacy Source Path

- `Acc_SRV100/خدمات الاطباء مفصل.rtm`
- `Acc_SRV100/خدمات الاطباء اجمالي.rtm`
- `Acc_SRV100/OP_QU.txt` documents canonical source `D:\OP\اطباء.rtm`

### SELECT Query

Canonical OP query from `Acc_SRV100/OP_QU.txt`:

```sql
SELECT srv_by1, srv_cd, qty, prc,
       (qty * prc) AS tot,
       (SELECT PHNM_AR FROM mdteam WHERE code = papat_srv.srv_by1) AS DOCNM,
       (SELECT ca_nm_AR FROM cmpmf WHERE ca_cd = papat_srv.ca_cd) AS CANM,
       (SELECT srv_nm_AR FROM srvcmf WHERE srv_cd = papat_srv.srv_cd) AS srvnm
FROM papat_srv, PAJRNRCVH
WHERE srv_by1 <> ' '
  AND (1 <> 1)
  AND papat_srv.cncl IS NULL
  AND pajrnrcvh.tr_no  = papat_srv.tr_no
  AND pajrnrcvh.sec_cd = papat_srv.sec_cd
  AND pajrnrcvh.tr_ty  = papat_srv.tr_ty
ORDER BY srv_by1, srvnm
```

Detailed doctor-service template query from `Acc_SRV100/خدمات الاطباء مفصل.rtm`:

```sql
 SELECT distinct S.*,
(select srv_nm_Ar from srvcmf where srv_cd= S.SRV_CD)AS SRV_NM ,
(s.qty*s.prc)as tot,
( select phnm_ar from mdteam where code=s.srv_by1)as phnm_ar,
( select CA_NM_AR from CMPMF where CA_CD=s.CA_CD)as CA_NM
FROM (PAPAT_SRV S LEFT JOIN PAPAT_IO PAPAT_IO
ON (S.PAT_CD=PAPAT_IO.PAT_CD) AND (S.VST_NO=PAPAT_IO.VST_NO)) LEFT JOIN PAPATMF PAPATMF
ON S.PAT_CD=PAPATMF.PAT_CD Where 1=1 Order by S.PAT_CD
```

Aggregate doctor-service template query from `Acc_SRV100/خدمات الاطباء اجمالي.rtm`:

```sql
SELECT S.SRV_CD,SUM(S.QTY) as Cnt,Sum(S.PRC*S.QTY) as Prc1,
( select srv_nm_ar from srvcmf where srv_cd=s.srv_cd) as srv_nm,
( select phnm_ar from mdteam where code=s.srv_by1) as phnm_Ar
 FROM (PAPAT_SRV S LEFT JOIN PAPAT_IO PAPAT_IO ON
(S.PAT_CD=PAPAT_IO.PAT_CD) AND (S.VST_NO=PAPAT_IO.VST_NO)) LEFT JOIN PAPATMF PAPATMF ON
S.PAT_CD=PAPATMF.PAT_CD Where 1=1
 group by Srv_cd ,srv_by1 Order by Srv_Cd
```

### Visible Columns

- Detail: `PAT_NM_AR`, `SRV_NM`, `DT`, `QTY`, `PRC`, `tot`, `CA_NM`.
- Aggregate: `SRV_NM`, `Cnt`, `Prc1`.
- Canonical OP query fields: `srv_by1`, `DOCNM`, `srv_cd`, `srvnm`, `qty`, `prc`, `tot`, `CANM`.

### Grouping

- Outer group by doctor name/code: `phnm_ar` / `srv_by1`.
- Inner group by service: `SRV_NM` / `srvnm`.
- Canonical order: `ORDER BY srv_by1, srvnm`.

### Totals

- Detail template: per-doctor sums of `QTY`, `PRC`, `tot`.
- Aggregate template: per-doctor sums of `Cnt`, `Prc1`.
- Canonical OP query exposes line-level `qty`, `prc`, and `tot = qty * prc`.

### Footer

- No signature/footer content found; totals render in group footer bands.

### Notes

- TODO: `خدمات الاطباء مفصل.rtm` does not include the `PAJRNRCVH` join shown in the canonical `OP_QU.txt` `اطباء.rtm` query; use the canonical query for service revenue parity unless a reviewer confirms the detailed template is the UI target.
- TODO: `خدمات الاطباء مفصل.rtm` uses `Where 1=1`, so runtime filters are not visible in the template.
- TODO: The canonical query contains `(1 <> 1)` as a runtime predicate injection point.

## Receipts Inquiry

### Legacy Source Path

- `Acc_SRV100/ايصال استقبال رمد.rtm`
- `Acc_SRV100/OP_QU.txt` documents canonical source `D:\OP\تقرير الرمد.rtm`

### SELECT Query

Canonical OP query from `Acc_SRV100/OP_QU.txt`:

```sql
SELECT 1 grp,
       pajrnrcvh.sec_cd,
       pajrnrcvh.pat_cd,
       pajrnrcvh.nam,
       pajrnrcvh.tr_no,
       pajrnrcvh.tr_dt,
       pajrnrcvh.tr_ty,
       pajrnrcvh.shft,
       papat_srv.ca_cd,
       papat_srv.disc_vl,
       papat_srv.srv_cd,
       papat_srv.srv_by1,
       papat_srv.qty,
       papat_srv.prc,
       pajrnrcvh.totl,
       (papat_srv.qty * papat_srv.prc) AS tot,
       (papat_srv.pa_vl - papat_srv.disc_vl) AS pa_vl,
       (papat_srv.ca_vl - disc_ca) AS ca_vl,
       pajrnrcvh.enteredby,
       (SELECT dpt_nm_ar FROM dept WHERE dpt_no = papat_srv.sec_cd) AS dept_nm,
       (SELECT srv_nm_ar FROM srvcmf WHERE srv_cd = papat_srv.srv_cd) AS srv_nm,
       (SELECT ca_nm_ar FROM cmpmf WHERE ca_cd = papat_srv.ca_cd) AS ca_nm,
       (SELECT dscr_ar FROM appcodes WHERE id = 1015 AND seq = pajrnrcvh.shft) AS shft_1,
       CASE pajrnrcvh.TR_TY
         WHEN 1 THEN N'نقدى'
         WHEN 5 THEN N'آجل'
         WHEN 6 THEN N'نزلاء'
         WHEN 8 THEN N'مسترد'
       END AS TRTYN
FROM papat_srv, pajrnrcvh
WHERE pajrnrcvh.sec_cd = papat_srv.sec_cd
  AND pajrnrcvh.tr_no  = papat_srv.tr_no
  AND pajrnrcvh.tr_ty  = papat_srv.tr_ty
```

Same query in `Acc_SRV100/ايصال استقبال رمد.rtm`:

```sql
select 1grp,pajrnrcvh.sec_cd,pajrnrcvh.pat_cd,pajrnrcvh.nam, pajrnrcvh.tr_no,pajrnrcvh.tr_dt,pajrnrcvh.tr_ty,pajrnrcvh.shft,papat_srv.ca_cd,papat_srv.disc_vl,
papat_srv.srv_cd,papat_srv.srv_by1,papat_srv.qty,papat_srv.prc,pajrnrcvh.totl,(papat_srv.qty*papat_srv.prc)as tot,
(papat_srv.pa_vl-papat_Srv.disc_vl)as pa_vl,(papat_srv.ca_vl-disc_ca)as ca_vl ,pajrnrcvh.enteredby,
( select dpt_nm_ar from dept where dpt_no=papat_srv.sec_Cd) dept_nm,
( select srv_nm_ar from srvcmf where srv_cd= papat_srv.srv_Cd) As srv_nm,
( select ca_nm_Ar from cmpmf where ca_cd = papat_srv.ca_cd) As ca_nm,
(select dscr_ar from  appcodes where id=1015 and seq =  pajrnrcvh.shft) as shft,
CASE pajrnrcvh.TR_TY WHEN 1 THEN 'نقدى' WHEN 5 THEN 'آجل' WHEN 6 THEN 'نزلاء' WHEN 8 THEN 'مسترد' END TRTYN
from papat_srv,pajrnrcvh
where
pajrnrcvh.sec_cd = papat_srv.sec_cd
and pajrnrcvh.tr_no= papat_srv.tr_no
and pajrnrcvh.tr_ty= papat_srv.tr_ty
```

### Visible Columns

- Header: `dept_nm`, `tr_no`, `TRTYN`, `tr_dt`, `nam`, `srv_by1`, `shft_1`/`shft`, `ca_nm`, `totl`, `enteredby`, `pat_cd`.
- Detail table: `srv_cd`, `srv_nm`, `qty`, `prc`, `tot`, `disc_vl`, `pa_vl`, `ca_vl`.

### Grouping

- `grp` report group only.
- Print structure is one receipt header followed by service detail rows.

### Totals

- Receipt header shows `totl`.
- Footer totals sum `tot`, `disc_vl`, `pa_vl`, and `ca_vl`.
- Variables render amount-in-words for paid/due values.

### Footer

- Totals footer and amount-in-words labels for paid/due.
- No signature block found.

### Notes

- TODO: The `.rtm` field alias says `shft` while the layout data field uses `shft_1`; the canonical `OP_QU.txt` names it `shft_1`.
- TODO: No explicit `SEC_CD = 15` appears in the receipt template; Lasik filtering must come from runtime conditions or later application filters.

## Patient Account

### Legacy Source Path

- `Acc_SRV100/كشف حساب مريض.rtm`
- `Acc_SRV100/OP_QU.txt` patient link query

### SELECT Query

Patient account template query from `Acc_SRV100/كشف حساب مريض.rtm`:

```sql
SELECT DISTINCT PAPAT_SRV.SRV_CD,PAPAT_SRV.PAT_CD ,PAPAT_SRV.PAT_NM_AR,PAPAT_SRV.SEC_CD,
(SELECT SRV_NM_AR FROM SRVCMF WHERE SRV_CD=PAPAT_SRV.SRV_CD) aS SRV_NM ,
( SELECT DPT_NM_AR FROM DEPT WHERE DPT_NO=PAPAT_SRV.SEC_CD) AS DPT_NM,
PAPAT_SRV.PRC as prc,
--count(PAPAT_SRV.QTY) as qty1 ,
--count(PAPAT_SRV.QTY)*PAPAT_SRV.PRC as prc1,
sum(papat_srv.QTY) qty,
sum(papat_srv.QTY) * PAPAT_SRV.PRC as total,
count(PAPAT_SRV.QTY)*PAPAT_SRV.PA_VL as pa_vl,
count(PAPAT_SRV.QTY)*PAPAT_SRV.CA_VL as ca_vl

FROM PAJRNRCVH,PAPAT_SRV
WHERE PAPAT_SRV.PAT_TYP='1'
AND
PAJRNRCVH.tr_no=PAPAT_SRV.tr_no
and
PAJRNRCVH.PAT_CD=PAPAT_SRV.PAT_CD
AND
PAJRNRCVH.tr_ty=PAPAT_SRV.tr_ty
and
PAJRNRCVH.sec_cd=PAPAT_SRV.sec_cd
and
PAJRNRCVH.cncl is null

group by
PAPAT_SRV.SEC_CD,PAPAT_SRV.SRV_CD,PAPAT_SRV.PAT_CD ,PAPAT_SRV.PAT_NM_AR,papat_srv.QTY,
PAPAT_SRV.PRC,PAPAT_SRV.PA_VL,PAPAT_SRV.CA_VL
order by PAPAT_SRV.SEC_CD,PAPAT_SRV.SRV_CD,PAPAT_SRV.PAT_CD ,PAPAT_SRV.PAT_NM_AR,papat_srv.QTY,
PAPAT_SRV.PRC,PAPAT_SRV.PA_VL,PAPAT_SRV.CA_VL
```

Supporting patient receipt/service link query from `Acc_SRV100/OP_QU.txt`:

```sql
SELECT h.SEC_CD, h.TR_TY, h.TR_NO, h.TR_DT, h.TOTL, h.DISC, h.PA_VL,
       d.SRV_CD, d.QTY, d.PRC, d.DISC_VL, d.PA_VL AS LINE_PA_VL
FROM PAJRNRCVH h
JOIN PAPAT_SRV d
  ON h.SEC_CD = d.SEC_CD
 AND h.TR_TY  = d.TR_TY
 AND h.TR_NO  = d.TR_NO
WHERE h.PAT_CD = @PAT_CD
ORDER BY h.TR_DT DESC, h.TR_NO DESC
```

### Visible Columns

- Header: `PAT_CD`, `PAT_NM_AR`.
- Detail rows: `SRV_NM`, `prc`, `QTY`, `total`, `PA_VL`, `CA_VL`.
- Section group: `DPT_NM`.

### Grouping

- Hidden group by `PAT_CD`.
- Visible group by `DPT_NM`.

### Totals

- Per-section totals: sum `PA_VL`, sum `CA_VL`, sum `total`.
- No grand total footer visible beyond section group totals in the inspected template.

### Footer

- No signature/footer content found; section totals render in group footers.

### Notes

- TODO: Template query lacks an explicit `WHERE PAT_CD = ...`; OP likely injects patient filtering outside the static SQL.
- TODO: Template uses `count(QTY) * PA_VL` and `count(QTY) * CA_VL`; confirm against OP output because `OP_QU.txt` supporting query exposes line-level `d.PA_VL AS LINE_PA_VL`.
- TODO: Template is titled internal patient account (`كشف حساب مريض داخلى`) and filters `PAPAT_SRV.PAT_TYP='1'`; confirm this is the intended Phase 1 Patient Account report.

## Doctor Account

### Legacy Source Path

- `Acc_SRV100/كشف حساب طبيب.rtm`
- `Acc_SRV100/OP_QU.txt` doctor/service query

### SELECT Query

Doctor account template query from `Acc_SRV100/كشف حساب طبيب.rtm`:

```sql
select pajrnrcvh.pat_cd,pajrnrcvh.nam,pajrnrcvh.tr_no,
sum(papat_srv.pa_vl)as totl,
sum(papat_srv.ca_vl)as ca_vl,
--sum(pajrnrcvh.disc) disc,
pajrnrcvh.disc,
pajrnrcvh.dt,pajrnrcvh.sec_Cd,
papat_srv.srv_by1,
( select dpt_nm_ar from dept where dpt_no= pajrnrcvh.sec_cd) as sec_nm,
( select ca_nm_ar from cmpmf where ca_cd= pajrnrcvh.ca_acc) as ca_nm,
( select phnm_Ar from mdteam where code = papat_srv.srv_by1) as doc_nm,
(CASE WHEN pajrnrcvh.cncl in ('*')then 'ملغي' else 'سارى' end ) as cncl,
CASE pajrnrcvh.TR_TY WHEN 1 THEN 'نقدى' WHEN 5 THEN 'آجل' WHEN 6 THEN 'نزلاء' WHEN 7 THEN 'مدفوع مقدما' END TRTYN

from pajrnrcvh,papat_srv
where
pajrnrcvh.tr_ty=papat_srv.tr_ty
and pajrnrcvh.tr_no=papat_srv.tr_no
and pajrnrcvh.sec_cd =papat_srv.sec_cd
and pajrnrcvh.cncl is null
and (1<>1)
group by pajrnrcvh.sec_Cd,pajrnrcvh.nam,pajrnrcvh.tr_no,papat_srv.srv_by1,pajrnrcvh.dt,pajrnrcvh.tr_ty,pajrnrcvh.ca_acc,pajrnrcvh.cncl,pajrnrcvh.pat_cd,pajrnrcvh.disc
order by pajrnrcvh.sec_Cd,pajrnrcvh.nam,pajrnrcvh.tr_no,papat_srv.srv_by1,pajrnrcvh.dt,pajrnrcvh.tr_ty,pajrnrcvh.ca_acc,pajrnrcvh.cncl,pajrnrcvh.pat_cd
```

Supporting doctor-service query from `Acc_SRV100/OP_QU.txt`:

```sql
SELECT s.SRV_BY1 AS doctor_code, m.PHNM_AR AS doctor_name,
       s.SRV_CD, s.QTY, s.PRC, (ISNULL(s.QTY,0) * ISNULL(s.PRC,0)) AS gross_value
FROM PAPAT_SRV s
LEFT JOIN MDTEAM m
  ON m.CODE = s.SRV_BY1
WHERE s.SRV_BY1 = @DOCTOR_CODE
```

### Visible Columns

- Header: `doc_nm`.
- Detail rows: `NAM`, `TR_NO`, `TOTL`, `CA_VL`, `DISC`, `cncl`, `TRTYN`.
- Group header fields: `sec_Cd`, `sec_nm`.

### Grouping

- Overall `grp` group.
- Doctor group by `doc_nm`.
- Section group by `sec_Cd` with displayed `sec_nm`.

### Totals

- Overall footer: receipt count (`TR_NO` count), sum `TOTL`, sum `CA_VL`, sum `DISC`.
- Section footer: receipt count (`TR_NO` count), sum `TOTL`, sum `CA_VL`, sum `DISC`.
- Extra labels for cash revenue and daily total are present in the footer.

### Footer

- Report total footer with receipt count, cash revenue, and daily total labels.
- No signature block found.

### Notes

- TODO: `(1<>1)` is the runtime filter injection point, likely where doctor/date/section filters are applied.
- TODO: Template groups doctor account by receipt/header values, while Service Revenue groups by doctor then service. Confirm whether Doctor Account should reuse service revenue logic or this receipt-account template.
- TODO: The query uses `pajrnrcvh.dt`, not `tr_dt`; confirm field availability in MSSQL before implementation.
