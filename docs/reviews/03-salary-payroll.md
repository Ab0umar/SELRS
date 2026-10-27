# تقرير مراجعة — موديول 3: Salary / Payroll / Shift Staff

**النطاق:** `server/routers/salary.ts` (3169 سطر — قراءة كاملة تقريباً)، `server/services/salary/payrollCompute.service.ts` (قراءة جزئية: `compute` بداية + `savePayroll`)، باقي ملفات `services/salary/*` اتفحصت بالـ grep فقط.
**خط الأساس:** `pnpm check` نظيف، `pnpm test` 645/645.
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 3.1 | 🟠 | Security / Integrity | صفر audit تقريباً على كل العمليات المالية (مرتب، خصم، سلفة، اعتماد، override) |
| 3.2 | 🟠 | Security / Fraud | Self-service `addMyShiftEntry`: الموظف بيسجّل شفتاته بنفسه بدون حدود/موافقة وبيأثر على الراتب |
| 3.3 | 🟠 | Bug | الـ identity matching في `resolveMyShiftStaff` بالاسم (قابل للتصادم/الانتحال) |
| 3.4 | 🟠 | Security / DoS | نطاقات تاريخ غير محدودة: `dateRangeToYearMonths` + `generateFromCycles` |
| 3.5 | 🟠 | Integrity | لا قفل على المدخلات بعد `finalizePayroll` (penalties/advances/basics/overrides) |
| 3.6 | 🟠 | Bug | `updateBasic` بدون فحص overlap/ترتيب التواريخ (على عكس `setBasic`) |
| 3.7 | 🟠 | Security | الـ write-permission: path عارية = write (راجع 1.9 في تقرير Core) |
| 3.8 | 🟡 | Validation | `year`/`month` بدون range؛ `amount`/`penaltyDays` بدون سقف؛ penalty بدون amount ولا days |
| 3.9 | 🟡 | Bug | عمليات متعددة الخطوات بدون transaction (`setBasic`, `setStaffCycle`, `addShiftsBulk`, `generateFromCycles`) |
| 3.10 | 🟡 | Bug | `generateFromCycles` بيعدّل أوقات shifts اليدوية الموجودة + تعامل مختلف مع الإجازات عن `computeShiftPayroll` |
| 3.11 | 🟡 | Money | `String(number)` للمبالغ (علمي/دقة) بدل DECIMAL/تقريب موحّد |
| 3.12 | 🟡 | Bug | `deleteBasic/deleteRaise/deleteEidBonus/deletePenalty/deleteAdvance` hard delete بدون أثر |
| 3.13 | 🔵 | Perf/Query | N+1 inserts؛ `select()` كامل من `shiftStaff`/`attendanceShifts`؛ `listAccAdvancesLinked` بيعمل GROUP على كل `accAdvances` |
| 3.14 | 🔵 | Code | 3169 سطر في ملف واحد + أخطاء `throw new Error` بدل `TRPCError` + تواريخ بـ string |

---

## 🟠 Medium

### 3.1 غياب الـ Audit
`grep logAuditEvent server/routers/salary.ts` → **استدعاء واحد** (`setInsuranceDeduction`, السطر 383). غير مسجّل: `setBasic/updateBasic/deleteBasic`، `setRaise/deleteRaise`، `addPenalty/updatePenalty/deletePenalty`، `addAdvance/deleteAdvance`، `setPriceOverrides`، `setCommissionPool`، `setShiftAttendanceOverride` (بيسجّل `updatedBy` بس)، **`finalizePayroll`** (أخطر واحدة)، `computePayroll`.
نظام رواتب بدون أثر "مين غيّر راتب فلان من كام لكام" مشكلة تشغيلية وقانونية، و`docs/security.md` بيصنّفه Confidential ويطلب audit.
**الإصلاح:** حقن `logAuditEvent(userId, action, table, id, {before, after})` في الـ middleware المشترك لـ `makeSalaryWriteProcedure` أو wrapper حول الـ mutation.

