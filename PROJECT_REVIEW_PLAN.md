# SELRS Project Review — خطة التنفيذ

مبنية على مراجعة `SELRS Project Review.md` (Manus AI) بعد التحقق من أهم الادعاءات القابلة للفحص مباشرة في الكود (أحجام الملفات، `/healthz`، الـkeystores، `deploy-web.ps1`، CI، تعارض الإصدار) — كلها طابقت الواقع.

## المرحلة 1 — أسبوع واحد (P0، أرخص تكلفة وأعلى خطر)

### 1.1 تقليل `/healthz`
- **الملف:** `server/_core/index.ts:1918-1964`
- اقسمها لاتنين:
  - `/healthz` عام بدون auth → `{ ok: true }` بس.
  - `/healthz/diagnostics` (أو تحت `/api/admin/...`) محمي بـ`adminProcedure` أو middleware auth → فيه `env`, `version`, `commit`, `dbConnected`, `patientsCount`, `dbError`.
- أي خطأ DB يتسجل في اللوج بـcorrelation id بدل ما يترجع للمتصل.
- **اختبار:** طلب غير مُوثّق على `/healthz` يرجّع بس `{ok:true}` — لا نسخة، لا عدد مرضى، لا رسالة خطأ.

### 1.2 تصنيف/إزالة الـkeystores المتتبّعة
- **الملفات:** `android/selrs.keystore`, `release.keystore`, `selrs.keystore`
- اسأل: دول keys حقيقية استُخدمت في نشر فعلي، ولا placeholders تجريبية؟
- لو حقيقية: انقلها لـsecret store (GitHub Actions secrets / متغيرات بيئة على السيرفر)، اعمل `git rm --cached` + أضفهم في `.gitignore`، وابدأ إجراء rotation لو أي APK نُشر بيهم فعليًا.
- لو placeholders: وثّق كده صراحة في README عشان محدش يفترض إنها production.
- ضيف قاعدة CI (secret-scanning بسيط: grep على امتدادات `.keystore/.jks/.pem` في أي PR جديد) تمنع تسريب مستقبلي.

### 1.3 تجميد فرع نظيف
- الشغل الحالي فيه 185 entry معدّلة/untracked — قبل أي حاجة تانية، افصل التعديلات المقصودة عن أي حاجة generated/قديمة، وعمل commit نظيف كخط أساس (baseline) موثّق.

### 1.4 نقل إعداد pnpm
- شيل تحذير `pnpm` field في `package.json` غير المقروء، وانقل الإعدادات لمكانها الصح حسب توثيق pnpm الحالي، وثبّت نسخة pnpm في CI.

---

## المرحلة 2 — أسبوعين (P1: Authorization + Session)

### 2.1 توحيد الـauthorization
- **الملفات المتأثرة:** `server/_core/procedures.ts:16-720,761-943`, `client/src/lib/page-permissions.ts`
- ابني policy model واحد بـcapabilities صريحة (`attendance.read`, `attendance.write`, `salary.read`, `salary.write`, ...).
- كل mutation في أي router (medical, attendance, salary, accounting) يتحقق من capability واحدة موحّدة بدل الـbypasses المتفرقة الحالية.
- الـ`ProtectedRoute` في العميل يبقى مشتق من نفس الـpolicy، مش مصدر تاني للحقيقة.
- **اختبار جديد:** matrix test شامل — كل role × كل procedure حساس (medical/attendance/salary/accounting/portal)، يتأكد إن الأدوار غير المصرّح لها بترفض فعلاً.

### 2.2 Session hardening
- **الملف:** `server/_core/auth.ts:72-165,212-303` (JWT)، `:12-44` (rate limiter)
- ضيف session id سيرفر-side بدل الاعتماد على JWT expiry بس — logout يبطّل الـsession فورًا.
- انقل الـrate limiter من `Map` في الميموري لـRedis أو جدول DB مع TTL cleanup (خصوصًا مهم مع أكتر من PM2 worker أو أي إعادة تشغيل — تُصفّر الحالة في الميموري).
- ضيف CSRF/origin check للـmutations الحساسة (state-changing tRPC calls).
- ضيف security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) على مستوى الـreverse proxy أو الـserver.

