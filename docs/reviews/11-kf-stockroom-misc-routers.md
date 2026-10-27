# تقرير مراجعة — موديول 11: KF (فرع كفر الشيخ) + المخزن (Stockroom) + راوترات صغيرة (opHistory / legacyPatients / shiftStaff)

**النطاق:** `server/routers/kf.ts` (1126)، `stockroom.ts` (374) + `db.ts` (`insertStockTransaction`, …)، `opHistory.ts`، `legacyPatients.ts`، `shiftStaff.ts`.
**العمق:** `kf.ts`: رأس الملف + الـ ledger + `uploadExamImage/listExamImages` + الجرد؛ باقي إجراءات CRUD لـ KF ما قرأتهاش سطر بسطر. `stockroom.ts`: قراءة ~60% (الاستقبال/الصرف/التعديل/الحذف) + `insertStockTransaction`. `opHistory`/`legacyPatients`: كاملين تقريباً. `shiftStaff`: جرد guards فقط.
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 11.1 | 🔴 | Privacy / Data leak | صور فحص KF بتتخزن بـ `patient_id = kfPatientId` في `srv100_uploads` ⇒ تتعرض لمريض **آخر** في النظام الرئيسي بنفس الرقم (بوابة المريض/الدكتور الخارجي) |
| 11.2 | 🟠 | Security | `kf.uploadExamImage`: بدون whitelist MIME/signature ⇒ رفع `text/html`/`svg` يتقدّم inline من نفس الـ origin (XSS مخزّن) |
| 11.3 | 🟠 | Bug | المخزن: `insertStockTransaction` بدون قفل صف ⇒ lost-update على الكميات |
| 11.4 | 🟠 | Validation | المخزن: `quantity: z.number()` بدون `positive/int` ⇒ صرف سالب يزوّد المخزون، واستلام سالب ينقصه |
| 11.5 | 🟠 | Audit | `kf.ts` (دفتر KF + عمليات + مرضى)، `stockroom.ts`، `shiftStaff.ts`: **صفر** `logAuditEvent` رغم الحذف الصلب |
| 11.6 | 🟡 | Perf | `stockroom.getItems` بيحمّل 10,000 حركة في كل استدعاء لإيجاد آخر سعر |
| 11.7 | 🟡 | Business | أسعار KF hardcoded (`KF_PRICES`: 465/215) |
| 11.8 | 🟡 | Authz | `opHistory` قراءة المرضى/العمليات مفتوحة لأي مستخدم مسجّل (8 `protectedProcedure`) |
| 11.9 | 🟡 | Bug / Ops | `legacyPatients`: اتصالات خام بالصلاحيات الكاملة للـ DB الرئيسي + pagination بدون ترتيب للسنة الحالية |
| 11.10 | 🔵 | Code | `makeKfWriteProcedure`/`makeStockroomWriteProcedure`: bare path = كتابة (تقرير Core 1.9) |

---

## 🔴 High

### 11.1 تضارب مساحة `patient_id` بين KF والنظام الرئيسي
`kf.ts:942-985` (`uploadExamImage`):
```ts
INSERT INTO srv100_uploads (patient_id, …, source_printer)
VALUES (${input.kfPatientId}, …, 'kf-exam')
```
`srv100_uploads.patient_id` هو `patients.id` (النظام الرئيسي، `selrs26.patients`)، بينما `kfPatientId` هو `kf_patients.kfPatientId` — **مساحتان أرقام مختلفتان**. ملف KF لمريض رقم 37 بيتخزن كأنه ملف مريض رقم 37 في النظام الرئيسي.
أي قارئ بيفلتر بـ `patient_id` فقط (بدون `source_printer`) بيجيب الصورة لمريض غريب:
- `patientPortal.getMyScans` (`patientPortal.ts:244-250`): `WHERE patient_id = ? ORDER BY id DESC LIMIT 100` — **مريض الواجهة العامة** (login ضعيف، تقرير 6.1) يشوف صور فحص مريض KF.
- `doctorPortal.getPatientImages` (`doctorPortal.ts:344-350`): نفس الاستعلام ⇒ دكتور خارجي مسند للمريض #37 يشوف صور مريض KF مش مسند له.
- `canReadSrv100Upload(req, row.patient_id)` (`index.ts:998`) بيسمح لمريض/دكتور مطابق للرقم بتحميل الصورة نفسها.
- `/api/srv100/uploads` (قائمة الموظفين) و`srv100` OCR-linking بتخلط الاتنين.
(المسارات اللي بتفلتر بـ `source_printer = 'diagnosis-upload'`/`'kf-exam'` سليمة — `medical-uploads.ts`, `kf.listExamImages`.)
**الإصلاح:** عمود `owner_system ENUM('main','kf')` أو `kf_patient_id` منفصل (أو جدول `kf_uploads`)، وأي قارئ عام يضيف `source_printer NOT IN ('kf-exam', …)`/`owner_system='main'` فوراً. وراجع البيانات الحالية: `SELECT patient_id, COUNT(*) FROM srv100_uploads WHERE source_printer='kf-exam' GROUP BY patient_id` وقارنها مع `patients.id` لتعرف حجم التسريب الفعلي.

