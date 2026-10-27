# تقرير مراجعة — موديول 9: Pentacam / صور الفحوصات / S3 / `srv100_uploads`

**النطاق:** `server/routers/medical-pentacam.ts` (1097)، `_medical/pentacam-helpers.ts` (1136)، `_medical/delete-duplicate-uploads.ts`، `server/_core/s3.ts`، مسارات Express في `server/_core/index.ts` الخاصة بـ `srv100_uploads`/`/api/pentacam/*` (راجع تقرير Core 1.3–1.5، 1.11، 1.12)، `services/pentacam.ts`.
**العمق:** `s3.ts` كامل، `assertSafePentacamFileName` + `moveFailedPentacamFile`، `reviewFailedPentacamFile`، `deleteSrv100UploadsByIds`، `autoLinkUnlinkedPentacamFiles`، جرد الـ procedures. محركات المطابقة الصوتية للأسماء (`buildPentacamNameKeys`, `resolvePatientForPentacamFileName`…) **لم تُقرأ تفصيلاً**.
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 9.1 | 🟠 | Clinical safety | الربط التلقائي لصور Pentacam بالمريض عن طريق **مطابقة الاسم الصوتية** بدون تأكيد بشري |
| 9.2 | 🟠 | Audit / Data | `deleteSrv100UploadsByIds` بيحذف سجلات (+ S3 + ملفات محلية) بدون audit |
| 9.3 | 🟠 | Bug | `listObjectsInS3` بدون pagination (حد 1000 كائن) |
| 9.4 | 🟡 | Security | مفاتيح AWS ثابتة (`AWS_ACCESS_KEY_ID/SECRET`) بدل IAM role؛ لا `maxAttempts`/timeouts |
| 9.5 | 🟡 | Perf | تحميل كامل الكائن في الذاكرة (`downloadFromS3`) وتقديمه عبر `Buffer` |
| 9.6 | 🟡 | Validation | `assertSafePentacamFileName` بيرفض أي `..` حتى داخل اسم سليم؛ و`targetFileName` من preview |
| 9.7 | 🟡 | Perf | `getUnlinkedSrv100Uploads(10000)` + `buildPentacamPatientCandidates()` = كل المرضى في الذاكرة |
| 9.8 | 🔵 | Code | `medical.ts` بيستورد ~50 رمز من helpers الـ pentacam غير مستخدمة؛ 18 admin-procedure بدون audit موحّد |

---

## 🟠 Medium

### 9.1 الربط الصوتي التلقائي
`autoLinkUnlinkedPentacamFiles` (`medical-pentacam.ts:1019-1097`): الملفات اللي ما فيهاش كود مريض في الاسم (`extractPatientCodeCandidatesFromFileName` يرجع فاضي) بتمر على `resolvePatientForPentacamFileName(fileName, matcher)` (مطابقة صوتية/توكنز، `normalizePentacamPhoneticToken`…)، وأي نتيجة `matched.patient` بيتعمل لها `linkSrv100UploadsBatch` **مباشرة**. في أسماء مصرية شائعة ("محمد أحمد", "أحمد محمد علي"…) والتحويل الصوتي (`reorderPatientNameSecondThirdFirst`) احتمال ربط صورة قياس القرنية بمريض غلط = صورة مريض بتظهر في ملف مريض تاني، وفي **بوابة الدكتور الخارجي/بوابة المريض** (`getMyScans` بيرجّع كل `srv100_uploads` لـ `patient_id`) — تسريب صورة طبية لمريض غير صاحبها.
المراجعة اللاحقة موجودة (`getMismatchedLocalPentacamLinks`, `unmatched…Suggestions`) لكنها admin-only وبعد الفعل.
**الإصلاح:** الربط بالاسم يكون **اقتراح** فقط (status=`suggested`) لا يظهر للمريض/الدكتور الخارجي إلا بعد تأكيد موظف؛ وبالكود (`PAT_CD` في الاسم) يُربط تلقائياً كما هو. وسجّل `linkedBy: auto-name|auto-code|manual` + درجة الثقة في الجدول للمراجعة.

### 9.2 الحذف بدون أثر
`deleteSrv100UploadsByIds` (`medical-pentacam.ts:992`): `adminProcedure` بس الـ mutation مش بتستخدم `ctx` أصلاً ⇒ **لا `logAuditEvent`**، وبيحذف سجلات `srv100_uploads` (مصدر الصور الطبية) مع خيارات `deleteFromS3`/`deleteLocalFile` (حذف الكائن نفسه — لا رجعة؛ ومفيش versioning مذكور في `docs/security.md` لـ bucket الـ S3 — راجع إن `Versioning` مفعّل، فالـ docs ذكرت Public Access Block/Encryption/CloudTrail ولم تذكر Versioning/Object Lock). الحماية الوحيدة: `deleteDuplicateUploadRecords` بيتحقق إن الـ ids مكررة فعلاً (رسالة "يمكن حذف السجلات…").
**الإصلاح:** audit (ids + file_name + patient_id + s3_key)، تفعيل S3 Versioning (أو Object Lock/Lifecycle للنسخ القديمة)، وافتراضي `deleteFromS3=false`.

