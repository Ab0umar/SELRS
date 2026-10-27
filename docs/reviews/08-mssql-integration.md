# تقرير مراجعة — موديول 8: تكامل MSSQL (المزامنة، الإيصالات، الـ scheduler)

**النطاق:** `server/integrations/mssqlPatients.ts` (6946 سطر)، `syncYearPatients.ts` (388)، `server/routers/medical-mssql.ts` (1264)، `server/_core/mssqlSyncScheduler.ts`، `server/services/accounting/mssqlAccounting.ts`، `commissionPoolsMssql.service.ts`.
**العمق:** `createMssqlPool`، الـ scheduler كامل، رأس `syncPatientsFromMssql`، جزء من مسار الـ INSERT (`2600-2800`)، الجرد الآلي لكل جمل SQL الديناميكية (grep)، وإجراءات `medical-mssql.ts` المهمة (`linkPatientServiceToMssql`, `linkMultipleServicesToMssql`, `deletePatientFromMssql`). **الملف الرئيسي 7000 سطر لم يُقرأ كله** — اتفحصت أنماط الخطر فقط.
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 8.1 | 🔴 | Operational (date-driven) | اسم قاعدة السنة `op2026` hardcoded في ~160 موضع + allow-list بقيمة واحدة ⇒ توقف الكتابة/المزامنة في 2027-01-01 |
| 8.2 | 🟠 | Security | الاتصال بـ MSSQL افتراضياً `encrypt:false` + `trustServerCertificate:true` |
| 8.3 | 🟠 | Concurrency | لا قفل يمنع تشغيل المزامنة اليدوية والمجدولة معاً؛ ولا يصلح لأكتر من instance |
| 8.4 | 🟠 | Bug | `createMssqlPool`: لا single-flight ولا `close()` للـ pool القديم ⇒ تسريب اتصالات |
| 8.5 | 🟠 | Perf | health-check `SELECT 1` قبل **كل** query + لا pooling حقيقي لنفس الـ pool |
| 8.6 | 🟡 | Bug | `ISNUMERIC(...) = 1 ... CAST(... AS INT)` نمط معروف بيفشل (`'1e3'`, `'$'`, `','`) |
| 8.7 | 🟡 | Reliability | `requestTimeout=15s` مع sync لحد 20,000 صف؛ المزامنة بتشتغل كل 30 ثانية |
| 8.8 | 🟡 | Security | `linkPatientServiceToMssql`: `servicePrice`/`discountValue` من العميل يعدّلوا الفاتورة بدون سقف |
| 8.9 | 🟡 | Audit | `deletePatientFromMssql` بيحذف من 5 جداول (`PAPAT_SRV`, `PAPAT_IO`, `PAPATMF`, header ×2 — `mssqlPatients.ts:5196-5205`) وبيبلع الأخطاء |
| 8.10 | 🔵 | Code | ملف 7000 سطر؛ 66 جملة DML؛ تكرار `UPDATE PAPAT_IO` ×25 في استدعاءات منفصلة |

---

## 🔴 High

### 8.1 قنبلة تغيير السنة (2027-01-01)
المستودع مبني على "قاعدة لكل سنة": MSSQL `op2026` و MySQL `selrs26` (والـ legacy `selrs23/24/25` — `legacyPatients.ts`). الكود فيه:
- `mssqlPatients.ts:13`: `ALLOWED_MSSQL_PATIENT_TABLES = new Set(["op2026.dbo.PAJRNRCVH"])` → أي قيمة تانية في `MSSQL_PUSH_PATIENTS_TABLE` (مثلاً `op2027.dbo.PAJRNRCVH`) بترمي `"is not an allowed table"`.
- `op2026` literal في **147** موضع داخل `mssqlPatients.ts` (`PAPAT_SRV`, `PAPAT_IO`, `SRVLSTD`, `SRVCMF`, …)، + `accounting.ts:68,461`، + `medical-mssql.ts` (4)، + `commissionPoolsMssql.service.ts` (5).
- في المقابل `accounting.ts:getMssqlPatientsTable()` بيقبل regex `^op\d{4}\.dbo\.PAJRNRCVH$` — يعني نصف الكود "سنة-مرن" ونصفه لا؛ هيحصل تناقض (قراءة من `op2027` وكتابة/حذف في `op2026`).
(التاريخ الحالي 2026-10-26 ⇒ حوالي شهرين.)
**الأثر:** بعد ما برنامج المحاسبة القديم يفتح `op2027`: المزامنة ثابتة على 2026 (مرضى/إيصالات جديدة ما بتدخلش)، وإضافة إيصالات/حذف/تعديل تروح لقاعدة السنة القديمة (خطر مالي).
**الإصلاح:** ثابت واحد `MSSQL_YEAR_DB` (env: `MSSQL_DB_YEAR=2027`) يتبني منه `${db}.dbo.X` في **دالة واحدة** `mssqlTable("PAPAT_SRV")`، وفحص الـ allow-list بـ regex `^op\d{4}\.dbo\.PAJRNRCVH$`، وأضف اختبار بتاريخ مزيَّف (2027) يفشل لو لقى `op2026` literal في الـ source (`grep` في CI)، وrunbook لتغيير السنة (يشمل `selrs27`).

