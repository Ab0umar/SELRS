# تقرير مراجعة — موديول 10: طبقة البيانات (`server/db.ts` + `drizzle/schema.ts` + migrations + الجلسات/rate-limit)

**النطاق:** `server/db.ts` (9241 سطر)، `drizzle/schema.ts` (129 جدول)، `drizzle/*.sql` + `meta/_journal.json`، `server/_core/systemRouter.ts` (applyMigrations)، جداول `auth_sessions`, `login_rate_limits`, `patient_portal_sessions`, `audit_logs`.
**العمق:** `getDb/pool`، `consumeLoginRateLimit`، `logAuditEvent`، `updatePatient`، `searchPatients/getAllPatients/attachTreatingDoctor`، حذف المرضى، تحليل آلي (script) لفهارس/مفاتيح الـ schema. باقي دوال `db.ts` (≈300 دالة) ما اتقرأتش واحدة واحدة.
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 10.1 | 🔴 | Security | `consumeLoginRateLimit` غير ذرّي (read-then-write) ⇒ التجاوز بالتوازي (batch/concurrency) |
| 10.2 | 🟠 | Perf / Integrity | الجداول المركزية (`patients`, `visits`, `examinations`, `sheetEntries`, `prescriptions`, …) **بدون أي فهرس** في schema/migrations، و 4 foreign keys فقط من 129 جدول |
| 10.3 | 🟠 | Data integrity | الحذف المتسلسل يدوي بلا transaction (5 `transaction()` فقط في `db.ts`) |
| 10.4 | 🟠 | Reliability | `pool.connectionLimit=10` بدون `queueLimit`/query timeout + اتصالات مخصّصة لـ advisory locks ⇒ خطر starvation/deadlock |
| 10.5 | 🟡 | Hygiene | لا تنظيف لـ `auth_sessions` / `login_rate_limits` / `patient_portal_sessions` المنتهية |
| 10.6 | 🟡 | Migrations | سجل الـ migrations مختلط (`0000_*`, `00017_*`, أسماء بدون رقم) + `applyMigrations` يبلع أخطاء |
| 10.7 | 🟡 | Dead schema | جدول `patient_portal_otps` (OTP) غير مستخدم — والدخول بدون OTP |
| 10.8 | 🟡 | Audit | `logAuditEvent` بدون try/catch: فشل الـ audit بيرجّع خطأ بعد تنفيذ العملية فعلاً؛ لا ربط بالمستخدم/IP |
| 10.9 | 🔵 | Code | `db.ts` 9241 سطر (docs/security.md بالفعل بيطلب تقسيمه)، encoding خادع (`decodeMojibake`) على كل قراءة |

---

## 🔴 High

### 10.1 الـ rate-limit غير ذرّي
`db.ts:5137-5160`:
```ts
const [existing] = await database.select().from(loginRateLimits).where(eq(key)).limit(1);
const attempts = existing && existing.resetAt > now ? existing.attempts + 1 : 1;
await database.insert(loginRateLimits).values({ key, attempts, resetAt })
              .onDuplicateKeyUpdate({ set: { attempts, resetAt } });
```
بين الـ `SELECT` والـ `UPSERT` أي طلب متزامن بيقرأ نفس القيمة القديمة ⇒ بيكتب نفس `attempts+1` ⇒ **N طلب متزامن بيتحسبوا كمحاولة واحدة**. المستخدمين: `doctorPortal.login`, `patientPortal.login` (الاتنين بيعتمدوا على الدالة دي **فقط**) و`/api/auth/login` (`auth.ts` — بيجمعها مع عدّاد في الذاكرة بـ `Math.max`، فالضرر أقل هناك).
**كيف يُستغل:** tRPC batching بيشغّل الـ procedures في الـ batch بالتوازي (`Promise.all`)؛ طلب واحد فيه 200 استدعاء `patientPortal.login` بنفس (IP, phone) ⇒ المحاولات الـ 200 بتقرا الصف قبل ما حد يكتب فيه، فالعدّاد بيرتفع بمقدار ≈ حجم الـ pool (10) بدل 200 — تضخيم ×10–×20 للمحاولات المسموحة لكل نافذة 15 دقيقة، وده مضاف لثغرة الـ limiter الخارجي (تقرير Core 1.1). مع كود مريض تسلسلي (تقرير 6.1) ده يخلّي تخمين الكود عملي أكتر.
**الإصلاح (ذرّي):**
```sql
INSERT INTO login_rate_limits (`key`, attempts, resetAt) VALUES (?, 1, DATE_ADD(NOW(), INTERVAL ? SECOND))
ON DUPLICATE KEY UPDATE
  attempts = IF(resetAt > NOW(), attempts + 1, 1),
  resetAt  = IF(resetAt > NOW(), resetAt, VALUES(resetAt));
SELECT attempts FROM login_rate_limits WHERE `key` = ?;   -- نفس الـ connection/transaction
```
وعطّل batching لإجراءات الدخول أو قيّد `maxBatchSize` على السيرفر.

