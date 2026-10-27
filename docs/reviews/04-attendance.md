# تقرير مراجعة — موديول 4: Attendance (الحضور والانصراف + أجهزة البصمة)

**النطاق:** `server/routers/attendance*.ts` (5 ملفات، ~7000 سطر)، `server/_core/zktecoAdms.ts`، `attendanceSyncScheduler.ts`، `server/services/attendance/*` (16k سطر مع الـ tests).
**الطريقة:** فيه مراجعة سابقة كاملة للموديول ده (`docs/attendance-code-review.md` بتاريخ 2026-09-27). بدل ما أكرّر، **تحققت واحد واحد** من حالة كل بند في الكود الحالي، وبعدين راجعت اللي لسه ما اتغطاش (ADMS endpoint، self-service، device settings).
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## 1) حالة بنود المراجعة السابقة (متحقق منها في الكود الحالي)

| البند | الحالة | الدليل |
|---|---|---|
| A1 SQL injection في `updateLeave` | ✅ اتصلّح | `grep sql.raw attendance*.ts` = 0 نتيجة |
| A2 command injection (`execSync` + IP) | ✅ اتصلّح | `updateDeviceSettings.ip = ipv4Address` (`attendance-sync.ts:152`)، والـ pullers بتستخدم `execFile` بمصفوفة args. باقي: `server/scripts/sync-access-db.ts:67` بيستخدم `execSync(\`powershell ${args}\`)` بس بـ args ثابتة (script إداري) |
| A3 `GET_LOCK` على pool | ✅ اتصلّح | `materializerMutex.ts` بيحجز connection مخصّص ويعمل destroy لو `RELEASE_LOCK` فشل |
| A4 dedup غير متسق | ✅ اتوحّد | كل المسارات (ADMS/FK/ZK TCP/live) بقت `sourceRowId = "${emp}_${epochMs}"` (`zktecoAdms.ts:416`, `fkDeviceSyncService.ts:143`, `zk4370Sync.service.ts:145`, `punchReception.service.ts:83`) |
| A5 shifts عابرة لمنتصف الليل | ✅ اتصلّح | `dailyMaterializer.ts:161-171` بيجيب punches لحد اليوم التالي |
| A6 `syncNow` يخلق absent للغد | ✅ اتصلّح | `recomputeRange(today, today)` (`attendance-sync.ts:1019`) |
| B1 `rawPunches` count | ✅ اتصلّح | الاستعلام اتعدّل |
| B2 cycle slot math | ✅ اتصلّح | نوع `rotation` + modulo (`rulesEngine.ts:793-815`) — ملحوظة: `day`/`week` لسه `getDay()` عمداً (legacy) |
| B7 إجازة عابرة للسنة | ✅ اتصلّح | شرط overlap `dateFrom <= yEnd AND dateTo >= yStart` (`attendance.ts:840`, `attendance-leaves.ts:617`) |
| B8/B9 recompute بعد الإجازة/الإذن/الـ punch اليدوي | ✅ اتصلّح | `recomputeLeaveRangeAndMonthly`, `recomputeRange` في `batchAddPunches` (`attendance-sync.ts:560`) |
| B10 تسريب listeners | ✅ اتصلّح | `device.off("punch", this.punchHandler)` |
| B14 `otReport` يوم 8 ساعات | ❌ لسه | `monthlyCompute.service.ts:178` `Math.ceil(totalOTMins/60/8)` |
| IP جهاز hardcoded | ❌ لسه | `deviceSettings.service.ts:36` `EF10K_DEFAULT_IP="41.199.252.107"` (default للإعدادات فقط) |
| Materializer N+1 (C1) | ✅ اتصلّح | punches بتتحمّل مرة واحدة للمدى + سقف 366 يوم (`dailyMaterializer.ts:128-131`) |

الخلاصة: الموديول اتشغّل عليه بجدية. اللي تحت هو الجديد/المتبقي.

---

