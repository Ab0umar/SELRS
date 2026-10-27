# تقرير مراجعة — موديول 5: Medical (المرضى + الزيارات + الفحوصات + الكتالوج + الرفع)

**النطاق:** `server/routers/medical-patient.ts` (1898)، `medical-ops.ts` (2491)، `medical-examinations.ts` (2572)، `medical-catalog.ts` (1216)، `medical-uploads.ts`، `medical-reference.ts`، `patient.ts`، `legacyPatients.ts`، `_medical/patient-helpers.ts`، و الدوال المقابلة في `server/db.ts` (`searchPatients`, `getAllPatients`, `attachTreatingDoctor`, `updatePatient`, `deletePatientWithAllData`, `getSystemSetting`).
**العمق:** قراءة كاملة لـ: `createPatient` (جزء الـ existing)، `updatePatient`، `service entries`، `searchPatients/getAllPatients`، `uploads`، `getSystemSetting`، حذف المرضى، `updateExamination` (بداية). باقي الملفات: جرد الـ guards والـ inputs بالـ grep فقط (`medical-examinations.ts` و`medical-ops.ts` أجزاء كبيرة ما اتقرأتش سطر بسطر).
**خارج النطاق هنا (تقارير منفصلة):** MSSQL (تقرير 6)، Pentacam (7)، Portals (8).
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 5.1 | 🔴 | Bug / Clinical safety | `findExistingPatientByNameOrPhone` بيدمج مرضى مختلفين (نفس الهاتف **أو** نفس الاسم) |
| 5.2 | 🔴 | Security / PII | `searchPatients` بلا limit ولا حد أدنى للبحث ⇒ استخراج كل جدول المرضى بطلب واحد |
| 5.3 | 🟠 | Security | `updatePatient`: mass-assignment بدون whitelist (حتى `id`) |
| 5.4 | 🟠 | Security | `getSystemSetting`: deny-list + تخطي بحالة الأحرف (`appointments_pricing_v1`) |
| 5.5 | 🟠 | Data integrity | حذف مريض/كل المرضى: بدون transaction، يبلع الأخطاء، audit بدون snapshot |
| 5.6 | 🟠 | Money | تسجيل الإيصال في MSSQL "fire-and-forget" بعد ما الـ API يرجّع نجاح |
| 5.7 | 🟠 | Audit | `createPatientServiceEntry` / `updatePatientServiceEntry` / `deletePatientServiceEntry` (بتمسّ الفوترة) بدون audit |
| 5.8 | 🟠 | Perf | `attachTreatingDoctor` بيحمّل كل JSON حالات الفحص لكل مريض في القايمة |
| 5.9 | 🟠 | Authz | `branch` على المستخدم مش مطبّق server-side؛ أي clinical staff يشوف كل المرضى |
| 5.10 | 🟡 | Perf | `getAllPatients` بيرتّب بـ `CAST(patientCode AS UNSIGNED)` + cursor غير sargable |
| 5.11 | 🟡 | Security | `saveUserPageState`/`updateSystemSetting` بـ `z.any()` بدون حد حجم |
| 5.12 | 🟡 | Bug | "اليوم" بتوقيت UTC (`toISOString().split("T")[0]`) في `createPatient` |
| 5.13 | 🟡 | Security | تسريب `${error}` في رسائل الأخطاء؛ `console.log` تفصيلي بدون تنقية |
| 5.14 | 🟡 | Validation | `fullName/phone/age` بدون تحقق (max/regex/range) في `createPatient` |
| 5.15 | 🔵 | Code | ملفات 2000+ سطر؛ دوال 550 سطر (`createPatient`)؛ `receptionProcedure` يشمل المحاسب |

---

## 🔴 High

### 5.1 دمج مرضى مختلفين في سجل واحد
`server/routers/_medical/patient-helpers.ts:94-133` (`findExistingPatientByNameOrPhone`):
```ts
const nameMatch  = Boolean(targetName)  && candidateName === targetName;
const phoneMatch = Boolean(targetPhone) && (candidatePhone === targetPhone || candidateAltPhone === targetPhone);
if (nameMatch || phoneMatch) return candidate;     // ← OR
```
بتُستخدم في `createPatient` (`medical-patient.ts:186-194`) لما مفيش `patientCode` صريح. في الواقع المصري **تليفون واحد للأسرة كلها** (أب/أم/أولاد)، وأسماء مثل "محمد أحمد" متكررة. النتيجة: مريض جديد (قريب) بيتعامل كأنه المريض الموجود: بيتحدّث سجله (`serviceType`, `doctorId`, `lastVisit`)، وإيصال MSSQL بيتعمل على كود المريض القديم، وبتتفتح له زيارة على الملف الغلط. ده خطر **سلامة مريض** (فحوصات/روشتات على ملف شخص تاني) وليس بس تكرار.
**الإصلاح:** المطابقة تكون (اسم **و** هاتف) أو (هاتف **و** تاريخ ميلاد) أو كود صريح؛ ولو اتطابق واحد فقط → رجّع قائمة مرشّحين للـ UI وخلّي الموظف يختار ("هل هو نفس المريض؟")، مش دمج تلقائي. (`findExistingPatientByNameAgeAndPhone` أقرب للصح.)

