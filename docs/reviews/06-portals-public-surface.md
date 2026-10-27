# تقرير مراجعة — موديول 6: Portals + الواجهات العامة (Patient Portal / Doctor Portal / External Doctors / Booking)

**النطاق:** `server/routers/patientPortal.ts` (1180)، `doctorPortal.ts` (398)، `externalDoctors.ts` (384)، `referralDoctors.ts`، `server/_core/context.ts` (جلسات المريض/الدكتور)، `webPush.ts`، وأثرها في `index.ts` (`/api/srv100/uploads/:id`, rate limiters).
**العمق:** قراءة كاملة لـ: `patientPortal.login/getMy*/booking/…` (حتى السطر 1030 تقريباً)، `doctorPortal.*`، `externalDoctors.createDoctor/updateDoctor/resetPassword`. `listReferrals/createReferral/accessLogs` ما اتقرأوش بالتفصيل (admin-only).
**ليه ده الموديول الأخطر:** هو الوحيد المكشوف لمستخدمين **غير موظفين** (مرضى + أطباء خارجيين + زوار anonymous) وبيطلّع بيانات طبية.
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 6.1 | 🔴 | Security | تسجيل دخول المريض = (هاتف + كود المريض التسلسلي) — عامل ثاني ضعيف جداً |
| 6.2 | 🔴 | Security / Abuse | `createGuestBooking` عام بدون rate-limit/CAPTCHA ويبعت WhatsApp لأي رقم يكتبه الزائر |
| 6.3 | 🟠 | Security | Blind SSRF عن طريق `pushSubscription.endpoint` (مريض + موظف) |
| 6.4 | 🟠 | Privacy | تعداد أرقام المرضى: رسائل مختلفة لـ"غير مسجل" و"بيانات غير صحيحة" |
| 6.5 | 🟠 | Bug | تسجيل الدخول `limit(1)` على الهاتف: أفراد الأسرة (نفس الرقم) ما يقدروش يدخلوا / ملف غلط |
| 6.6 | 🟠 | Privacy | بوابة الدكتور الخارجي بترجّع هاتف/عنوان/تاريخ مرضي كامل — أكتر من اللازم |
| 6.7 | 🟠 | Authz | الإسناد التلقائي (`patients.doctorCode = externalDoctors.doctorCode`) بيفتح السجل بدون إجراء بشري |
| 6.8 | 🟠 | Bug | `updateBooking` بيبعت WhatsApp متكرر لنفس الحالة (مفيش `statusChanged` gate) |
| 6.9 | 🟠 | Bug | إغلاقات الحجز (`bookingClosures`) لا تُفلتر بالفرع (العمود غير مُختار) |
| 6.10 | 🟡 | Security | `logAccess` لوصول الدكتور يفشل "مفتوح" (بدون إيقاف الطلب) |
| 6.11 | 🟡 | Security | sessions: JWT المريض (30 يوم) مخزّن خام في DB؛ لا انتهاء/تدوير؛ لا حد لعدد الجلسات |
| 6.12 | 🟡 | Validation | `requestedDate`/`confirmedDate` بدون منطق (ماضي/إغلاق/weekday)، `fromDate` عام غير متحقق |
| 6.13 | 🟡 | Audit | تعديل/حذف الحجوزات والـ closures بدون audit؛ `deleteBooking` hard delete |
| 6.14 | 🟡 | Security | سياسة كلمات مرور الأطباء (min 6) + مفيش قفل بعد فشل متكرر غير الـ throttle المؤقت |
| 6.15 | 🔵 | Code | منطق إرسال الإشعار مكرر بين `createBooking`/`createGuestBooking`؛ ملف 1180 سطر |

---

## 🔴 High