---

## 🟠 Medium

### 10.2 لا فهارس ولا قيود مرجعية
تحليل آلي لـ `drizzle/schema.ts` (+ بحث في كل `drizzle/*.sql` وسكريبتات `server/scripts`):
- `patients`: **لا `(table) => …` أصلاً** — الفهرس الوحيد الـ unique على `patientCode`. لا فهرس على `phone` (يستخدمه **تسجيل دخول المريض العام** `patientPortal.login` وبحث التكرار `findExistingPatientByPhoneAndDob`)، ولا `fullName`, `doctorCode` (بوابة الدكتور: `patients.doctorCode = ?`), `serviceType`, `lastVisit`.
- بدون أي فهرس: `visits(patientId)`, `examinations(patientId, visitId)`, `sheetEntries(patientId)`, `prescriptions`, `testRequests`, `pentacamResults`, `doctorReports`, `glassesRecords`, `autorefractometryData`, `surgeries`, `appointments`, `postOpFollowups`, `consentForms`, `medicalHistoryChecklist`، `userPageStates`.
- Foreign keys: 4 فقط (`references(` ×4، كلها `→ examinations` `cascade`) من 129 جدول. باقي العلاقات (`visits.patientId`, …) بالاتفاق فقط ⇒ سجلات يتيمة (متوقعة بعد `deleteAllPatients`: `DELETE FROM patients` وبس) وبدون حماية من حذف أب له أبناء.
الحجم الحالي صغير نسبياً لأن قاعدة كل سنة منفصلة (`selrs26`)، فالأثر مش ملموس اليوم؛ لكن `patientPortal.login` (عام، بدون auth) بـ `WHERE phone = ?` على عمود غير مفهرس = أول نقطة هتتأثر مع النمو أو مع هجمة. (`user_permissions` سليم: له PK مركّب `(userId, pageId)`.)
**الإصلاح:** migration واحدة تضيف الفهارس (`ALTER TABLE … ADD INDEX …` بـ `--> statement-breakpoint`، بدون `NOT NULL`)، وابدأ بـ: `patients(phone)`, `patients(doctorCode)`, `visits(patientId, visitDate)`, `examinations(patientId)`, `examinations(visitId)`, `sheetEntries(patientId, sheetType)`. وأضف FKs تدريجياً (`ON DELETE RESTRICT`/`CASCADE` حسب الجدول) بعد تنظيف اليتامى (`LEFT JOIN … WHERE parent.id IS NULL`). تحقق أولاً من الـ DB الفعلي: `SHOW INDEX FROM patients;` — ممكن تكون الفهارس موجودة يدوياً في الإنتاج وغايبة عن الـ schema (drift) — وده نفسه يحتاج إصلاح.

### 10.3 الحذف بلا transaction
`deletePatientWithAllData` (`db.ts:1775-~1900`): ≥ 15 `DELETE` متتالية على جداول مختلفة، بعضها `.catch(() => {})`. فشل في النص (deadlock/timeout/اتصال) = مريض بدون فحوصات لكن له سجل، أو العكس، ولا توجد طريقة تعرف إيه اتحذف. في كل `db.ts` 5 استدعاءات `.transaction(` فقط لـ 9241 سطر؛ العمليات المركّبة المهمة (إنشاء مريض + زيارة + service entries، `deleteVisitWithAllData`, `replaceReadyPrescriptionTemplates`, `bulk*`) محتاجة مراجعة.

### 10.4 حجم الـ pool
`getDb` (`db.ts:484-500`): `connectionLimit: 10`، لا `queueLimit` (غير محدود افتراضياً)، لا `maxIdle/idleTimeout`، ولا timeout على الاستعلامات. استهلاك متزامن: كل request (2–4 استعلامات: auth + permissions + body)، + `startMssqlSyncScheduler` (كل 30ث) + `attendanceSyncScheduler` + `materializerMutex` (بيحجز connection **طول مدة العمل** عبر `getDbConnection()` وبعدين بيفتح `db.transaction` = connection تاني) + ADMS push + auto-reply worker + marketing scheduler.
لو 10 مهام خلفية ماسكة اتصالات (أو قفلين advisory) ومحتاجين connection إضافي ⇒ **deadlock** (كل واحد بينتظر connection ماسكه التاني) وكل طلبات الويب تتعلّق في الطابور اللانهائي.
**الإصلاح:** `connectionLimit` 20–30 (حسب `max_connections`)، `queueLimit` (مثلاً 200) + رسالة 503 واضحة، pool منفصل صغير للـ locks/jobs، و`SET SESSION max_execution_time`.