---

## 🟠 Medium

### 8.2 الاتصال غير مشفّر
`createMssqlPool` (`mssqlPatients.ts:573-580`): `encrypt: asBool(MSSQL_ENCRYPT, false)` و`trustServerCertificate: asBool(MSSQL_TRUST_SERVER_CERTIFICATE, true)`. بيانات المرضى والأسعار وكلمة سر SQL-auth بتعدّي بدون TLS (أو بشهادة غير محققة = قابلة لـ MITM). الكود نفسه بيوصف السيرفر بأنه "remote server" (`medical-patient.ts:250`). لو MSSQL على نفس الجهاز/شبكة داخلية معزولة فالمخاطرة أقل، لكن الافتراضي لازم يكون آمن وتتعطّل بإعداد صريح.
**الإصلاح:** `encrypt=true` افتراضياً، `trustServerCertificate=false` في production مع شهادة CA/عنوان صحيح؛ وفشل الإقلاع لو `NODE_ENV=production` والإعدادات الضعيفة مش مؤكدة صراحة.

### 8.3 تزامن المزامنة
- `mssqlSyncScheduler.ts`: `running` متغير محلي داخل الـ closure؛ `syncPatientsFromMssql` اللي بيتنادى من admin procedures (`medical-mssql.ts:62` `syncPatientsFromMssql`، `syncSinglePatientFromMssql` في `medical.ts`، وسير `resetMssqlSyncCodes` + full sync كما في CLAUDE.md) **مش بيشارك نفس العلم** ⇒ مزامنة يدوية كاملة أثناء مزامنة مجدولة = كتابات متداخلة على نفس الصفوف وعلى `mssql_sync_state_v1` (مؤشر `lastMarker`: آخر كاتب يكسب → ممكن يرجّع المؤشر لورا أو يتخطى صفوف).
- `writeRuntimeStatus` عمل read-modify-write على صف `system_settings` JSON ⇒ lost updates.
- لو شغّلت أكتر من instance (PM2 cluster/`ecosystem.config.js` الثاني) كل واحد هيشغّل scheduler.
**الإصلاح:** `GET_LOCK('mssql_sync', 0)` على connection مخصّص (زي `materializerMutex.ts` في الحضور — نفس الحل جاهز عندكم)، وخزّن الـ marker في عمود/جدول مش JSON مشترك.

### 8.4 `createMssqlPool` race/leak
`mssqlPatients.ts:491-503`: لو `cachedMssqlPool` فاشل في الـ health-check بيتحط `null` من غير `await pool.close()` (الاتصال القديم يفضل مفتوح لحد GC/timeouts). وطلبين متزامنين يلاقوا `null` بيبنوا pool كل واحد (مفيش promise مشترك) فيتبقى واحد cached والتاني يتيم. الـ scheduler (30ث) + طلبات المحاسبة + المرضى = احتمال حقيقي.
**الإصلاح:** `let poolPromise: Promise<Pool> | null` (single-flight) + `await old?.close().catch(()=>{})` + تعامل مع `pool.on("error")`.

### 8.5 Health-check على كل استدعاء
`await cachedMssqlPool.request().query("SELECT 1")` قبل كل query (أحياناً 10+ استدعاءات `createMssqlPool` لنفس الإجراء: `accounting.ts` بيستدعيه في `mssqlQuery` ثم `pool.connect()` تاني) = رحلة شبكية إضافية لكل عملية، على سيرفر "remote". استعمل `pool.connected` + retry-once-on-connection-error بدل ping مسبق.

---

## 🟡 Low