### 5.2 `searchPatients` ⇒ تفريغ قاعدة المرضى
`server/db.ts:1441-1516` + `medical-patient.ts:1302-1318` (`clinicalStaffProcedure`):
- `searchTerm: z.string()` بدون حد أدنى؛ سلسلة فاضية أو `%` أو `a` ⇒ `LIKE '%%'` ⇒ **كل** الصفوف.
- مفيش `LIMIT` (التعليق صريح: "Do not silently discard matches").
- كل صف بيمرّ على `attachTreatingDoctor` (5.8) + `decodePatientRow`.
- `%`/`_` مش بيتعمل لهم escape.
- كمان `sheetType` فرع بيجيب **كل** `patientId` من `sheetEntries` ويحطها في `IN (…)` (آلاف القيم).
**الأثر:** (أ) أي حساب clinical (nurse/technician/…) يسحب الاسم/الهاتف/الكود لكل المرضى بطلب واحد (تصدير PII جماعي بدون أي أثر/rate-limit)؛ (ب) كل keystroke في الـ picker ممكن يعمل scan كامل (LIKE `%…%` ما بيستفيدش من index) ⇒ بطء/ضغط على MySQL.
**الإصلاح:** `min(2)` للـ term، `LIMIT` ثابت (50–100) + "عرض المزيد"، escape للـ wildcards، فهرس FULLTEXT أو prefix-LIKE على `patientCode/phone`، وللـ `sheetType` استخدم `EXISTS (SELECT 1 FROM sheetEntries …)` بدل جلب الـ ids. وسجّل (audit/rate-limit) استعلامات البحث الواسعة.

---

## 🟠 Medium

### 5.3 `updatePatient` mass assignment
`medical-patient.ts:1436-1572` → `db.updatePatient` (`db.ts:1615-1706`): `updates: z.record(z.string(), z.any())` ثم `db.update(patients).set(nextUpdates)` بدون whitelist. الحقول "authoritative" بتتفلتر للـ MySQL (بتتحدث عن طريق MSSQL)، لكن أي عمود آخر مسموح: `id` (تغيير الـ PK وكسر كل العلاقات)، `createdAt`, أعلام القفل (`isManuallyLocked`)، `serviceType` … وبيتنادى من `receptionProcedure` (reception + **accountant** + manager).
في المقابل `updateExamination` (`medical-examinations.ts:210-221`) فيه denylist للأعمدة الحساسة — يعني الأسلوب المطلوب معروف عندكم.
**الإصلاح:** zod schema صريح بالحقول المسموحة (`z.object({...}).strict()`).

### 5.4 `getSystemSetting` (`medical-ops.ts:2234-2300`)
`protectedProcedure` (أي مستخدم) + **deny-list** للمفاتيح:
- المفاتيح اللي بتبدأ بـ `mssql_`/`attendance_`/`op_reminder_` + `team_permissions_v1` ممنوعة، **أي مفتاح غيرها مقروء** (مثلاً `app_notifications_feed_v1` = سجل إشعارات فيه أسماء مرضى وأحداث، `app_notification_settings_v1`، `salary_*` config لو متخزنة هنا، أي مفتاح هتضيفه بكرة).
- فحص `appointments_pricing_v1` بيستخدم `input.key === "appointments_pricing_v1"` (حساس لحالة الأحرف)، بينما MySQL collation افتراضي case-insensitive ⇒ `getSystemSetting({key:"APPOINTMENTS_PRICING_V1"})` يتخطى فحص الصلاحية ويرجّع الصف. (استنتاج من الكود؛ لم أشغّله على DB.)
**الإصلاح:** allow-list (خريطة `key → permission`)، `key.trim().toLowerCase()` في كل الفحوصات وفي الاستعلام.