### 6.1 عامل الدخول الثاني ضعيف
`patientPortal.ts:95-169`: الدخول بـ `phone` + `patientCode`. `patientCode` هو رقم الملف/الإيصال (تسلسلي، مطبوع على كل ورقة، وبيظهر في روابط/صور)، ورقم الهاتف معروف للأقارب/الأصدقاء/أي حد شاف الإيصال. بعد الدخول بتتاح: الملف الطبي (`medicalHistory`, `allergies`)، الروشتات، الأشعة، الحجوزات، وتحميل الصور (`/api/srv100/uploads/:id`).
**التخفيف الموجود:** عداد محاولات في DB (`consumeLoginRateLimit`, 5/15د لكل IP+هاتف) — **لكنه غير ذرّي** (read-then-write، تفاصيله في تقرير 10.1): طلبات متوازية (tRPC batch) كلها بتقرأ نفس القيمة القديمة فبيمرّ منها عدد كبير قبل ما العدّاد يوصل 5. **وكمان** مرتبط بـ `ctx.req.ip` وفي غياب `trust proxy` (تقرير Core 1.16) الـ IP هو IP الـ proxy ⇒ العداد فعلياً لكل هاتف وليس لكل مهاجم: 5 محاولات خاطئة تقفل المريض الحقيقي 15 دقيقة (DoS على أي مريض)، ولو الـ IP حقيقي فالمهاجم بـ IPs متعددة يخمّن الكود (مساحة صغيرة: أرقام تسلسلية).
**الإصلاح:** OTP عبر WhatsApp/SMS (البنية موجودة: `bookingWhatsApp.service`)، أو كود سري عشوائي منفصل يطبع على الإيصال، أو DOB كعامل ثالث على الأقل. ومعاه: عدّاد على الهاتف **لوحده** (مش IP+هاتف) + عدّاد على الـ IP لوحده، وإشعار للمريض عند الدخول من جهاز جديد.

### 6.2 `createGuestBooking` — إساءة استخدام WhatsApp/إشعارات
`patientPortal.ts:459-532` (`publicProcedure`): بدون أي rate-limit (الـ limiters في `index.ts` مغطيين `login` فقط)، بدون CAPTCHA، بدون dedupe على الطلب.
كل استدعاء: (أ) INSERT في `patientPortalBookings`؛ (ب) `broadcastBookingUpdate()` لكل الموظفين؛ (ج) `pushAppNotification` (Web Push/FCM لكل الاستقبال)؛ (د) **`sendBookingReceiptWhatsApp` على رقم يكتبه الزائر** — مفتاح الـ dedupe `booking-received:${phone}:${5min}` يمنع التكرار لنفس الرقم فقط، فمهاجم يرسل رقم مختلف في كل طلب يخلّي رقم الواتساب بيزنس الخاص بالعيادة يبعت رسائل template لأي أرقام (تكلفة لكل conversation، وخطر خفض جودة الرقم/حظره، وتحرّش بطرف ثالث).
**الإصلاح:** express-rate-limit على `/api/trpc/patientPortal.createGuestBooking` (مع معالجة الـ batching: لا تعتمد على الـ path — ضع الـ limiter داخل الـ procedure أو على `/api/trpc` مع تحليل أسماء الـ procedures)، CAPTCHA (Turnstile/hCaptcha)، حد على عدد الطلبات pending لنفس الرقم/اليوم، **ولا تبعت WhatsApp قبل تأكيد ملكية الرقم** (OTP) أو بعد موافقة الاستقبال.

---

## 🟠 Medium