---

## 🟡 Low

- **10.5** لا purge لـ: `auth_sessions` (سنة لكل login + صف جديد لكل تسجيل دخول)، `login_rate_limits` (key فيه `username/phone` من المستخدم ⇒ صفوف جديدة بإدخال أي نص)، `patient_portal_sessions` (30 يوم)، `whatsapp_inbound_messages.rawPayload`. (`purgeExpiredConversations` موجود للـ auto-reply فقط.) اعمل job يومي `DELETE … WHERE expiresAt < NOW() - INTERVAL 7 DAY LIMIT 5000`.
- **10.6** `drizzle/` فيه 99 ملف SQL بأنماط تسمية مختلفة (`0000_groovy_marvex.sql`, `0000_vengeful_living_tribunal.sql` [اتنين بنفس الرقم], `00017_add_attendance_tables.sql`, `ai_whatsapp_copy.sql` بدون رقم)، و`applyMigrations` (`systemRouter.ts:178-242`) بيرتّب بـ `journal` ثم "extras" أبجدياً — الترتيب بين ملفات غير مدرجة في الـ journal يعتمد على الاسم. + بيبلع `ER_DUP_FIELDNAME/ER_DUP_KEYNAME/ER_TABLE_EXISTS_ERROR/ER_CANT_DROP_FIELD_OR_KEY` ⇒ migration نصف فاشلة تتسجّل كناجحة. ومفيش lock ضد تشغيلين متزامنين. وثّق ترتيباً صارماً أو ارجع لـ `drizzle-kit migrate` الرسمي.
- **10.7** `patientPortalOtps` (OTP + `attempts`) معرَّف ومفهرس لكن `grep` في `server/` و`client/src` ⇒ لا استخدام. إما نفّذ OTP (توصية تقرير 6.1) أو احذف الجدول.
- **10.8** `logAuditEvent` (`db.ts:8886`) بيعمل `await createAuditLog` بدون try/catch: عملية حذف مريض اتنفذت ثم فشل الـ audit ⇒ المستخدم يشوف "Failed" والمريض اتحذف. من ناحية تانية، `adminId` فقط (لا IP، لا user-agent، لا request id) و`changes` JSON نصي بدون حد حجم. قرّر: audit داخل نفس الـ transaction للعمليات الحرجة، و`best-effort` للباقي مع log.
- `getEffectiveUserPermissions` = `getUserPermissionState` + `getRoleDefaultPermissions` استعلامين على **كل** procedure (تقرير 1.21) — ممكن cache.
- `getAllPatientsForMatching` / `getUnlinkedSrv100Uploads(10000)` / `getAllPatients(500)` = تحميل كبير في الذاكرة (راجع 5.8, 9.7).

## 🔵 Code

- `db.ts` 9241 سطر (≈330 دالة): مستخدمين، مرضى، فحوصات، حضور، رواتب، مخزن، rate-limit، audit، تسويق… قسّمه لـ `db/users.ts`, `db/patients.ts`, … مع إعادة تصدير من `db.ts` (توافق خلفي) — كما هو مقترح في `docs/security.md` ("characterization tests first").
- `decodePatientRow`/`decodeMojibake` على كل قراءة + `encodeForLegacySearch` على كل بحث (`db.ts:440-460`): دفع تكلفة CPU مستمرة بسبب بيانات قديمة؛ migration لمرة واحدة أرخص (CLAUDE.md بيحذّر من التعديل بدون فهم المسار — اعمل script تحويل + اختبار ثم أزل الـ decode).
- كل `getDb()` بيرجّع `null` لو لا `DATABASE_URL` فيتحوّل الخطأ لـ `Database not available` عام في 300 مكان؛ ضع health check عند الإقلاع يفشل بوضوح.
- `timezone: "local"` (`db.ts:493`) ← كل أخطاء الـ UTC-vs-local في الحضور/الرواتب/`toISOString().split("T")[0]` (تقارير 3,4,5) جذرها واحد: مفيش helper تاريخ موحّد. أنشئ `shared/dates.ts` (`todayCairo()`, `ymdLocal(d)`) وامنع `toISOString().slice(0,10)` بـ eslint rule.

## ما اتأكدت إنه سليم
- `auth_sessions` فيه فهرس على `user_id` و`isAuthSessionActive` بيفحص `revokedAt` + `expiresAt` + `userId`.
- `patientPortalSessions.token` فيه unique index؛ `uq_punch` على الحضور.
- `encryptedText` (AES-256-GCM) للتوكنات.
- استعلامات Drizzle parameterized؛ `sql\`\`` tagged templates في `db.ts` (حتى `LIKE`, `IN`).
- الـ cursor pagination في `getAllPatients` سليم منطقياً (codeNum + code + id) رغم تكلفته (10.2).