### 5.5 الحذف
- `db.deletePatientWithAllData` (`db.ts:1775+`): عشرات `DELETE` متتالية **بدون transaction**، وبعضها `.catch(() => {})` (يبلع الخطأ). فشل في النص = مريض نصف محذوف.
- `deleteAllPatients` (`medical-ops.ts:558` → `db.ts:8599`): زرّ واحد، `adminProcedure`، بدون حقل تأكيد (`confirm: "DELETE ALL"`) ولا cool-down، وتنفيذه `DELETE FROM patients` (بدون WHERE وبدون transaction) — الرسالة "records preserved" معناها إن الصفوف الفرعية (visits/examinations/…) بتبقى يتيمة (أو تتحذف حسب الـ FK/cascade في الـ DB الفعلي؛ ما اتأكدتش)، ولا فيه نسخة احتياطية تلقائية قبل التنفيذ.
- الـ audit (`DELETE_PATIENT_WITH_DATA`) بيسجّل `patientId` ورسالة ثابتة — **مفيش snapshot** (اسم/كود/عدد السجلات) فمستحيل تعرف مين اتحذف بعد كده. `docs/security.md` بيمنع الحذف التلقائي للملفات الطبية؛ هنا الحذف اليدوي بلا أثر.
- الأخطاء: `throw new Error(\`Failed to delete patient and data: ${error}\`)` — يسرّب نص الخطأ.
**الإصلاح:** `db.transaction`، soft-delete (`deletedAt/deletedBy`) مع purge منفصل، snapshot في الـ audit، تأكيد صريح للـ bulk، وأخطاء TRPCError عامة.

### 5.6 الإيصال في الخلفية
`createPatient` (`medical-patient.ts:254-374` وما يماثله لمسار المريض الجديد): `void (async () => { await pushNewPatientToMssql(...) … })()` — الـ API بيرجّع `success:true` قبل ما الإيصال المالي يتسجّل في MSSQL. فشل الـ push = مريض موجود في MySQL بدون فاتورة وبدون أي مؤشر في الـ UI (بس log + إشعار + audit field `mssqlPushError`). وكمان `createVisit` فيه `.catch(console.error)` ⇒ مريض بلا زيارة والـ API "نجح".
هذا اختيار أداء مقصود ("don't block the response")، لكن لازم **حالة قابلة للمتابعة**: عمود `mssqlPushStatus` (pending/ok/failed) + شاشة "إيصالات فاشلة" + إعادة محاولة آمنة (idempotent بـ `clientRequestId`). (بحثت عن `mssqlPushStatus`/`pushStatus` في `server/` و`schema.ts` — لا وجود لها.)

### 5.7 Audit مفقود على الخدمات
`createPatientServiceEntry`/`updatePatientServiceEntry` (`medical-patient.ts:1133-1200`): تأثير مباشر على تصنيف المريض/العمولات (`patient_service_entries` هي مصدر `serviceType` ومنها الرواتب والمحاسبة) بدون `logAuditEvent`. `deletePatientServiceEntry` (1202-1238) بيحذف من MySQL **ثم** من MSSQL (صف فوترة) بدون audit، وفشل MSSQL بيتحوّل لـ note نصي (`${mssqlError}`) والـ API بيرجّع success، فيحصل divergence بين النظامين. كمان `sourceRef` من العميل (`z.string().min(1)`) بدون تحقق من التفرّد/الصيغة، و`patientId` بدون تحقق وجود.

### 5.8 `attachTreatingDoctor`
`db.ts:2907+`: لكل قائمة (حتى 500 مريض في `getAllPatients`، وكل نتائج `searchPatients`) بيعمل `SELECT data FROM patientPageStates WHERE page='examination' AND patientId IN (…) ORDER BY updatedAt DESC` — **حقل `data` كامل (JSON ضخم)** لكل صف حالة، ويعمل `JSON.parse` لكل واحد داخل Node. حجم الاستجابة/الذاكرة يكبر مع عدد الفحوصات، وهو في الـ hot path لكل صفحة المرضى. (CLAUDE.md نفسه بيعتبره منطقة حساسة.)
**الإصلاح:** استخراج الحقول المطلوبة في SQL (`JSON_EXTRACT`) أو تخزين `latestDoctorName/latestServiceCodes` كأعمدة على `patients` تتحدّث عند حفظ الحالة، وfallback للقراءة القديمة.

### 5.9 `branch` غير مفروض
`users.branch` موجود ويتحط في الـ JWT (`auth.ts:116`) لكن `grep user.branch` في `server/` = لا استخدام في أي query/guard. أي clinical staff يقرأ/يعدّل كل المرضى من كل الفروع. لو الفصل بين الفروع (tanta/kfs/…) مطلوب تنظيمياً، هو حالياً UI-only. (راجع `.claude/rules/permissions.md`.)

---

## 🟡 Low