### 6.3 Blind SSRF
`registerPatientPushToken` (`patientPortal.ts:862-876`, مريض) و`registerPushDeviceToken` (`medical-ops.ts:2305`, أي موظف) بيخزّنوا نص حر (`subscription`/token). `sendWebPushToSubscription` (`webPush.ts:35-58`) بيعمل `JSON.parse` ثم `webpush.sendNotification(subscription, …)` — المكتبة بتعمل **POST إلى `subscription.endpoint`** بدون أي allow-list. مريض (أو من خمّن بياناته: 6.1) يقدر يضع `endpoint: "http://169.254.169.254/…"` أو `http://localhost:4000/…` أو أي خدمة داخلية ⇒ السيرفر يبعت POST (blind) كلما اتبعت إشعار. الشبكة الداخلية فيها SQL Server وجهاز البصمة وغيرها.
**الإصلاح:** تحقق من `new URL(endpoint)`: `https:` فقط + host في allow-list (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.notify.windows.com`, `web.push.apple.com`) + رفض IPs خاصة بعد DNS resolve، وفحص الشكل `{endpoint, keys:{p256dh,auth}}` بـ zod + حد حجم.

### 6.4 تعداد الأرقام
`login`: `NOT_FOUND "البيانات غير مسجلة"` لو الهاتف مش موجود، و`UNAUTHORIZED "البيانات غير صحيحة"` لو الكود غلط ⇒ أي حد يقدر يتحقق إن رقم X **مريض عند العيادة** (عيادة عيون: بيانات صحية حساسة). ارجع رسالة واحدة ثابتة وزمن متشابه.

### 6.5 تسجيل الدخول بـ `limit(1)` على الهاتف
`patientPortal.ts:125-133`: `where(patients.phone = phone).limit(1)` ثم مقارنة الكود. لو أسرة بنفس الهاتف (شائع جداً) — يجيب مريض واحد عشوائي؛ باقي أفراد الأسرة دايماً "بيانات غير صحيحة". الصح: `where(phone = ? AND patientCode = ?)`. (وجه تاني لنفس جذر 5.1 في تقرير Medical: افتراض إن الهاتف يميّز شخص.) كمان المقارنة `eq(patients.phone, phone)` تفترض إن الهاتف متخزن مطبّع بنفس صيغة `normalizePhone` (`01…`)؛ أي سجل مخزّن بـ `+20…` أو بمسافات **لا يستطيع الدخول أبداً**.

### 6.6 إفراط في بيانات الدكتور الخارجي
`doctorPortal.getPatientImages` (`259-397`) بيرجّع كائن `patient` فيه `phone`, `address`, `dateOfBirth`, `medicalHistory`, `allergies`, `serviceType`, `status` + كل الروشتات + الصور. دكتور خارجي (جهة تانية قانونياً) محتاج غالباً الاسم/العمر/النتائج، مش رقم الهاتف والعنوان. طبّق minimization: اختار الحقول حسب الغرض (ورقة إحالة).

### 6.7 الإسناد التلقائي بالـ doctorCode
`getMyPatients`/`getPatientImages`: الدكتور بيشوف أي مريض `patients.doctorCode = externalDoctors.doctorCode` (بشرط وجود رفع). **`doctorCode` على المريض بيتغيّر تلقائياً بالمزامنة من MSSQL** (راجع `attachTreatingDoctor`/`PAPAT_SRV.SRV_BY1` في CLAUDE.md) وبعمليات `bulkAssignDoctorToPatients`/`updatePatient`. يعني تغيير كود في نظام تاني أو غلطة إدخال = كشف ملف مريض لجهة خارجية بدون موافقة أو إحالة. وكمان تطابق `doctorCode` بين `externalDoctors` (حر نصي، `max 64`) و`doctors` (داخلي) — لو دكتور خارجي اتسجل بنفس كود دكتور داخلي (مثلاً "12") يشوف كل مرضى الدكتور الداخلي. (`externalDoctors.doctorCode` اختياري وبلا unique.)
**الإصلاح:** الإحالة الصريحة (`externalDoctorReferrals`) تكون المصدر الوحيد، أو الإسناد التلقائي بعد تأكيد admin (flag `autoMapApproved`) مع unique على `externalDoctors.doctorCode`.

### 6.8 رسائل WhatsApp مكررة
`updateBooking` (`patientPortal.ts:959-979`): الإيميل مقيّد بـ `statusChanged` بينما WhatsApp لا (`if (input.status === "confirmed" || …)`) ومفتاح الـ dedupe فيه `confirmationRequestId ?? Math.floor(Date.now()/10000)`: ضغطة "تأكيد" تانية بعد 10 ثواني (أو تعديل ملاحظات على حجز مؤكد بالفعل) = رسالة WhatsApp تانية للمريض. أضف `statusChanged &&`.

### 6.9 Closures ما بتتفلترش بالفرع
`getAvailableDates` (`patientPortal.ts:346-364`): الـ `select` بيجيب `startDate, endDate, bookingType` فقط، لكن الفلتر بعدها بيقرأ `r.branch` (غير موجود ⇒ `undefined` ⇒ `r.branch == null` دايماً true). نتيجة: إغلاق فرع كفر الشيخ بيقفل التواريخ على طنطا والعكس. أضف `branch: bookingClosures.branch` للـ select.

---

## 🟡 Low

- **6.10** `doctorPortal.logAccess` بيبلع الفشل (تعليق: "keep portal access available"). أي فشل كتابة لوج = وصول لبيانات طبية بدون أثر. لـ PHI الأفضل fail-closed أو queue بديل. وكمان `logAccess` فقط على `login` و`view_images` — مفيش log لـ `getMyPatients` ولا لتنزيل الصورة نفسها (`/api/srv100/uploads/:id` بـ `x-doctor-token` ما بيسجّلش).
- **6.11** `patientPortalSessions.token` = الـ JWT كامل في DB (نص خام): تسريب DB = جلسات صالحة 30 يوم. استخدم `jti` + hash. مفيش حد لعدد الجلسات للمريض الواحد (كل login صف جديد)، ولا تنظيف للجلسات المنتهية (راجع أن فيه job). `logout` بيحذف جلسة واحدة فقط. نفس تعليق التقرير 1 (`algorithms`).
- **6.12** `requestedDate` regex شكلي فقط (يقبل 1900/2999)، ما بيتحققش إنه في المستقبل ولا ضمن `weekdayMask`/closure (الـ `getAvailableDates` استشاري فقط)، فالزائر يطلب يوم الجمعة المغلق. `fromDate: z.string().optional()` في `getAvailableDates` (public) بدون regex ⇒ `new Date("garbage")` ⇒ Invalid Date يوصل للـ query.
  `createBooking` (مريض): بدون حد على عدد الطلبات `pending` للمريض.
- **6.13** `updateBooking/deleteBooking/addClosure/updateSchedule/createStaff*Booking`: لا `logAuditEvent`. تحويل حجز لمريض آخر (`patientId` في `updateBooking`) بدون أثر.
- **6.14** `createDoctor`/`resetPassword`: `password.min(6)`؛ مفيش force-change عند أول دخول، ولا تدوير. الأفضل توليد كلمة مرور مؤقتة وإجبار التغيير. `username` فحص التفرّد case-sensitive بينما login limiter بيعمل `toLowerCase()` ⇒ ممكن حسابين `Dr` و`dr` يشاركوا نفس الـ limiter.
- `listBookings` مقيّد `limit 200`؛ لكن `deleteBooking`/`updateBooking` على `id` بدون تحقق فرع/نوع.
- `getMyScans`: بيرجّع كل ملفات `srv100_uploads` للمريض (بما فيها `source_printer` غير الطبي؟) — راجع إن ما فيش ملفات داخلية/إدارية بتتسجّل بنفس `patient_id` (مثل مستندات OCR مرتبطة بالخطأ بسبب `fix-duplicates`/`link-by-filename` في تقرير Core 1.11 — ربط خاطئ = مريض يشوف مستند مريض تاني).

## 🔵 Code

- مسارا `createBooking`/`createGuestBooking` ينسخوا نفس منطق الإشعار (35 سطر)، و`updateBooking` 150 سطر بيخلط DB + email + WhatsApp + web-push.
- الإرسال داخل `for … of sessions` متتابع (`updateBooking:996-1020`) وبـ `.then().catch` بدون انتظار؛ `sendWebPushNotifications` (`webPush.ts:90-115`) متتابع لكل registration (staff) — مع عدد أجهزة كبير هتبطّأ.
- `BOOKING_TYPE_LABELS` ما فيهوش `pentacam` رغم إنه من الـ enum → التسمية تظهر بالإنجليزي.

## ما اتأكدت إنه سليم
- حدود الملكية في بوابة المريض: كل `getMy*` بيعتمد على `ctx.patientSession.patientId` من الـ JWT + جلسة DB فعّالة (`context.ts`) — مفيش IDOR بـ `patientId` من الـ client.
- `doctorPortal.getPatientImages` بيتحقق من الإحالة/الإسناد قبل أي بيانات (`FORBIDDEN` وإلا)، وبيكتب access log.
- جلسة الدكتور بتتبطل بـ `authVersion` عند التعطيل/إعادة التعيين (`externalDoctors.updateDoctor/resetPassword`).
- `/api/srv100/uploads/:id` بيتحقق من المريض/الدكتور المسند (`canReadSrv100Upload`) قبل التقديم (لكن راجع 1.5: أي staff يعدّي).
- (تصحيح لملاحظة سابقة) محدد المحاولات الداخلي موجود لكنه غير ذرّي → يتخطّاه الـ batching جزئياً (تقرير 10.1).
- مفيش SQL injection: كل الاستعلامات Drizzle/`sql` tagged (وجدت `IN ${codes}` بيتوسّع كـ parameters).