### 3.2 Self-service shift entries
`salary.ts:2304-2341` `addMyShiftEntry` (`makePageWriteProcedure("/attendance/shift-schedule")`): أي موظف عنده كتابة على جدول الشفتات (الدكاترة/الفنيين حسب التعليق) يضيف لنفسه شفت بـ:
- أي `workDate` (ماضي بعيد، مستقبل، شهر اتعمله finalize) — الـ regex للشكل بس،
- أي `startTime/endTime` (ممكن `00:00-23:59` = 24 ساعة)،
- `present: true` مباشرة،
والـ `shiftAttendance` هو مصدر `computeShiftPayroll` → `computeShiftStaffPay` (الراتب = شفتات × rate). يعني الموظف بيزوّد راتبه من غير موافقة. نفس الحكاية `toggleMyShiftEntry` (يقدر يحوّل `present` لـ true) و`updateMyShiftEntry`.
**الإصلاح:** حالة `pending/approved` مع موافقة مدير، حد أقصى لطول الشفت وللتاريخ (مثلاً ±N يوم) ورفض الأشهر المعتمدة، وaudit.

### 3.3 `resolveMyShiftStaff` بالاسم
`salary.ts:167-205`: لو مفيش `shiftStaff.userId` مربوط، بيطابق `user.name`/`username` مع `shiftStaff.name` بعد normalize (تشيل "د."/"دكتور"). لو اتنين فيهم نفس الاسم بعد الـ normalize ترجع `null` (جيد)، لكن لو مستخدم جديد بيسمي نفسه (أو admin بيسمّيه) مطابق لاسم موظف شفتات موجود → يرث صلاحية تعديل **شفتات غيره** (مع 3.2). الربط الصريح موجود (`linkUserToShiftStaff`) فالـ fallback بالاسم مش لازم.
**الإصلاح:** احذف الـ fallback أو خلّيه read-only/اقتراح للمدير.

### 3.4 نطاقات تاريخ بلا حد (DoS لمستخدم مصرّح)
- `dateRangeToYearMonths` (`108-126`) بتولّد زوج لكل شهر بين التاريخين. بتتنادى من `listPenalties`, `listAdvances` (`fromDate/toDate: z.string()` بدون validation)، و`fetchShiftAttendanceRange`. `fromDate="0001-01-01"`, `toDate="9999-12-31"` ⇒ ~120,000 شرط `OR(...)` في query واحد، أو 120,000 query متوازية (`Promise.all` في `fetchShiftAttendanceRange`) — بتخنق الـ DB pool.
  وقيم غير تاريخية (`"abc"`) → `NaN` → `[{year:NaN, month:NaN}]` → query بشروط NaN.
- `generateFromCycles` (`2993-3084`): `fromDate/toDate` `isoDate` بس؛ الحلقة `for (d = from; d <= to; d++)` × كل staff × كل cycle entry، كل واحد `await db.insert` → ملايين insert لو النطاق كبير.
- `computeShiftPayroll`/`getShiftSchedule`: `fromDate?: z.string()`.
**الإصلاح:** `z.string().date()` + `.refine(to>=from && diffDays<=62)` كـ shared schema (`dateRangeInput`)، وحد أقصى للأشهر في `dateRangeToYearMonths` (مثلاً 24).

### 3.5 المدخلات بعد الاعتماد
`finalizePayroll` (`1446-1471`) ممتاز من ناحية التزامن: `compute` + مقارنة `payrollSnapshot` (optimistic concurrency) + `SELECT … FOR UPDATE` + transaction داخل `savePayroll`. لكن بعد الاعتماد، الـ endpoints التالية لسه بتقبل تعديلات على الشهر المعتمد من غير أي تنبيه: `addPenalty/updatePenalty/deletePenalty`, `addAdvance/deleteAdvance`, `setBasic/updateBasic`, `setCommissionPool`, `setSupervisionBonus`, `setShiftAttendanceOverride`, `addEidBonus`, `clearGeneratedShiftAttendance`. النتيجة: كشف معتمد ≠ مدخلات الـ DB، وإعادة `computePayroll` بتتخطى الصفوف المعتمدة صامتة (`finalKeys … continue`, سطر ~1939) فمفيش مؤشر للمستخدم إن الأرقام اللي اتعدّلت مش هتنعكس.
**الإصلاح:** helper `assertPeriodNotFinal(year, month, section)` في كل mutation مرتبطة بفترة، وإرجاع عدد الصفوف المتخطّاة من `savePayroll` للـ UI، وعملية "إلغاء اعتماد" صريحة بصلاحية أعلى + audit.