## ملخص الملاحظات الجديدة

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 4.1 | 🟠 | Data integrity | ADMS: مفيش تحقق من نطاق تاريخ الـ punch (ساعة الجهاز بعد reset = punches بتاريخ 2000/2099) |
| 4.2 | 🟠 | Data integrity | ADMS بيعمل auto-create لأي `empCd` جاي من الجهاز كموظف `active` |
| 4.3 | 🟠 | Perf / Reliability | `recomputeRange` شغّال fire-and-forget على كل push بدون debounce/تجميع |
| 4.4 | 🟡 | Security | حقن أوامر ADMS عن طريق `\r\n` في `fullName`/`empCd` |
| 4.5 | 🟡 | Bug | عند تغيّر الـ offset المكتشف تتغير `punchAt` و`sourceRowId` ⇒ إعادة إدخال نفس الـ punch |
| 4.6 | 🟡 | Reliability | طوابير ADMS (`cmdQueues`, `pendingAck`, `queriedDevices`) في الذاكرة بدون TTL |
| 4.7 | 🟡 | Business | `otDays` على 8 ساعات ثابتة |
| 4.8 | 🔵 | Code | `execSync` مستورد في 4 routers مش مستخدم + IP hardcoded + نمط `makeAttProcedure` يعدّي `manager` دايماً |

---

## 🟠 Medium

### 4.1 لا تحقق من نطاق تاريخ الـ punch (ADMS)
`zktecoAdms.ts:254-296` `parseAttlogBody`: الفحص الوحيد `isNaN(rawPunchAt.getTime())`. أجهزة ZKTeco بعد فقد البطارية/reset بترجع لتاريخ المصنع (2000-01-01 أو 2020) وبتبعت punches بتاريخ كده — هتتخزن كـ punches "حقيقية" وبعدين `recomputeRange` بيحاول يحسب يوم 2000-01-01 (وكل المدى لحد 366 يوم بيتحمي بس بالنسبة للـ range، لكن الـ punch نفسه بيدخل الجدول وبيلوّث التقارير و`monthly` للتاريخ ده). كمان `maybeDetectOffset` بيتجاهلها بس (`rounded<0 || >12` return) فمفيش قرار منها.
**الإصلاح:** رفض/quarantine أي punch خارج `[now - N يوم, now + 1 يوم]` (N قابل للضبط، مثلاً 45)، مع log واضح + عدّاد على `/attendance/admin` ليظهر "جهاز X بيبعت تواريخ غلط".

### 4.2 Auto-registration لأي empCd
`zktecoAdms.ts:429-442`: لكل `userId` في الـ push بيتعمل `INSERT attendance_employees (empCd, fullName=empCd, active: true)`. جهاز مسموح (serial+IP) لكنه ممكن يبعت PIN مؤقت/تجريبي/عميل (الأجهزة بتسمح بتسجيل مستخدمين على الجهاز نفسه من غير النظام) ⇒ موظف نشط بدون راتب/قسم يظهر في كل التقارير وحسابات `compute` (`department LIKE …` ما بيمسكهوش لكن `listEmployees` بيعرضه) ويتحسب له غياب يومياً.
**الإصلاح:** سجّل الـ punch وسجّل الموظف بـ `active:false` + `needsReview:true` (أو جدول `attendance_unknown_codes`) وإشعار للـ HR.

### 4.3 إعادة حساب فوري لكل push
`zktecoAdms.ts:455-479`: لكل يوم مستخرج من الـ push بيتنفّذ `void DailyMaterializer.recomputeRange(day, day, undefined, undefined, { recomputeMonthly: true })` — **كل الموظفين** + monthly، حتى لو punch واحد لموظف واحد. ساعة الذروة (طابور الدخول 7:30–8:30) = عشرات الـ pushes في الدقيقة ⇒ عشرات الـ recompute الكاملة المتتابعة على الـ mutex (مفيش حد لعدد الـ promises المعلّقة، كل واحدة بتحتفظ بالمتغيرات).
`recomputeRange(..., { empCd })` موجودة (مستخدمة في `attendance-sync.ts:560`).
**الإصلاح:** مرّر `{ empCds: uniqueEmpCds }` (الـ API بيدعم `scope.empCds`)، وdebounce/تجميع 2–5 ثواني لكل (يوم) مع coalescing للـ in-flight.

---

## 🟡 Low