### 2.3 Portal ownership tests
- **الملف:** `server/_core/context.ts:7-82`, `server/_core/procedures.ts:878-913`
- اختبارات negative صريحة: مريض A يحاول يوصل لملف/فحص/تقرير مريض B عبر الـpatient portal token → لازم يترفض.

---

## المرحلة 3 — 2-4 أسابيع (P1: Deployment)

### 3.1 استبدال `deploy-web.ps1`
- **الملف الحالي:** `scripts/deploy-web.ps1:1-31` (بس install+build، مفيش restart حقيقي)
- الخطوات المطلوبة بالترتيب:
  1. Build لـartifact واحد ثابت.
  2. Migration preflight (`pnpm db:sync-check` قبل أي restart).
  3. إيقاف العملية القديمة بأمان (graceful) + تشغيل الجديدة.
  4. Health check حقيقي بعد الـrestart (يستنى `/healthz` يرجّع 200 فعليًا، مش يفترض).
  5. Smoke test أساسي (login → صفحة رئيسية → API واحد حساس).
  6. Rollback تلقائي للـartifact السابق لو أي خطوة فشلت.
- سجّل commit hash + إصدار الـschema في كل deploy.

### 3.2 منع الـport fallback في الإنتاج
- **الملف:** `server/_core/index.ts:894-912,2290-2304`
- في `NODE_ENV=production`، لو البورت المفضّل مشغول → **fail fast** بدل ما يدوّر على بورت تاني (السلوك الحالي خطير لأن الـreverse proxy ممكن يفضل يبعت على العملية القديمة).

### 3.3 Playwright في CI
- **الملف:** `.github/workflows/ci.yml:32-52`, `playwright.config.ts:1-12`
- شيّل الـchannel المثبّت على Edge (يقلل portability)، وشغّل E2E ضد قاعدة بيانات seeded يُتخلّص منها بعد كل تشغيل.
- سيناريو أساسي واحد على الأقل: login → Home → ملف مريض → سجل طبي → تقرير/تصدير، وسيناريو تاني لـsalary/attendance الحرج.

---

## المرحلة 4 — 1-2 شهر (P2: Maintainability + Performance)

- تقسيم `server/_core/index.ts` (80KB) لـ`config`, `http`, `jobs`, `integrations`, `health`.
- تقسيم `server/db.ts` (289KB) حسب bounded context (patients / medical / attendance / salary / accounting).
- تقسيم `PayrollReport.tsx` (191KB) و`MedicalFilePanel.tsx` (167KB).
- **لكل ملف:** اكتب characterization tests الأول قبل أي تقسيم — عشان تتأكد إن السلوك مايتغيرش.
- **الملف:** `client/src/features/attendance/DailyView.tsx:65-92` — استبدال الـloop اليومي (30 طلب للشهر) بـendpoint واحد بمدى.
- قيّد الأعمدة الديناميكية في `server/integrations/mssqlPatients.ts:3801-3908` بـallowlist صريح، واختبرها منفصلة عن الـparameterized values.

## المرحلة 5 — 60-90 يوم (P2: Data governance)

- توثيق تصنيف البيانات لكل جدول/S3 bucket رئيسي.
- مراجعة صلاحيات S3 (least-privilege) + presigned URLs قصيرة العمر.
- تشفير النسخ الاحتياطية + سياسة retention/deletion موثّقة.
- Restore drill فعلي (مش نظري) — تجربة استرجاع كاملة وتوثيق النتيجة.
- مراجعة صلاحيات وصول ربع سنوية.

---

## نقطة البداية المقترحة

نبدأ بـ**1.1 (`/healthz`)** و**3.2 (fail-fast على تعارض البورت)** مع بعض — الاتنين سريعين ومباشرين، وبيصلّحوا بالظبط مشكلة عدم-التأكد-من-إعادة-التشغيل اللي ظهرت فعليًا أثناء شغل النهارده.