### 3.6 `updateBasic`
`salary.ts:315-365` بتسمح بتغيير `effectiveFrom/effectiveTo/section` بدون:
- فحص التداخل مع صفوف تانية لنفس الموظف/القسم (موجود في `setBasic` بس),
- التأكد إن `effectiveTo >= effectiveFrom`,
- قيمة `section` الجديدة ممكن تعمل صفين مفتوحين لنفس (emp, section) → `compute` بيختار "الأحدث" بـ sort على `effectiveFrom` (سطر ~2778) فتتبدّل المرتبات بصمت.
وكمان بتعدّل صف راتب أساسي ماضٍ بدون audit (مع 3.1).

### 3.7 write = bare path
`makeSalaryWriteProcedure` (procedures.ts:620-649) بيعتبر `"/salary"` (بدون `:rw`) صلاحية كتابة. أي صلاحية قراءة محفوظة بدون suffix بتتحول لكتابة على كل endpoints الرواتب (بما فيها `finalizePayroll`، و`makeSalaryWriteProcedure("/salary")` على 7 endpoints). التفاصيل في تقرير Core (1.9). **تحقق من البيانات الحالية:** `SELECT pageId, COUNT(*) FROM user_permissions WHERE pageId LIKE '/salary%' AND pageId NOT LIKE '%:r%' GROUP BY pageId`.

---

## 🟡 Low

- **3.8** `year: z.number().int()` بدون `min/max` و`month: z.number().int()` بدون 1..12 في معظم endpoints (الاستثناء `setMarkazManualCommissionPools`). `new Date(input.year, input.month - 2, 26)` مع شهر 13+/NaN يولّد تواريخ غلط ("NaN-NaN-26"). `addPenalty`: تعليق "one of amount or penaltyDays is required" **غير مُنفَّذ** (amount افتراضي 0 وpenaltyDays اختياري → غرامة فاضية). `amount` بلا سقف (`z.number().min(0)`)، لا `.finite()`.
- **3.9** `setBasic` (`259-312`): يقفل الصف القديم (UPDATE) ثم يدخل الجديد؛ لو الـ INSERT فشل الراتب القديم يفضل مقفول بتاريخ نهاية — بدون transaction. `setStaffCycle` (`2952-2965`) DELETE ثم INSERT: خطأ بين الاتنين = الموظف يفقد دورة الشفتات. `addShiftsBulk` (`2481-2499`) loop insert متتابع؛ `dates: z.array(z.string())` بلا حد ولا regex، و`new Date(workDate)` (UTC parse) مع `getFullYear/getMonth` (local) = شهر غلط في timezone سالب أو لقيمة غير صالحة (`NaN`).
- **3.10** `generateFromCycles`: `onDuplicateKeyUpdate` بيكتب `shiftName/startTime/endTime` فوق أي shift موجود لنفس (staff,date) حتى لو اتعدّل يدوياً أو أضافه الموظف (self-service)؛ وبيستبعد كل `attendanceHolidays` (`3026-3033`: select من غير شرط `paid`) بينما `computeShiftPayroll` (2723-2745) بيعتبر بس الإجازات `paid` ⇒ يوم إجازة غير مدفوعة: الشفت ما اتولّدش لكن لو اتضاف يدوياً الراتب بيحسبه. وحّد منطق الإجازات في helper واحد.
- **3.11** كل المبالغ `String(input.x) as any` (≈90 مرة). `String(1e21)`="1e+21"، و`0.1+0.2` يتخزّن `"0.30000000000000004"`. استعمل دالة `toMoney(n)=n.toFixed(2)` ومرّر عبر Drizzle `decimal`.
- **3.12** `deleteBasic/deleteRaise/deleteEidBonus/deletePenalty/deleteAdvance/deleteOperationFundEntry`: `DELETE` فعلي بدون أثر (باستثناء entries المسوّاة اللي بتتأرشف: تصميم كويس في `settleOperationFund`). المسوّى محمي (`isNull(settledAt)` في `deleteOperationFundEntry`)، بس مش محمي حذف `salaryEidBonuses` بعد ما اتصرفت. استخدم soft-delete (`deletedAt`, `deletedBy`).
- `getEmployeeFunds`: `fundEligibleEmployees` بتستثني اللقب بـ `includes("طبيب")` — نص حر على `jobTitle`، هش.
- `computePayroll` mutation بتنادي `compute` بـ `notify=true` (الافتراضي): كل ضغطة "احسب" ممكن تبعت تحذيرات تأخير للموظفين؛ الـ dedupe عبر JSON في `systemSettings` (`getSystemSetting(APP_NOTIFICATION_FEED_KEY)` يُقرأ ويُكتب كامل) = race condition بين حسابين متزامنين ونمو غير محدود للـ feed.
- اختيار موظفي القسم (`compute`, سطر 349-355) بـ `department = section OR LIKE '%مركز%'`/`'%عياد%'`: موظف قسمه "المركز والعيادة" بيدخل الاتنين. تأكد إن `salaryBasics` per-section فعلاً بيمنع صرف مزدوج (الكود مبني على وجود basic لكل قسم، لكن مفيش assertion).

