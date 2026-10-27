# تقرير مراجعة — موديول 2: Accounting (المحاسبة / الخزنة / إيصالات MSSQL)

**النطاق:** `server/routers/accounting.ts` (2124 سطر), `server/services/accounting/*` (13 ملف), `shared/accounting/contracts.ts`.
**الأدوات:** قراءة يدوية كاملة لـ `accounting.ts` + فحص الـ services. أثبتّ الـ injection بتوليد الـ SQL النهائي في Node (من غير تشغيل على DB).
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 2.1 | 🔴 | Security | SQL Injection في كل endpoints الـ Access ledger (`buildDateWhere` + `sq()`) عن طريق backslash |
| 2.2 | 🔴 | Security | Second-order injection / DoS في `findEquivalentMirror` (notes مخزّنة بـ `\`) |
| 2.3 | 🔴 | Bug / Money | `deleteReceipt`: يحذف كل الصفوف بنفس `TR_NO`، بدون transaction، بدون audit، و`op2026` hardcoded |
| 2.4 | 🟠 | Bug / Money | `addPatientServices`: بيكتب MSSQL ثم MySQL بدون atomicity/idempotency (ضغطتين = إيصالين) |
| 2.5 | 🟠 | Security | صفر audit log على أي عملية مالية (إضافة/تعديل/حذف) |
| 2.6 | 🟠 | Bug | الـ `total` المخزّن في accHome/accInstapay/accLoans/accAdvances/accSaadany بيتحسب من آخر صف (race + بيبوظ عند update/delete) |
| 2.7 | 🟠 | Perf | `recalcLedgerTotals` = UPDATE بـ window function على كل الجدول مع كل add/update/delete |
| 2.8 | 🟠 | Bug | `updateReceipt` / `editReceiptServiceLine` بدون حدود/تحقق مالي (paid > total، discount > price، قيم عشرية) |
| 2.9 | 🟡 | Security | تسريب `e.message` لـ client + `console.debug` بيطبع patient codes/SQL |
| 2.10 | 🟡 | Validation | `txDate`/`dateFrom`/`dateTo` = `z.string()` بدون regex في كل الـ mutations |
| 2.11 | 🟡 | Bug | `syncAccMirrors`: N+1 queries (3–5 لكل صف) وبدون transaction |
| 2.12 | 🔵 | Code | ~29 تكرار لـ `replace(/'/g,"")` + 12 تعريف مكرر لـ `sq()`؛ الملف 2100+ سطر؛ استخدام `sql.raw` بدل params |
| 2.13 | 🔵 | Code | منطق عربي hardcoded (أسماء أشخاص/كلمات) في `autoMirrorEntity` / `classifyExpense` |

---

## 🔴 High

### 2.1 SQL Injection عن طريق backslash
**الملفات/الأسطر:** `accounting.ts:2117-2122` (`buildDateWhere`), `552`, `601-618`, `752`, `851`, `919`, `989`, `1036`, وكل الـ `sq()` المحلية (`308, 1262, 1312, 1404, 1443, 1475, 1510, 1574, 1611, 1706, 1736, 1765, 1794, 1886, 1962`).

الكود بيحمي بـ:
```ts
`txDate >= '${dateFrom.replace(/'/g, "")}'`          // بيشيل ' بس
`'${String(v).replace(/'/g, "''")}'`                  // بيضاعف ' بس
```
في MySQL (الـ default sql_mode، من غير `NO_BACKSLASH_ESCAPES`) الـ `\` بتعمل escape للـ `'` اللي بعدها. فقيمة بتنتهي بـ `\` بتاكل الـ quote الختامي وبعدها يتحوّل الـ literal التاني لـ SQL خام.

**إثبات (ناتج فعلي من تشغيل `buildDateWhere`):**
```
dateFrom = "\"                                  dateTo = " UNION SELECT 1,2,3,4,5,6,7,8,9 FROM users -- "
→ SELECT * FROM accLedger WHERE txDate >= '\' AND txDate <= ' UNION SELECT 1,2,3,4,5,6,7,8,9 FROM users -- '
```
الـ literal بقى `' AND txDate <= '` وباقي الجملة SQL خام.

