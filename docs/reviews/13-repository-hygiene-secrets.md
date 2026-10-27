# تقرير مراجعة — موديول 13: المستودع نفسه (Git history / أسرار / بيانات حساسة / binaries / CI)

**الطريقة:** أوامر `git` على الـ repo المحلي + `gh repo view` (قراءة فقط) + بحث أنماط أسرار في الملفات المتتبّعة وفي تاريخ الـ commits (من غير طباعة أي قيمة). **لم أفتح أي مفتاح أو أكواد سرية، ولم أغيّر أي إعداد على GitHub.**
**هذا التقرير فيه أخطر نتيجة في المراجعة كلها، وقراره مش كودي: ده قرار إدارة/قانوني/أمني.**

---

## 🔴 13.1 المستودع على GitHub **عام (Public)** وفيه بيانات مرضى وبيانات مالية

**الدليل:**
```
$ git remote -v        → origin https://github.com/Ab0umar/SELRS.git
$ gh repo view Ab0umar/SELRS --json visibility,isPrivate
{"isPrivate":false,"visibility":"PUBLIC"}
$ git ls-tree -r origin/main -- reports
reports/Q1_2026_exam_report.csv    reports/Q1_2026_exam_report.txt
reports/cashbook-expense-statements.csv    reports/cashbook-expense-statements-grouped.csv
```
- `reports/Q1_2026_exam_report.csv` (274 سطر): أعمدة `Patient Code, Full Name (عربي كامل), Service Type, Reg Date, Service Codes, Autoref, Glasses, Pentacam, Status` — **أسماء مرضى حقيقيين + أكواد ملفاتهم + نوع الخدمة/الفحص**. هذا PHI حسب تصنيف `docs/security.md` ("Restricted: medical and identity… Never in … logs, screenshots or error messages. Exports and backups are access-controlled").
- `reports/cashbook-expense-statements*.csv` (1664 سطر): ملخص مصروفات الخزنة بأسماء أشخاص/جهات ومبالغ وتواريخ (2024–2026) — بيانات مالية داخلية ("Confidential: operations and finance").
- الملفات موجودة في `origin/main` الحالي **وفي التاريخ** (أول إضافة: commit `714b09ef`).
**الأثر:** أي شخص على الإنترنت يقدر يقرأها/ينسخها/تتفهرس (Google/GitHub code search/Archive). حذفها من آخر commit **مش كافي**.
**اللي لازم يتعمل (بالترتيب):**
1. **حوّل المستودع إلى Private فوراً** (Settings → Danger Zone). (أنا ما غيّرتش حاجة — القرار والصلاحية لك.)
2. شيل `reports/` من الـ tracking، وأضفه لـ `.gitignore`، ثم **امسح الملفات من كل التاريخ** (`git filter-repo --path reports/ --invert-paths`) ثم force-push، واطلب من GitHub Support مسح الـ cached views/forks (`Contact support → remove cached sensitive data`) — لو في forks أو clones عند حد تاني فالبيانات خرجت فعلاً.
3. قيّم مع المسؤول القانوني/الخصوصية هل ده بيستوجب إخطاراً (قانون حماية البيانات الشخصية المصري 151/2020 + سياسة المركز) واحتفظ بسجل زمني: متى اترفع الملف، متى اتحوّل private، هل حد عمل fork/clone.
4. افحص بقية الـ 4634 ملف متتبّع بحثاً عن بيانات مشابهة (التقارير/الـ exports): `Xlsx/*.xlsx` (قوالب كتالوج — فحصت `patients_import_with_doctor_template.xlsx`: لا نصوص، تمام)، `.agents/impeccable/*.png` (لقطات شاشة للتطبيق: **راجع كل صورة** فقد تحتوي أسماء مرضى حقيقيين: `patient-hub-*.png`, `operations-*.png`, `login-after-submit.png`)، `ds-bundle/`, `.zcode/`, `outputs/`, `attendance-home-*.png`/`dashboard-*.png` (على الـ root — غير متتبَّعة حسب `git ls-files`؛ تأكد).
5. أضف **pre-commit + CI scanning** (gitleaks/trufflehog لأسرار، وفحص مخصّص لأنماط PHI: ملفات `.csv/.xlsx/.png` تحت `reports/`, `exports/`).