- **5.10** `getAllPatients` (`db.ts:2515-2601`): `ORDER BY CAST(patientCode AS UNSIGNED), patientCode` + cursor بـ `CAST(...) > x OR (...)` — مفيش index يخدم ده ⇒ filesort/scan عند كل صفحة. أضف عمود مولَّد `patientCodeNum` (STORED) + index `(patientCodeNum, patientCode, id)`.
- **5.11** `saveUserPageState` (`medical-ops.ts:1848`): `page: max(191)` لكن `data: z.any()` بدون حد حجم (الجسم حتى 50MB) وبدون حد على عدد الـ pages لكل مستخدم ⇒ تضخيم الجدول. و`updateSystemSetting` (adminProcedure) `value: z.any()` بدون schema لمعظم المفاتيح (فقط `PRINT_SETTINGS_KEY` متحقق منه).
- **5.12** `medical-patient.ts:400`: `new Date().toISOString().split("T")[0]` = تاريخ UTC. بين 00:00 و02/03:00 بتوقيت القاهرة تبقى "امبارح" ⇒ `resolveInitialQueueStatus`/الزيارة بتتحسب على يوم غلط (نفس عائلة B4 في مراجعة الحضور). استخدم helper محلي.
- **5.13** `console.log` تفصيلي في `createPatient` (`===== START =====`, timing, input ids) + رسائل خطأ بـ `${error}` (`medical-patient.ts:1568`, `medical-mssql.ts:710,730…`, `medical-ops.ts:564`) بتسرّب نص أخطاء DB/MSSQL للـ client.
- **5.14** `createPatient`: `fullName: z.string()` (يقبل `""`/ألف حرف)، `phone: z.string()` (أي نص)، `age: z.number()` (سالب/ألف)، `lastVisit: z.string()` بدون تحقق ⇒ `new Date(lastVisit)` ممكن Invalid Date. `nationalId` بلا فحص (14 رقم). فرّق بين الرقم المصري وغيره بـ `normalizePhoneKey` (موجودة).
- `createAppointment`, `createPentacamResult` (`medical-patient.ts:1787, 1860`): لم أراجعهم بالتفصيل.
- `receptionProcedure` يسمح بـ `accountant` (procedures.ts:112): المحاسب يقدر `updatePatient/createPatient/deletePatientServiceEntry`.

## 🔵 Code / Queries

- `medical-patient.ts` 1898 سطر، `createPatient` ≈ 560 سطر بمسارين (existing/new) شبه متطابقين (نسخ ولصق للـ MSSQL push + notification + visit). استخرج `registerPatientVisit(patient, ctx)`.
- `medical.ts` بيستورد عشرات الرموز اللي غالباً غير مستخدمة (الملف مجرد `router({...spread})`) (helpers من `pentacam-helpers`, `service-helpers`, `xlsx`, `fs`) — الملف 78 سطر لكن بيسحب كل الـ modules (وقت الإقلاع وحجم الـ bundle).
- `decodePatientRow` / `encodeForLegacySearch` (mojibake) على **كل** صف في **كل** قائمة (`searchPatients`, `getAllPatients`): قرّر تنظيف الـ DB مرة واحدة (migration) بدل decode مستمر.
- `getAllPatientsForMatching()` (`db.ts:2491`) يقرأ الجدول كله في الذاكرة — مقبول لـ job، لكن تأكد إنه مش بيتنادى من request عادي.
- تكرار `z.enum([... 12 serviceType ...])` inline (`medical-patient.ts:1328-1343`) مع وجود `PATIENT_SERVICE_TYPES` — استخدمها.

## ما اتأكدت إنه سليم
- كل procedures المريض/الفحص عليها guard (لا `publicProcedure` في `server/routers/medical*`).
- `updateExamination` بيمنع تغيير الأعمدة الهوية (`id/patientId/visitId/examinedBy/createdAt`).
- `uploadDiagnosisImage` (`medical-uploads.ts`): whitelist لـ MIME + فحص signature + حد 20MB + sanitize للاسم + `makePageWriteProcedure` (يتطلب `:rw`) + تقديم الصور عبر `/api/srv100/uploads/:id` بـ nosniff، ومفيش SVG/HTML.
- استعلامات Drizzle parameterized؛ `sql\`\`` tagged templates فقط (لا `sql.raw` في `medical-*`).
- `importReadyTemplateOverridesFromFile` (قراءة ملف بمسار من العميل) محصور في `admin` + امتداد `.xls(x)` + حد 20MB.
- `createPatient` بيتحقق من الصلاحية الفعلية (`/patient-data/edit` | `/quick-entry` | `/new-cases`) فوق الـ role guard.