## 🔵 Code / Queries

- **3.13** `listAccAdvancesLinked` (1763-1823) `sql.raw` ثابت (آمن) بس بيعمل GROUP BY على **كل** `accAdvances` بدون فلتر تاريخ (`fromDate` غير مستخدم، فقط `toDate` للتحويل لـ month)، ثم `HAVING net > 0`. متوقع بطء مع الزمن. `getAbsentDays/listLateDays/...` من غير `limit` ولا pagination. `computeShiftPayroll`: `db.select().from(shiftStaff)` و`attendanceShifts` كاملين (مقبول لحجم صغير). `fetchShiftAttendanceRange` بتجيب شهور كاملة ثم بتفلتر في الذاكرة (`149-156`) بدل `workDate BETWEEN`.
- **3.14** `throw new Error(...)` بدل `TRPCError` في 20+ مكان (`2322, 2325, 2354, 2357, 2377, 2386, 2447, 2478, 2939…`) فالـ client بياخد `INTERNAL_SERVER_ERROR` لأخطاء validation/authorization. مثال: "Not authorized to modify this entry" لازم `FORBIDDEN`.
- تكرار `dateKeyOf` inline 10+ مرات بدل استدعاء الدالة (`salary.ts:1719,1755,1841,152`).
- الدالة `payrollSnapshot` (shared) كويسة — لكن راجع إنها بتغطي كل الحقول المالية (مثلاً `leaveMultiplier`, الـ commission raw) وإلا فـ snapshot ممكن يطابق وفي نفس الوقت قيمة اتغيّرت.
- الملف: قسّمه `salary/basics.router.ts`, `penalties`, `funds`, `pools`, `payroll`, `shifts`.

## ما اتأكدت إنه سليم
- كل استعلامات الملف بـ Drizzle query builder / `sql` template parameterized؛ الـ `sql.raw` الوحيد ثابت بالكامل (لا مدخلات).
- `savePayroll`: transaction + `FOR UPDATE` + حماية الصفوف النهائية + `payrollSnapshot` للـ optimistic concurrency في `finalizePayroll`.
- `clearRoster` بيتحقق من `admin/manager` صراحة رغم إن الـ guard أوسع.
- `toggleMyShiftEntry`/`updateMyShiftEntry` بيتحققوا من ملكية الصف (`staff.id !== entry.staffId`).
- `settleOperationFund` بيأرشف (`settledAt`) بدل الحذف.