---

## 🔴 13.2 مفاتيح توقيع Android + `key.properties` في تاريخ مستودع عام

**الدليل (`git log --all --diff-filter=A` — ملفات اتضافت في الماضي):**
| الملف | أول/آخر commits |
|---|---|
| `android/key.properties` | `3d9a7fd1`, `4f11d4d2` — يحتوي المفاتيح `storeFile / storePassword / keyAlias / keyPassword` (قيمها لم أطبعها) |
| `android/selrs-release.jks` | `e764dfdd`, `c03774e7` |
| `android/selrs.keystore` | `d817ad22`, `16809bd9` |
| `release.keystore`, `selrs.keystore` (root) | `d817ad22`, `16809bd9` |
اتشالت من آخر commit (مش موجودة في `git ls-tree origin/main`) لكنها **ما زالت قابلة للتحميل من تاريخ GitHub العام**. `docs/security.md` عنده البند المفتوح: *"Decide whether each tracked keystore was production or test; rotate if any was real production signing material."* — **المستودع عام** يرفع الخطورة من "نظري" لـ "فعلي": أي حد ينزّل الـ keystore + passwords من `key.properties` يقدر يوقّع APK يدّعي إنه `cc.selrs.app` (تحديثات خبيثة بمجرد ما يتثبّت فوق/يخدع المستخدمين، ولو الـ Play App Signing مش مفعّل يتعطّل الـ upload key).
**الإجراء:** (أ) حدّد أي ملف كان مفتاح الإنتاج الفعلي (تاريخ آخر build/الـ fingerprint بـ `keytool -list -v` على النسخة المحلية)؛ (ب) لو `Play App Signing` مفعّل → اعمل **upload key reset** من Play Console؛ لو مش مفعّل → المفتاح اتحرق ولازم تغيّر `applicationId`/تفعّل Play App Signing وتهاجر المستخدمين؛ (ج) اعتبر كل passwords في `key.properties` مكشوفة (غيّر أي مكان استُخدمت فيه)؛ (د) شيلهم من التاريخ مع 13.1؛ (هـ) خزّن المفاتيح خارج الـ repo (CI secrets/وحدة تخزين مشفرة).

---

## 🟠 13.3 `android/app/google-services.json` متتبَّع
فيه `project_id: selrs-35f95`, `mobilesdk_app_id`, و`api_key.current_key` (مفتاح Firebase/Google Cloud للـ Android). مفاتيح Firebase للعملاء مش "أسرار" بالتصميم، **لكن** لو المفتاح غير مقيّد في Google Cloud Console (Application restrictions = Android apps + SHA-1، API restrictions = Firebase/FCM فقط) يقدر أي حد يستخدمه على حسابك (quota/billing). قيّده، وراجع صلاحيات `selrs-35f95.firebasestorage.app` (Storage rules) لأنها بتتعرف علناً.

## 🟡 13.4 معلومات بنية داخلية في مستودع عام
كود/وثائق/اختبارات فيها: IP جهاز البصمة `41.199.252.107` (`deviceSettings.service.ts:36`)، LAN `192.168.1.100` (`capacitor.config.ts`)، مسارات `E:\selrs.cc\…` و`E:\Taurus V3.0\Taurus.mdb` (`env.ts:25-30`)، رقم دعم WhatsApp `01285800309`، أسماء قواعد البيانات (`selrs23-26`, `op2026`) وبنية الجداول الكاملة (`drizzle/schema.ts` 129 جدول)، تفاصيل ثغرات سابقة (`docs/attendance-code-review.md` بتصف SQL injection/command injection بمكانها قبل ما تتصلّح). ده بيسهّل الاستطلاع على أي مهاجم — وخصوصاً بالتزامن مع 13.1. (التحويل لـ Private بيحل معظمه.)