- **4.4** `queueAdmsUserCommands` (`zktecoAdms.ts:95-115`): `name` بيشيل `\t` بس، و`PIN=${e.empCd}` بدون أي تنقية. اسم موظف فيه `\r\n` + `C:99:DATA DELETE USERINFO PIN=…` يتحول لأمر تاني يتسحب من `/iclock/getrequest`. يتطلب صلاحية تعديل أسماء الموظفين (attendance write) وجهاز ADMS مفعّل. **الإصلاح:** `replace(/[\t\r\n]/g," ")` للـ PIN والاسم، وrestrict `empCd` بـ `/^[A-Za-z0-9_-]{1,24}$/`.
- **4.5** `sourceRowId = ${empCd}_${punchAt.getTime()}` بعد تصحيح الـ offset (`punchAt = raw − offMs`)، بينما `sourceHash` مبني على `rawPunchAt`. لو الـ offset اتغيّر (اكتشاف جديد/`ZK_ADMS_PUNCH_OFFSET_HOURS`) وجهاز بعت re-dump (`DATA QUERY ATTLOG`) نفس الـ punch ينزل بـ `punchAt` مختلف و`sourceRowId` مختلف ⇒ ما يصطدمش بـ `uq_punch(empCd, punchAt, sourceRowId)` وبيتكرر (الـ hash مش unique). أول push بعد restart بدون offset محفوظ (`effectiveOffsetHours = 0`) بيدخل punches بتوقيت الجهاز الخام. **الإصلاح:** ابني `sourceRowId` من `rawPunchAt`، وأضف unique على `(empCd, sourceHash)` بعد تنظيف التكرارات.
- **4.6** `cmdQueues`/`pendingAck`/`queriedDevices` Maps بدون TTL ولا persist: restart = ضياع أوامر `USERINFO` (الـ UI يعتبرها اتبعتت)، وأمر ما اتعملش له ACK يفضل في `pendingAck` للأبد. `queriedDevices` بيمنع `DATA QUERY ATTLOG` الثاني حتى لو الجهاز اتفصل ورجع. شيل `pendingAck` بعد 10 دقايق، وارجع الأمر للطابور لو اتأخر.
- **4.7** `monthlyCompute.service.ts:178` `otDays = ceil(OTmins/60/8)`: مدة اليوم من الـ shift الفعلي (`shifts.durationMinutes`) أدق، وخصوصاً مع الشفتات الـ 6 ساعات (`mainShiftMinutes` default 360 في الرواتب!). ينتج اختلاف بين تقرير OT وكشف الراتب.
- `attendance-sync.ts`/`zktecoAdms.ts` بيسجّلوا `raw: ${body.slice(0,300)}` عند فشل الـ parse — أرقام موظفين/تواقيت في الـ log (مقبول، لكن يُقلَّل).
- `getEntryPermissionRequestsEnabled` = `protectedProcedure` (أي مستخدم)؛ مقصود (flag بسيط) بس لازم يرجّع boolean فقط — وهو كذلك.

## 🔵 Code

- **4.8** `import { execSync } from "child_process"` في `attendance.ts:6`, `attendance-leaves.ts:3`, `attendance-reports.ts:3`, `attendance-shifts.ts:4` — غير مستخدم (تأكد بـ eslint no-unused-vars) وبيعمل "scanner noise" لأي security audit. شيله.
- `makeAttProcedure`/`makeAttWriteProcedure` بيعدّوا `manager` تلقائياً (procedures.ts:463, 495) بدون النظر لـ permissions — لو في manager "فرع" مقيّد، الـ guard مش بيحترم ده. اتفق إن ده مقصود.
- `salaryPathMatches` اسمها مضلل لأنها مستخدمة في Attendance (`procedures.ts:474, 505`) — غيّر الاسم لـ `anyPathMatches`.
- بما إن `makeAttWriteProcedure` فيه نفس مشكلة "bare path = write" (تقرير Core 1.9)، راجع أي مستخدم عنده `/attendance` بدون `:rw`: بيقدر `addManualPunch/deleteManualPunch/batchAddPunches` (**يعني يضيف punch لأي موظف**).
- Tests: الموديول له tests جيدة (`server/services/attendance/__tests__`, `server/tests/attendance.test.ts`)، لكن مفيش test لـ `parseAttlogBody` (نطاق التاريخ، CR/LF، offset) ولا للـ ADMS allowlist middleware.

## ما اتأكدت إنه سليم (ويستحق الذكر)
- **ADMS allowlist** `serial@IP` + fail-closed + عدم الثقة في `X-Forwarded-For` (`zktecoAdms.ts:303-329`) تصميم ممتاز.
- الـ self-service (`myRequestLeave`/`myRequestPermission` — تحققت منهم؛ `myRequestShiftChange` ما راجعتوش بالتفصيل): `approved:false` دايماً، حد أقصى للأيام (`MAX_SELF_LEAVE_DAYS`)، منع التداخل، والملكية من `employeeAttendanceMapping` بـ `ctx.user.id` (مقارنة بموديول الرواتب: 3.2 هناك).
- كل queries الـ Drizzle parameterized؛ مفيش `sql.raw` في الموديول.
- `getPunchesByRange` / الـ materializer: تحميل batch + سقف 366 يوم.
- Audit logging موجود في كل الـ routers (`attendance-sync` 30 مرة، leaves 9، shifts 8).