- **8.6** استخدامات `ISNUMERIC(CONVERT(varchar(50), X)) = 1 THEN CAST(... AS INT)` (≥ 15 موضع؛ `4594`, `4695`, `5012`, `2749`…): `ISNUMERIC` بيرجّع 1 لقيم مثل `'1e3'`, `'+'`, `'-'`, `'$'`, `'.'`, `','`، و`CAST('1e3' AS INT)` يفشل؛ وأرقام >2^31 تفجّر overflow. استخدم `TRY_CAST(x AS INT)` (SQL Server 2012+) أو `TRY_CONVERT`. نفس الشيء `MAX(CAST(trNoCol AS INT))` في توليد `TR_NO` (`2749`, `3394`, `4590`, `5008`): قيمة غير رقمية واحدة في عمود `TR_NO` = فشل كل الإيصالات الجديدة.
- **8.7** `MSSQL_REQUEST_TIMEOUT_MS` افتراضي 15 ثانية بينما sync يجيب لحد `limit=5000–20000` صف مع join على `PAPAT_SRV` كل 30 ثانية (`MSSQL_SYNC_INTERVAL_MS` min 5s). مع نمو الجدول: timeout متكرر ⇒ المؤشر ما بيتقدمش. زوّد الـ timeout لهذا الـ query تحديداً + أضف backoff للـ scheduler عند الفشل (الحالي: `setTimeout(tick, cfg.intervalMs)` ثابت حتى لو كل مرة بتفشل).
- **8.8** `medical-mssql.ts:529-640` `linkMultipleServicesToMssql` / `linkPatientServiceToMssql`: `protectedProcedure` + `canPushToMssql(ctx.user)` (صلاحية `/ops/mssql-add`) — جيد. لكن `servicePrice`/`discountValue`/`quantity` (≤10) جايين من العميل ويتكتبوا في فاتورة MSSQL بدون سقف أو مقارنة بسعر الكتالوج (`SRVLSTD`) — موظف عنده الصلاحية يقدر يبيع خدمة بسعر 0/خصم كامل بدون أثر غير الـ audit العام. أضف: سقف خصم، وتسجيل `priceOverridden` في الـ audit وتنبيه للمدير عند الانحراف عن الكتالوج.
- **8.9** `deletePatientFromMssqlByCode` (`mssqlPatients.ts:5170-5200`): `tryDeleteByCode(table)` بيبلع **كل** الأخطاء (`catch { return 0; }`) "since deployments may not have all tables" — فشل حقيقي (deadlock/timeout) = نتيجة "تم الحذف" ناقصة، والـ audit بيسجل `deleted` بس. أضف transaction + استثناء للأخطاء غير `Invalid object name`.
- `updateServicePriceInMssql` (`medical-mssql.ts:943`) و`syncRegistrationCatalogFromMssql` (755): `managerProcedure` = manager/admin/**accountant** يغيّروا **قائمة أسعار الخدمات في MSSQL** (master data مالي) — راجع هل ده مقصود، وسجّل قبل/بعد في الـ audit.
- `pool.connect()` بيتنادى على pool متصل بالفعل في أغلب الأماكن (no-op لكن ضوضاء).
- أخطاء MSSQL بتتحول لنصوص في الـ response (`result.note`, `mssqlError` في `deletePatientServiceEntry`) = تسريب أسماء جداول/أعمدة للـ UI.

## 🔵 Code

- `mssqlPatients.ts` = 6946 سطر، 19 export، 66 DML. قسّمه: `connection.ts` / `read/sync.ts` / `write/receipts.ts` / `write/patients.ts` / `schemaIntrospection.ts`. (docs/security.md أصلاً بيطلب تقسيم `db.ts` و`_core/index.ts`؛ ضيف ده.)
- الـ 25 جملة `UPDATE op2026.dbo.PAPAT_IO SET X = ISNULL(...)` (`1724-1836`) بتتنفذ كـ statements منفصلة (`ioUpdates.push`) — ممكن تتجمع في UPDATE واحد بـ SET متعدد (أسرع، وذرّي).
- الـ dynamic SQL: كل المعرّفات (أسماء أعمدة) مصدرها `INFORMATION_SCHEMA`/`getTableColumns` والجداول من allow-list/regex، والقيم كلها `@param` — **لا أرى SQL injection** (على عكس `accounting.ts` MySQL، تقرير 2). `escapeSqlString` الوحيدة (`mssqlPatients.ts:459`, استخدام واحد `5455`) على قيمة تاريخ مُولَّدة داخلياً، ومع MSSQL (لا backslash escape) كافية.
- `loadDoctorMapFromCsv/loadServiceTypeMap` بتقرأ ملفات CSV من القرص عند **كل** مزامنة (كل 30 ثانية): cache بـ mtime.
- لا يوجد اختبارات تكامل للـ MSSQL (عن طريق mock)؛ `server/tests` فيه `bookingConfirmationWorkflow` ... لم أجد test يضمن `TR_NO` الفريد تحت التزامن.

## ما اتأكدت إنه سليم
- كتابة الإيصالات داخل **transaction صريحة** + `sp_getapplock`/`sp_releaseapplock` + `UPDLOCK, HOLDLOCK` على توليد `TR_NO` (`2609-2640`, `1135-1180`)، وفحص كود الـ return للـ applock.
- كل القيم بـ `request.input(...)` (parameterized)، `getAllowedMssqlPatientTable()` allow-list.
- `incremental` sync بعلامة (marker) محفوظة + `dryRun` + `preserveManualEdits` (افتراضي true) — يتوافق مع ما في CLAUDE.md (doctor/service من نفس صف `PAPAT_SRV`).
- ADR-003 يحدد حدود MySQL/MSSQL؛ الكود يلتزم بيه في الاتجاهين الأساسيين.