## 🟡 13.5 ملفات تنفيذية (`.exe/.dll`) متتبَّعة وبتتنفّذ من السيرفر
`server/{FKOldLogPuller,FKUserPuller,FKUserPuller.rebuilt}.exe`, `server/{FKAttend,FKViaDev,FpDataConv,LFWViaDev}.dll`, ونسخ مكررة في `scripts/` — بيستدعيها السيرفر بـ `execFile` (`env.ts:22-30` `FK_PULLER_PATH`, `FK_USER_PULLER_PATH`). مفيش checksum/توقيع بيتحقق منه قبل التشغيل، ولا مصدر مرجعي (فيه `.cs` بجوارها: `FKOldLogPuller.cs`, `FKUserPuller.cs` — جيد). لو المستودع اتعدّل (PR مدموج بدون انتباه / حساب GitHub مخترَق) الـ exe بيتغيّر وبيتنفذ على سيرفر الإنتاج بصلاحياته. **الإصلاح:** ابنِهم في CI من الـ `.cs` وانشر artifact موقّع، أو حط SHA-256 متوقع في config وتحقق منه قبل `execFile`، وشيل النسخ المكررة (`scripts/` vs `server/`).

## 🟡 13.6 CI يعمل ضد `E2E_BASE_URL` بحساب admin
`.github/workflows/ci.yml:91-110`: بعد `pnpm e2e:seed` (على DB الاختبار المحلي في الـ runner)، `pnpm test:ui` بيشتغل بـ `BASE_URL: ${{ secrets.E2E_BASE_URL }}` و`E2E_USER/E2E_PASS`. لو `E2E_BASE_URL` بيشاور على **الإنتاج** (selrs.cc) فكل push بيدخل الإنتاج كـ admin من أجهزة GitHub، ولو التيستات بتكتب بيانات (إنشاء مريض/حجز/…) فهي بتلوّث الإنتاج. تأكد إنه staging معزول. (الـ trigger `pull_request` — مش `pull_request_target` — فالـ forks مش بتاخد الـ secrets: ✔️.) وكلمة سر الـ MySQL في الـ workflow (`root:root`) خاصة بحاوية CI مؤقتة — مقبول.

## 🔵 13.7 نظافة المستودع
- 4634 ملف متتبّع، حزمة git ≈ 128 MB: `ds-bundle/` (1475 ملف)، `.agents/` (878، لقطات شاشة PNG)، `.claude/` (213)، `.zcode/` (166)، 447 صورة. دي مخرجات أدوات AI/تصميم مش جزء من المنتج — اعمل لها `.gitignore` أو مستودع منفصل، وده كمان بيقلّل مساحة سطح الكشف في 13.1.
- جذر المشروع فيه مخلّفات محلية (`battery-report.html`, `lighthouse-report.json`, `logs.csv`, `build_out.txt`, لقطات شاشة…) — غير متتبَّعة (تم التحقق بـ `git ls-files`) لكن موجودة؛ نظّفها.
- `docs/security.md` يقول "future keystore/private-key commits blocked" — جيد، لكن مفيش حاجز مماثل للـ PHI (CSV/XLSX/PNG) — أضفه (13.1-5).

## ما اتأكدت إنه سليم
- `.env`/`.env.*` في `.gitignore`، و`.env.example` فيه placeholders فقط (فحصت `JWT_SECRET` في `.env.example` وتاريخه: placeholder `replace-with-at-least-32-random-characters`).
- بحث أنماط أسرار (AWS `AKIA…`, `sk-…`, `ghp_…`, `xox…`, private-key PEM) في الملفات المتتبَّعة الحالية: لا نتائج حقيقية (ظهر `google-services.json` [13.3] و4 ملفات `Sheets/*.svg` — أرجح إنها base64 صور داخل SVG، false positive).
- بحث أنماط `JWT_SECRET/DATABASE_URL/MSSQL_PASSWORD/…=` في التاريخ: النتائج placeholders أو إشارات كود (`process.env…`)؛ **لم أجد سراً فعلياً غير ما ذُكر أعلاه** (البحث بالأنماط لا يضمن شمولاً).
- الـ workflow بصلاحيات `contents: read` فقط وبدون `pull_request_target`.