---

## 🟠 Medium

### 11.2 رفع ملفات KF بلا فحص
`kf.uploadExamImage`: `mimeType: z.string().min(1)` (أي قيمة)، لا فحص signature، لا whitelist (بخلاف `medical-uploads.ts` اللي عنده الاتنين). الملف بيتخزن بـ `mime_type` اللي المستخدم كتبه، وبيتقدم من `/api/srv100/uploads/:id` بـ `Content-Type` ده و`Content-Disposition: inline` (تقرير Core 1.12) ⇒ موظف KF (أو حساب مخترَق) يرفع `text/html` فيه JS ويقنع مستخدم تاني (أدمن) يفتح الرابط ⇒ تنفيذ سكريبت في origin التطبيق (CSP عندكم `script-src 'unsafe-inline'`). **الإصلاح:** نفس `ALLOWED_MIME_TYPES` + `matchesImageSignature` من `medical-uploads.ts` (استخرجهم لـ helper مشترك)، وفي الـ GET أرغم `attachment` لأي نوع غير صورة.

### 11.3 lost-update في المخزن
`db.ts:9071-9110` `insertStockTransaction`: داخل transaction لكن `SELECT … FROM stockItems WHERE id=?` **بدون `FOR UPDATE`**. في REPEATABLE READ (افتراضي InnoDB) صرفين متزامنين على نفس الصنف بيقرأوا نفس `quantity` ويكتب كل واحد `quantity - n` ⇒ واحد من الصرفين بيضيع (المخزون أعلى من الحقيقي) وبيتخطى فحص `Insufficient stock`. نفس الشيء في `updateStockTransaction`.
**الإصلاح:** `.for("update")` على الـ select، أو update ذرّي: `UPDATE stock_items SET quantity = quantity - ? WHERE id = ? AND quantity >= ?` والتحقق من `affectedRows`.

### 11.4 كميات سالبة
`stockroom.ts` `receiveStock`/`dispenseStock`: `quantity: z.number()`.
- `dispenseStock({quantity: -50})`: فحص `item.quantity < input.quantity` بيعدّي، `newQuantity = q - (-50) = q + 50` ⇒ **زيادة مخزون مسجّلة كـ "صرف (بيع)"**.
- `receiveStock({quantity: -10})`: `type:"add"` ينقص المخزون ويظهر كاستلام.
- كسور (`2.5`) لو العمود int فيتقص بصمت.
في سياق مخزن أدوية/مستلزمات عمليات، ده بيسمح بإخفاء عجز. **الإصلاح:** `z.number().int().positive().max(100000)`، و`unitPrice/totalValue` `min(0)` و `totalValue` يُحسب من السيرفر (حالياً من العميل: `input.totalValue` بيتخزّن زي ما هو بدون مقارنة بـ `quantity × unitPrice`).

### 11.5 صفر Audit
`grep logAuditEvent` = 0 في `kf.ts`, `stockroom.ts`, `shiftStaff.ts`. موجود في `kf`: `deleteOperation`, `deleteFollowup`, حذف قيود `kfLedger` (`kf.ts:830-833`) — **حذف صلب لقيود مالية** — وتعديل بيانات مرضى KF؛ وفي المخزن `deleteItem` (حذف صنف بحركاته؟ راجع `db.deleteStockItem`) و`updateTransaction/deleteTransaction`. `stock_transactions.performedBy` (username نصي) هو الأثر الوحيد، و`updateTransaction` بتعدّل الكمية/السعر/الاسم/الوجهة لحركة قديمة (وبتعيد حساب الرصيد) بدون تسجيل القيمة السابقة. **الإصلاح:** middleware audit مركزي (يُقترح في تقرير 2.5/3.1) + soft-delete.

---

## 🟡 Low

