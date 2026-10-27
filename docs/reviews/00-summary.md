# مراجعة شاملة لمشروع SELRS — الفهرس والأولويات

**التاريخ:** 2026-10-26 · **المراجِع:** Claude (قراءة كود + أوامر قراءة فقط؛ **لم يُعدَّل أي كود تشغيلي ولم يُنفَّذ أي استغلال على قاعدة بيانات حقيقية**).
**خط الأساس المنفَّذ فعلاً:** `pnpm check` (TypeScript) ✅ بدون أخطاء · `pnpm test` ✅ 645/645. يعني الـ build سليم؛ كل الملاحظات التالية **منطق/أمان/استعلامات** مش أخطاء كومبايلر.
**الصياغة:** لكل موديول تقرير منفصل في هذا المجلد. كل بند فيه: الملف:السطر، السيناريو، الإصلاح المقترح. وفي آخر كل تقرير قسم "ما اتأكدت إنه سليم" عشان تعرف إيه اللي اتفحص ومفيش فيه مشكلة.

## التقارير

| # | الموديول | أخطر ما فيه |
|---|---|---|
| [01](01-core-auth-security.md) | Core / Auth / Express bootstrap / WebSocket | تخطّي rate-limit الدخول بالـ batching؛ `/updates` يكشف مجلد desktop كله؛ قفل OCR يتفك غلط؛ جلسات سنة؛ ws بدون فحص authVersion للدكتور |
| [02](02-accounting.md) | المحاسبة / الخزنة | **SQL Injection** (backslash) في كل endpoints الدفتر + `deleteReceipt` خطر + صفر audit |
| [03](03-salary-payroll.md) | الرواتب | self-service للشفتات بدون موافقة؛ نطاقات تاريخ بلا حد؛ لا audit؛ لا قفل بعد الاعتماد |
| [04](04-attendance.md) | الحضور + ADMS | الموديول الأنضج؛ تحقق من حالة المراجعة السابقة (كلها اتصلّحت تقريباً)؛ ملاحظات على ADMS (نطاق التاريخ، auto-create) |
| [05](05-medical-patients-clinical.md) | المرضى/الفحوصات | دمج مرضى مختلفين (نفس الهاتف أو الاسم)؛ `searchPatients` بلا limit؛ mass-assignment في `updatePatient` |
| [06](06-portals-public-surface.md) | بوابات المريض/الدكتور/الحجز العام | دخول المريض بـ (هاتف + كود تسلسلي)؛ حجز زائر يبعت WhatsApp لأي رقم؛ SSRF عبر push subscription |
| [07](07-marketing-ai-whatsapp-autoreply.md) | التسويق/AI/WhatsApp | أنضج جزء أمنياً؛ ملاحظات على speechToken والـ PHI الخارج لـ Manus/Azure |
| [08](08-mssql-integration.md) | تكامل MSSQL | **`op2026` hardcoded ×160 ⇒ ينكسر 2027-01-01**؛ اتصال غير مشفّر؛ لا قفل للمزامنة |
| [09](09-pentacam-imaging-s3.md) | Pentacam / S3 | ربط صور بالمريض بالاسم الصوتي تلقائياً؛ حذف بلا audit؛ S3 list بدون pagination |
| [10](10-database-layer-schema.md) | طبقة البيانات | **`consumeLoginRateLimit` غير ذرّي**؛ لا فهارس على الجداول المركزية و4 FKs فقط؛ pool صغير |
| [11](11-kf-stockroom-misc-routers.md) | KF / المخزن / متفرقات | **صور KF بتتعرض لمريض آخر بنفس `patient_id`**؛ lost-update وكميات سالبة في المخزن |
| [12](12-frontend-and-client-shells.md) | الواجهة + Electron/Android | JWT في localStorage + XSS في AbsentReport؛ offline cache لا تُمسح عند logout |
| [13](13-repository-hygiene-secrets.md) | **المستودع نفسه** | 🔴 **repo عام على GitHub فيه أسماء مرضى + مالية، ومفاتيح توقيع Android في التاريخ** |

## الأولويات (مرتّبة بالتأثير × سهولة الاستغلال)

**اليوم / فوراً (قرارات + إجراءات، مش كود كتير)**
1. **تقرير 13.1:** حوّل مستودع GitHub لـ Private، وشيل `reports/*.csv` من الـ repo والتاريخ، وقيّم مسألة الإخطار قانونياً. (أنا ما غيّرتش حاجة.)
2. **تقرير 13.2:** حدّد هل keystore الـ Android الموجود في التاريخ هو مفتاح الإنتاج، وغيّره/اعمل reset عبر Play App Signing.
3. **تقرير 2.1/2.2:** أصلح الـ SQL injection في `accounting.ts` (params بدل string-building) — ثغرة قراءة لكل جداول الـ DB (بما فيها hashes كلمات المرور) لأي مستخدم عنده صلاحية قراءة محاسبة.