### 9.3 `listObjectsInS3` ناقص
`s3.ts:76-93`: `ListObjectsV2Command` مرة واحدة بدون `ContinuationToken` ⇒ بيرجّع أول **1000** كائن بس. الاستخدامات: `buildPentacamPatientPrefix(patient.id)` في `doctorPortal.getPatientImages` (مريض بأكتر من 1000 صورة نادر، لكن مفتوح)، و`/api/pentacam/s3-debug` (`listObjectsInS3("")` = أول 1000 من الـ bucket كله، والـ endpoint بيعرض 200 فقط)، و`medical-pentacam.ts:259` (`getPentacamFilesByPatient` — الشاشة اللي بتعرض ملفات المريض للطاقم) — أي مريض عنده أكتر من 1000 كائن تحت الـ prefix هيشوف ملفات ناقصة بدون أي تنبيه.
**الإصلاح:** loop على `IsTruncated/NextContinuationToken` أو `paginateListObjectsV2`.

---

## 🟡 Low

- **9.4** `s3.ts:21-32`: مفاتيح IAM user ثابتة من env. فضّل IAM role/Instance profile أو على الأقل مفتاح أقل صلاحية (`s3:GetObject/PutObject/DeleteObject/ListBucket` على prefix معيّن)، وrotation دوري (docs/security.md: "access review pending"). ما فيش `requestHandler` بـ timeouts ولا `maxAttempts`.
- **9.5** `downloadFromS3` بيجمع chunks في Buffer (صور Pentacam صغيرة نسبياً؛ لكن `/api/pentacam/exports/file/*` و`srv100/uploads/:id?proxy=1` بيمرّروا كل ملف عبر ذاكرة السيرفر مع `Cache-Control: private, max-age=60`). مع ملفات PDF/TIFF كبيرة (20MB مسموح في الرفع) ضغط على الذاكرة (`max_memory_restart: "750M"` في `ecosystem.config.cjs`!). استخدم stream (`response.Body.pipe(res)`) أو presigned redirect (موجود لـ `srv100`، مش لـ pentacam exports).
- **9.6** `assertSafePentacamFileName` (`pentacam-helpers.ts:827`) بيرفض `..` في أي مكان ⇒ ملف شرعي زي `Ahmed..Ali.jpg` أو `OD..OS.png` يتحجب (False positive). الأفضل `path.basename(x) === x` + منع `\0`. وهو بيستخدم `path.join(PENTACAM_FAILED_DIR, name)` — الفحص كاف لمنع traversal حالياً (جيد)، لكن على Windows أسماء مثل `CON`, `NUL`, `file.jpg:stream` (ADS) غير مغطاة.
- **9.7** `autoLinkUnlinkedPentacamFiles`: `getUnlinkedSrv100Uploads(10000)` + `buildPentacamPatientCandidates()` (يقرأ كل المرضى `getAllPatientsForMatching`) في الذاكرة لكل تشغيل؛ مقبول كـ job (الخدمة الآن standalone: `SELRS_PENTACAM_SERVICE`)، لكن لو اتنادى من request (`autoImportLocalPentacamExports: adminProcedure`) هيعلّق السيرفر.
- `debugPentacamS3` + `/api/pentacam/s3-debug` بيعرضوا مفاتيح الـ bucket (admin-only) — احذفهم من production أو قيّدهم.
- `server/_core/index.ts:2366-2371`: نوع MIME من الامتداد فقط (`.png`/`.webp`/else jpeg) رغم إن S3 key قد يحتوي ملفات PDF/TIFF؛ الصورة المعروضة تتحمّل كـ jpeg.

## 🔵 Code

- نفس سطر `import { copyObjectInS3, deleteFromS3, listObjectsInS3 }` منسوخ في 8 ملفات (`medical*.ts`, `_medical/*`) رغم إن المستخدم الفعلي في `medical-pentacam.ts`/`doctorPortal.ts` فقط. و`medical.ts:65` import سطر واحد بـ ~50 رمز من `pentacam-helpers` — الملف الأصلي (`medical.ts`) صار 78 سطر وبيستورد كل الـ helpers من غير استخدام؛ احذف الـ imports.
- 18 `adminProcedure` في `medical-pentacam.ts` — معظمها بتكتب audit (`REVIEW_FAILED_PENTACAM_FILE` مثلاً مسجّل ✔️)، لكن لا توحيد: `deleteSrv100UploadsByIds` (لا audit)؛ `removePentacamLink` مسجّل ✔️.
- ملفات الصور تُخزَّن إما `file_data` BLOB في MySQL أو S3 (`uploadDiagnosisImage` يرجع للـ BLOB لو S3 فشل): مصدرين للحقيقة يعقّدوا النسخ الاحتياطي (راجع تقرير 11 الخاص بالـ DB).

## ما اتأكدت إنه سليم
- منع path traversal في أسماء الملفات (`assertSafePentacamFileName` + `isUnsafePentacamName` + regex مفتاح `pentacam/patients/<id>/`) قبل أي `readFile/rename/S3`.
- S3: `ServerSideEncryption: AES256` على الرفع والنسخ، `getPresignedUrlFromS3` بحد 60–3600 ثانية (موثّق في docs/security.md)، و`copyObjectInS3` بيعمل `encodeURIComponent` للمفتاح.
- التحقق من ملكية الملف (`canReadSrv100Upload`) قبل التقديم (مع تحفّظ 1.5 في تقرير Core).
- `reviewFailedPentacamFile` بيكتب audit (`REVIEW_FAILED_PENTACAM_FILE`) ومعاه الاسم النهائي وعلامة التكرار.