- **11.6** `stockroom.getItems` (`stockroom.ts:~120`): `db.getStockTransactions(10_000)` في **كل** استدعاء ثم حلقة لإيجاد آخر سعر لكل صنف؛ نفس النمط في دالة الـ reference-matching (سطر ~50). مع نمو الحركات بيبقى O(10k) × كل فتح للصفحة، وبعد 10k حركة الأسعار القديمة بتختفي (الصنف اللي آخر سعر له قبل أكتر من 10k حركة يظهر بدون سعر). استخدم subquery/`MAX(id)` لكل صنف أو عمود `lastUnitPrice` على `stock_items`.
- **11.7** `KF_PRICES = { consultation: 465, examination: 215 }` (`kf.ts:63`) مستخدمة في 6 أماكن لحساب الإيرادات/التقارير ⇒ تغيير السعر = deploy، وتقارير تاريخية بتتغير بأثر رجعي (لا snapshot للسعر وقت الزيارة). خزّن السعر على الزيارة (`kfVisits.fee`) أو جدول أسعار بتواريخ سريان.
- **11.8** `opHistory.getTypeCounts/getLinkedOperationTypes/listByType/getSuggestedOperationType/getServiceCodeMappings/listUnmappedServiceCodes` = `protectedProcedure` (أي دور بما فيهم `worker/supervisor`) وبترجّع قوائم مرضى بعملياتهم (`listByType` فيها `query` بحث بالاسم). الكتابة (`addManual`) محمية صح بـ `assertCanEditPatientData`. اعمل القراءة `clinicalStaffProcedure` أو page permission.
- **11.9** `legacyPatients.getYearConnection` (`legacyPatients.ts:31-45`): `mysql.createConnection(DATABASE_URL بتغيير الـ pathname)` = نفس بيانات اعتماد التطبيق (صلاحيات كاملة) رغم إن الخدمة "read-only lookup". استخدم مستخدم MySQL `SELECT` فقط لقواعد السنوات القديمة. الاتصال واحد لكل سنة (ما فيهوش reconnect عند الانقطاع غير الـ ping، ولا timeout). في فرع 2026: `LIMIT/OFFSET` **بدون `ORDER BY`** ⇒ صفحات متداخلة/ناقصة. و`SELECT *` من `patients` (كل الأعمدة) بيرجع للـ client.
- `shiftStaff.ts`: guards سليمة (`makePageWriteProcedure`/`makeSalaryWriteProcedure`)، لا audit؛ تعديل `ratePerShift` (أجر الشفت) بدون أثر.
- `stockroom.syncEyeDropsWithEgyptianReference` (`stockroom.ts:~75-115`): بيغيّر **اسم وسعر** الأصناف تلقائياً من مرجع الأدوية (match بنسبة confidence) بحد أقصى 10,000 صنف في طلب واحد، بدون عتبة ثقة دنيا ولا مراجعة بشرية (الـ preview موجود في الإجراء السابق، لكن الـ mutation لا يعيد التحقق من الـ confidence وقت التنفيذ) — غلط مطابقة = تغيير اسم دواء لدواء آخر.

## 🔵 Code

- نمط `insertIdOf`/`resolveInsertId` متكرر في `kf.ts`, `medical-patient.ts`, `salary.ts`, `medical-uploads.ts`: helper واحد في `db.ts`.
- `z.string()` بدون `max` في معظم مدخلات المخزن (`name`, `supplier`, `itemCode`) — الأعمدة varchar فالطويل سيفشل بخطأ SQL بدل رسالة validation.
- `stockroom.ts` بيستورد `db` كـ namespace لكن بعض الدوال بتستدعي `db.getStockItemById` ثم `insertStockTransaction` (قراءة ثم كتابة خارج transaction) — اجمعهم.

## ما اتأكدت إنه سليم
- كل procedures KF/المخزن/الشفتات عليها guards لكل صفحة (`makeKf*`, `makeStockroom*`, `makeSalary*`) مع فصل قراءة/كتابة.
- `insertStockTransaction` بيستخدم transaction ويرفض الرصيد السالب (`Insufficient stock quantity`) — النقص فقط في القفل (11.3).
- `kf.listExamImages` و`medical.getPatientDiagnosisUploads` بيفلتروا بـ `source_printer` (التسريب في القراء العامين فقط).
- `kf.ts`: استعلامات Drizzle/`sql` tagged؛ `IN (${sql.join(ids)})` parameterized.
- `legacyPatients.search`: صلاحية صفحة صريحة (`/admin/legacy-patients`) + `year` enum (لا تركيب أسماء قواعد من مدخل المستخدم) + `LIKE ?` parameterized.