**الأسبوع ده**
4. **تقرير 1.1 + 10.1 + 6.1:** حدّ المحاولات (portal/doctor login): اعمله ذرّي، وقيّد `maxBatchSize` في tRPC، وحط عامل ثاني (OTP) لدخول المريض.
5. **تقرير 8.1:** مركزية اسم قاعدة السنة في MSSQL **قبل 2027-01-01** (خطر توقف المزامنة وكتابة الإيصالات في القاعدة الغلط).
6. **تقرير 11.1:** افصل صور KF عن `patient_id` الرئيسي (تسريب صور بين مرضى) + راجع بيانات `source_printer='kf-exam'` الحالية.
7. **تقرير 5.1:** أوقف دمج المرضى تلقائياً بالاسم **أو** الهاتف (سلامة مريض).
8. **تقرير 1.2:** قيّد `/updates` (مجلد `desktop-electron` كله بيتقدّم للعامة).
9. **تقرير 12.1/12.2:** شيل توكن الموظف من `localStorage` على الويب، وهرّب `name` في `AbsentReport`.
10. **تقرير 5.2:** `searchPatients` بحد أدنى للبحث + `LIMIT`.

**الشهر ده**
11. Audit مركزي للعمليات المالية/الحذف (2.5, 3.1, 11.5, 9.2, 5.5) + soft-delete.
12. فهارس `patients(phone, doctorCode)`, `visits(patientId)`, `examinations(patientId, visitId)`… (10.2).
13. المخزن: قفل الصفوف + كميات موجبة فقط (11.3/11.4).
14. توحيد منطق write-permission (1.9) + اختبار matrix للصلاحيات (route ↔ procedure).
15. قسّم `db.ts` (9241) و`mssqlPatients.ts` (6946) و`_core/index.ts` (2624) كما في `docs/security.md`.

## كيف قرأت (الأمانة في التغطية)
- **قراءة كاملة سطراً بسطر:** `server/_core/{auth,context,trpc,procedures,systemRouter,ws,zktecoAdms,whatsappWebhook,autoReplyWebhook,s3,env}.ts`، `server/routers.ts`، `accounting.ts`، `salary.ts` (معظمه)، `patientPortal.ts` (الدخول + بوابة المريض + الحجز العام + `updateBooking`؛ ما قرأتش `listBookings`/`createStaff*Booking`/إدارة الجدول)، `doctorPortal.ts`، `medical-uploads.ts`، `legacyPatients.ts`، `medical-assistant.ts`.
- **قراءة جزئية (مقاطع مختارة):** `_core/index.ts` (روتس Express كاملة، دون المساعدات الأولى)، `medical-patient.ts` (≈35%)، `medical-ops.ts`/`medical-examinations.ts`/`medical-catalog.ts` (إجراءات مختارة + جرد guards)، `medical-mssql.ts`، `medical-pentacam.ts`، `kf.ts`، `stockroom.ts`، `db.ts` (دوال مختارة من ~330)، `mssqlPatients.ts` (≈5%)، `payrollCompute.service.ts` (≈10%)، `publish.service.ts`، `policy.ts`.
- **بأنماط فقط (grep/تحليل آلي):** باقي `server/services/**`, `server/scripts/**`, `client/src/**` (659 ملف)، `drizzle/schema.ts` (فهارس/FKs آلياً)، تاريخ git (أسرار).
- **ما لم أراجعه:** `server/scripts/*` (سكربتات إدارية)، `scripts/`، `Dockerfile*`/النشر/PM2، `fcmPush.ts`/`appNotifications.ts`/`opReminderScheduler.ts`، جودة الـ tests نفسها، كود Android الأصلي وWebView2 shell (`SelrsDesktop/` غير موجود في الـ repo)، تصميم UI/RTL/أداء المكونات.
- **ما لم أنفّذه:** أي استغلال/اختبار اختراق حي، تشغيل على قاعدة بيانات الإنتاج، فحص `SHOW INDEX` على الـ DB الفعلي (التقارير بتقارن الـ schema في الـ repo — ممكن الإنتاج مختلف).
- **تصحيحات ذاتية أثناء العمل:** صحّحت بنفسي ادعاءين سابقين بعد التحقق (تشفير توكن FB في تقرير 1، وفهرس `user_permissions` في تقرير 10). لو لقيت بند مش مظبوط، قولّي وأعيد التحقق منه.

## الخطوة التالية المقترحة
لو عايز، أبدأ بتنفيذ الإصلاحات بترتيب الأولويات (كل واحدة PR صغير بـ test): الأول **2.1** (حقن SQL — مع unit tests بقيم تنتهي بـ `\`)، ثم **1.1+10.1** (rate-limit ذرّي + `maxBatchSize`)، ثم **8.1** (مركزية سنة MSSQL). النقاط 13.1/13.2 تحتاج قرارك أنت على GitHub/Play Console.