**الأثر:**
- **القراءة:** أي مستخدم عنده `/accounting/ledger` (أو cashbook/expenses… أي صلاحية قراءة) يقدر يسحب `users.password` (bcrypt hashes) وأي جدول: مرضى، رواتب، إلخ. `accLedger` (`accLedger`, `accExpenses`, `accLedgerSummary`) كلهم بياخدوا `dateFrom/dateTo: z.string()`.
- **الكتابة:** في الـ INSERT/UPDATE (مثلاً `addAccEntry`: حقلين string متتاليين `notes` ثم `remarks` — notes=`x\` و remarks=`,(SELECT ...)) -- `) تقدر تحقن subquery يتخزّن في الجدول وتقرأه من `accLedger`.
- `mysql2` مش `multipleStatements` (بحثت: مفيش) فالـ stacked queries مش متاحة، لكن UNION/subselect كفاية.

**الإصلاح (الصحيح):** ماتعالجش بالـ escaping. استخدم params:
```ts
import { sql } from "drizzle-orm";
const conds = [];
if (dateFrom) conds.push(sql`txDate >= ${dateFrom}`);
if (dateTo)   conds.push(sql`txDate <= ${dateTo}`);
const where = conds.length ? sql` WHERE ${sql.join(conds, sql` AND `)}` : sql``;
await db.execute(sql`SELECT ... FROM accLedger${where} ...`);
```
وللـ INSERT/UPDATE: `db.insert(accLedger).values({...})` من Drizzle schema أو `sql\`... VALUES (${a}, ${b})\``. للـ LIKE: `sql\`notes LIKE ${'%' + q.replace(/[%_\\]/g, '\\$&') + '%'}\``. ضيف على الـ zod: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` لكل التواريخ.
**اختبار مطلوب:** unit test بقيمة تنتهي بـ `\` لكل endpoint.

> أولوية قصوى: ده أخطر بند في المراجعة كلها حتى الآن. يُصلَّح قبل أي حاجة تانية.

### 2.2 Second-order في `findEquivalentMirror`
`accounting.ts:2086-2091`: بيقرأ `notes` من DB (اتخزّنت بالـ `sq()`، يعني ممكن تحتوي `\` في آخرها) ويعمل لها `replace(/'/g,"''")` تاني ويحطها داخل `COALESCE(notes,'')='${safeNotes}'`. نفس الثغرة: أي صف notes بتنتهي بـ `\` → syntax error يوقّف `syncAccMirrors` بالكامل (DoS)، أو injection لو المحتوى مصمَّم. حتى ملاحظة عادية بتنتهي بـ `\` (كتابة يدوية) كافية تكسره.
**الإصلاح:** params. (`txDate`/`amount` نفس الحكاية: `safeAmount = Number(amount)` ممكن يكون `NaN` فيطلع `advance=NaN`.)

### 2.3 `deleteReceipt` خطير ماليّاً
`accounting.ts:429-468`
1. `DELETE FROM PAJRNRCVH WHERE PAT_CD=@PAT_CD AND TR_NO=@TR_NO` — الفلتر مفيهوش `SEC_CD`/`TR_TY` رغم إن باقي الكود (`lasikCost`: join على `SEC_CD, TR_TY, TR_NO`) بيعتبر المفتاح الثلاثي. نفس `TR_NO` ممكن يتكرر بين أنواع (سداد/استرجاع…) → حذف إيصالات تانية لنفس المريض.
2. `DELETE FROM op2026.dbo.PAPAT_SRV WHERE PAT_CD=… AND VST_NO=…` — بيمسح **كل** خدمات الزيارة (حتى لو في إيصال تاني في نفس الزيارة).
3. مفيش transaction بين الـ DELETE الاتنين؛ فشل التاني = رأس بدون تفاصيل أو العكس.
4. `op2026` hardcoded في السطر 461 بينما `getMssqlPatientsTable()` (معمولة تقبل `opNNNN`) → في 2027 الحذف يروح للـ DB الغلط. (نفس hardcoding في `integrations/mssqlPatients.ts:13,623-1013` — راجع موديول MSSQL.)
5. مفيش audit ولا soft-delete ولا تأكيد من السيرفر (مجرد `trNo` + `patientCode`).
**الإصلاح:** transaction (`new sql.Transaction(pool)`)، فلتر بـ `SEC_CD`+`TR_TY`+`TR_NO`، استخرج الـ DB name من `getMssqlPatientsTable()`، سجّل audit (مين/إيه/قبل-بعد)، والأفضل `CNCL=1` (إلغاء) بدل DELETE فعلي، لأن الكود نفسه بيستخدم `CNCL` في التقارير.

---

## 🟠 Medium

### 2.4 `addPatientServices` غير atomic وغير idempotent
`accounting.ts:280-427`: ترتيب العمليات: (أ) إدخال إيصال MSSQL (`addMultiServiceReceiptInMssql`) → (ب) حلقة `upsertPatientServiceEntry` في MySQL. فشل (ب) بعد نجاح (أ) = إيصال حقيقي في النظام الأساسي بدون أثر في MySQL، والـ client يشوف error فيعيد المحاولة → **إيصال مكرر** (مفيش idempotency key). حتى بدون خطأ: ضغطتين متتاليتين على زر الحفظ = إيصالان.
`receiptRef` في الـ fallback = `${serviceDate}:${Date.now()}` يعني `sourceRef` مختلف كل مرة فالـ upsert ما بيمنعش التكرار.
**الإصلاح:** `clientRequestId` من الـ client + جدول/unique constraint، وتعطيل الزر أثناء الطلب، وقراءة الـ MSSQL قبل الإدخال للتأكد إن ما فيش إيصال مطابق في آخر N ثانية.
كمان: `price`/`discount` من الـ client بدون سقف (`z.number().min(0)`)، و`serviceDate` string حر.

### 2.5 مفيش Audit
`grep logAuditEvent|audit` في `accounting.ts` = **0**. بينما `routers.ts` بيعمل audit لتغيير username! العمليات المالية (حذف إيصال، تعديل مبلغ، حذف قيد خزنة، قروض، سلف) من غير أثر. `docs/security.md` نفسه بيصنّف المحاسبة "Confidential" ويطلب audit للتغييرات الإدارية.
**الإصلاح:** middleware واحد على `makeAccWriteProcedure` يسجل `{userId, procedure, input(hash/redacted), result}`.

### 2.6 الأعمدة التراكمية `total`
- الإضافة: `addAccHome/Instapay/Loan` بتقرأ آخر `total` وتضيف (`1480-1485`, `1515-1520`, `1579-1584`) → race بين طلبين متزامنين (نفس القيمة السابقة).
- `updateAccHome/Instapay/Loan/Advance/Saadany` و`delete*` **مش بتعيد حساب** `total` للصفوف اللاحقة، فالعمود بيبعد عن الحقيقة. (الـ ledger endpoints بتحسب `total` بـ window function فالـ UI غالباً مش بيتأثر، لكن آخر `total` المخزّن بيُستخدم كأساس للصف الجديد → أخطاء تتراكم.)
**الإصلاح:** احسب `total` دائماً في الاستعلام (window) وانسَ العمود، أو استخدم `SELECT ... FOR UPDATE` داخل transaction + `recalc` بعد كل تعديل (زي `recalcLedgerTotals`).

### 2.7 أداء `recalcLedgerTotals`
`accounting.ts:2045-2067`: UPDATE+JOIN+window على كامل `accLedger` عند **كل** add/update/delete (+ نداء `accLedgerNavigator` بيجيب كل الجدول بدون limit: `658-670`). مع نمو الدفتر هتبقى كل عملية كتابة O(N). وكمان `accLedger` (576) بيحسب window function على الجدول كله لكل صفحة (لازم لحساب الـ running total)، فتكلفة كل صفحة O(N).
**الإصلاح:** إدراج الأعمدة المشتقة بـ trigger أو حساب lazily؛ pagination للـ navigator؛ index على `(txDate, accessId, id)`.

### 2.8 تحقق مالي ناقص في MSSQL
- `updateReceipt` (470-513): `paidAmount`/`discount` أي رقم ≥0 بدون سقف ولا مقارنة بإجمالي الإيصال، بدون `TR_TY/SEC_CD` في الـ WHERE (نفس مشكلة 2.3).
- `editReceiptServiceLine` (515-531): `price` و`discount` بدون سقف (discount > price×qty؟) — الدالة في `integrations/mssqlPatients.ts` (راجع موديول MSSQL).
- `z.number()` بدون `.finite()` في أغلب الحقول (`addAccEntry` فيه `.finite()` بس).
- Amounts بتتخزّن بـ `sq(number)` كـ string literal بين quotes (MySQL بيحوّل ضمنياً — ممكن يفقد دقة لو العمود DOUBLE) → استخدم DECIMAL و`Math.round(x*100)/100` (مطبّقة في `bulkImport` بس).

---

## 🟡 Low

- **2.9** `accReports` (`1133-1138`) بيرجّع `e.message` (قد يحتوي أسماء جداول/أعمدة). `mssqlAccounting.ts:39-40` بيعمل `console.debug` لـ params (`patientCode`, أسماء مرضى `%name%`) وبيتجاب الـ SQL كله لما النتيجة 0 صفوف — PII في الـ logs (راجع `docs/security.md`: لا PII/PHI في logs نصية).
- **2.10** كل `txDate: z.string()` (`1247, 1297, 1389, …`) → قيم مثل `"abc"` بتتخزّن أو بتفجّر الـ INSERT. استخدم regex `^\d{4}-\d{2}-\d{2}$` (موجود فعلاً `accImportRowSchema`).
- **2.11** `syncAccMirrors` (1215-1242): لكل صف في الدفتر: `resolveMirrorEntity` (query على accCategories **كل مرة**) + `findEquivalentMirror` + `resolveMirror` (query مرتين) + UPDATE. لدفتر 10k صف = 40–50k query في request واحد (timeout محتمل) وبدون transaction ولا lock (تشغيلان متزامنان = mirrors مكررة). حمّل `accCategories` و`accEmployees` مرة واحدة.
- `deleteMirrorRow` بيبلع الأخطاء `.catch(()=>{})` (1950) → ledger يتحذف والـ mirror يفضل يتيم بدون أي أثر.
- `accountingQuery` بيلوج الـ error لكن بيحوّل **كل** خطأ (حتى الـ validation) لـ "Failed to load accounting data" → صعب التشخيص.
- `patientLookup/doctorLookup/serviceLookup`: `z.string()` بدون max length (VarChar(40) في mssqlQuery بيقطع بصمت).

## 🔵 Code / Queries

- **2.12** الملف 2124 سطر بيخلط: routing + SQL خام + منطق mirror + classification. قسّمه: `accounting/ledger.router.ts`, `loans`, `advances`, `receipts`, ومعاه repository layer بـ Drizzle (الجداول `acc*` متعرّفة في `drizzle/schema.ts` — فمفيش مبرر للـ `sql.raw`؛ `accAdvancesTable` بيستخدم Drizzle بالفعل في سطور 1416 و1452 فمزيج الأسلوبين نفسه مصدر أخطاء).
- 12 نسخة من `sq()` ⇒ دالة واحدة (أو الأحسن: لا دالة).
- `accLedger` query: اشتقاق الـ `balance` وإعادة حسابه (`COALESCE(income,0)-COALESCE(expense,0)`) في 3 أماكن + عمود مخزّن → خطر عدم اتساق.
- **2.13** أسماء أشخاص وكلمات خاصة (`هشام`, `ابو يوسف`, `السعدني`…) hardcoded داخل `autoMirrorEntity` و`classifyExpense` (مكررة في الدالتين!). انقلها لجدول `accCategories` (موجود) أو config، وإلا أي تغيير بيحتاج deploy، واتنين مصادر للحقيقة ممكن يختلفوا.
- `triggerAccSync/Push` بتشغّل `tsx` كـ child process من داخل الـ web process (timeout 120s) وبتحجز request؛ لو اتنين admin ضغطوا → عمليتين متزامنتين على ملف Access. أضف mutex.
- `lasikCost.service.ts:166,196` بيستخدم `escapeSqlLiteral` (نفس النمط الضعيف)، لكن المدخلات هناك ثابتة/validated (`isoDateStringSchema`) فمش قابلة للاستغلال حالياً — ومع ذلك حوّلها لـ params عشان ما تتكرر المشكلة.

## ما اتأكدت إنه سليم
- كل استعلامات MSSQL (`sqlBuilders.ts`, `mssqlAccounting.ts`) parameterized (`@code`, IN lists بـ `@doctorCode{i}`)؛ `getMssqlPatientsTable()` بيتحقق بـ regex قبل ما يتحط في SQL.
- كل الـ procedures محمية بـ `makeAccProcedure`/`makeAccWriteProcedure` (قراءة/كتابة منفصلة) و`adminProcedure` للـ sync.
- الـ ids الرقمية `z.number().int()` فآمنة في `WHERE id=${id}`.
- `triggerAcc*` بتستخدم `execFile` (مش `exec`) بمسارات ثابتة — لا command injection.
