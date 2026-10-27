# تقرير مراجعة — موديول 12: الواجهة الأمامية (`client/src`) + الـ shells (Electron / Capacitor-Android)

**النطاق:** `client/src` (659 ملف TS/TSX)، `desktop-electron/main.js` (267 سطر)، `capacitor.config.ts`، مجلد `android/` (المتتبَّع فيه `res/` و`assets/` فقط).
**العمق:** مراجعة **قائمة على أنماط الخطر (grep + قراءة المواضع المطابقة)** وليست قراءة لـ 659 ملف: التخزين المحلي للتوكنات، `dangerouslySetInnerHTML`/`innerHTML`/`document.write`، `window.open`، الـ offline query-cache، تدفق logout، جدولة الـ routes/guards، وإعدادات Electron/Capacitor. تصميم الـ UI/الـ UX/RTL/الأداء الداخلي للمكونات **لم يُراجع** (راجع الـ skills `antislop-*`/`impeccable` لو عايز مراجعة تصميم).
**ما لم أستطع مراجعته:** كود Android الأصلي (`AndroidManifest.xml`, `MainActivity.java`) غير موجود في المستودع (متتبَّع فقط `android/app/src/main/{assets,res}`)، وكذلك `SelrsDesktop/Form1.cs` (WebView2 shell).
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 12.1 | 🔴 | Security | توكن الموظف (JWT، سنة افتراضياً) في `localStorage` + Bearer ⇒ HttpOnly cookie بلا فايدة؛ أي XSS = سرقة جلسة سنة |
| 12.2 | 🟠 | Security (XSS) | `AbsentReport.handlePrint`: اسم الموظف غير مُهرّب داخل `innerHTML` للصفحة الأصلية |
| 12.3 | 🟠 | Privacy | الـ offline query-cache (`selrs:query-cache:v1`) فيها حالات المرضى/المستخدمين/الصلاحيات لـ 7 أيام ولا تُمسح عند logout |
| 12.4 | 🟡 | Security | توكنات المريض/الدكتور (30 يوم) في `localStorage` + `main.tsx` بيحقنها في كل request |
| 12.5 | 🟡 | Security | `ActualPrintPreview`: `template.innerHTML = snapshot.html` (يعتمد على مصدر الـ snapshot) |
| 12.6 | 🟡 | Hygiene | `target="_blank"` بدون `rel` في 4 أماكن؛ `console.log` لتفاصيل cache المرضى |
| 12.7 | 🔵 | Code | 12 ملف routes/pages ضخمة؛ تحقق الصلاحيات في الواجهة مرجعي فقط (UI gating) |

---

## 🔴 High

### 12.1 توكن الجلسة في `localStorage`
- `pages/Home.tsx:103`: `if (data?.token) store.setItem("token", String(data.token))` (الـ server بيرجّع `token` في JSON — تقرير Core 1.7).
- `main.tsx:457`: بيقراه ويضيفه كـ `Authorization: Bearer` لكل request؛ `AuthenticatedImage.tsx:34` بيقراه برضه.
- النتيجة: الـ `HttpOnly` cookie (اللي المفروض يحمي من XSS) **ملهوش تأثير** لأن نفس الـ JWT متاح لأي سكريبت في الصفحة. مدة الصلاحية الافتراضية (rememberMe) **سنة** (`auth.ts:312`). و12.2 تحت دليل عملي على إن XSS فعلاً ممكن في الكود الحالي.
**الإصلاح:** على الويب: اعتمد الـ cookie فقط (احذف الـ `token` من response/`localStorage`)، `fetch(..., {credentials:"include"})` (موجود CORS credentialed أصلاً). التوكن مطلوب بس لـ Capacitor/Desktop shells (`capacitor://localhost`) — خزّنه هناك في **Keychain/Keystore** (`@capacitor/preferences` مش آمن؛ استخدم `capacitor-secure-storage-plugin`)، وخلّي صلاحيته قصيرة (≤ 7 أيام) مع refresh. وأضف CSP أشد (تقرير Core 1.14) كطبقة ثانية.

---

## 🟠 Medium

### 12.2 DOM-XSS في تقرير الغياب
`features/salary/AbsentReport.tsx:97-130`:
```ts
`<td class="emp-col" rowspan="${days.length}">${name}</td>`      // name = empName من attendance_employees.full_name
...
container.innerHTML = `<style>${PRINT_CSS}</style>${html}`;      // يُلحق على document.body (نفس الصفحة/origin)
```
`name` غير مُهرَّب. بقية ملفات الطباعة (`Reports.tsx`, `SalaryPenalties.tsx`, `ShiftSchedule.tsx`, `PermissionReport.tsx`, `LeaveBalanceReport.tsx`, `MonthlyFingerprints.tsx`, `LocalPentacamExportsPanel.tsx`) فيها `escapeHtml`/`esc` — ده الوحيد المتخلف.
**مصدر `full_name`:** بيتجاب من جهاز البصمة (`syncEmployeesFromDevice` / `FKUserPuller`) أو بيتحرر يدوياً؛ يعني أي حد يقدر يسجّل مستخدم على الجهاز باسم `<img src=x onerror="…">` (أو موظف HR) ⇒ الكود بينفّذ في جلسة موظف الرواتب لما يطبع التقرير ويسرق التوكن (12.1).
**الإصلاح:** `escapeHtml(name)` (الدالة موجودة في ملفات تانية، اعملها util مشترك `lib/html.ts`) أو بناء الـ DOM بـ `textContent`. وأضف eslint rule يمنع `innerHTML =`/`document.write` خارج util واحد.

### 12.3 الـ query-cache المحلي
`lib/appRuntime.ts:31-122, 310-345`: `selrs:query-cache:v1` في `localStorage` بحد أقصى 120 إدخال لمدة 7 أيام (`QUERY_CACHE_MAX_AGE_MS`)، وبيحفظ استعلامات بحسب `SAFE_QUERY_FRAGMENTS`: `getPatientPageState` (حالة فحص المريض JSON كاملة — PHI)، `getAllUsers` (المستخدمين/الإيميلات)، `getUserPermissionState`, `getTeamPermissions`, `getPatientStats`…
- `clearAllPatientCaches()` (`lib/patientCacheCleanup.ts:42`) بتمسح `patient_state_*`/`examination_draft_*`/`*_patient_*` **ومش** `selrs:query-cache:v1` — فلا الـ logout ولا تبديل المستخدم بيمسحه (`grep` على المفتاح = `appRuntime.ts` بس).
- `hydrateOfflineQueryCache()` (`main.tsx:570`) بيحقن الـ cache في الـ QueryClient عند الإقلاع لأي مستخدم (مفتاح الـ cache غير مرتبط بـ userId). على جهاز مشترك (استقبال/فني) المستخدم التاني يشوف بيانات الأول (بما فيها صلاحياته المخزّنة!) لحد ما تتحدث.
**الإصلاح:** اربط المفتاح بـ `user.id`، وامسحه في `logout`/عند تغيّر المستخدم، وشيل `getPatientPageState` و`getAllUsers` من القائمة الآمنة (PHI/PII)، أو شفّره بمفتاح مشتق من الجلسة، أو استخدم `sessionStorage`.

---

## 🟡 Low

- **12.4** `hooks/usePatientAuth.ts:101`, `useDoctorAuth.ts:98`: JWT 30 يوم في `localStorage`، و`main.tsx:472-476` بيحقنهم في كل request (حتى الطلبات اللي مش لازم). الدكتور الخارجي بيشوف PHI → أقصر الصلاحية (24h) وخزّن في `sessionStorage`. (راجع تقرير 6.)
- **12.5** `features/admin/ActualPrintPreview.tsx:160`: `template.innerHTML = snapshot.html` داخل iframe بنفس الـ origin (`doc.write` + `<base href=window.location.origin>`) ويحذف بس `onload/onerror` من العناصر. لو `snapshot.html` مصدره DOM الصفحة نفسها (مفترض) فهو آمن بنفس درجة الصفحة؛ لو بيتحمل من الـ server/قالب مخزّن، استخدم DOMPurify. (لم أتتبع مصدر `snapshot`.)
- **12.6** `target="_blank"` بدون `rel` في `LocalPentacamExportsPanel.tsx:974,997`, `DiagnosisImagesPanel.tsx:289`, `PentacamTab.tsx:236`; (`PentacamFilesPanel.tsx:241` عنده `noreferrer` ✔️). المتصفحات الحديثة تفترض `noopener`، لكن الـ WebView القديم (Win7/Electron قديم/Android WebView قديم) لا — ضيفها. `console.log("[Cache] Cleared N …")` في production.
- `components/ui/chart.tsx:88` `dangerouslySetInnerHTML` = قالب shadcn القياسي لـ CSS ثابت (آمن).
- الـ `window.open(\`/sheets/referral/${patient.id}\`)` وأخواتها: مسارات داخلية بمعرّف رقمي (آمنة).

## 🔵 Code

- **12.7** حراسة الصفحات في الواجهة (`ProtectedRoute`, `routes/*.tsx`) لازم تفضل **مرآة** للـ backend فقط. فحص آلي سريع: كل المسارات المستخدمة في `make*Procedure("/…")` (47 مسار مميز) موجودة في الـ client — ✔️ لا typos ظاهرة. لكن مفيش اختبار يضمن العكس (كل route محمية في الواجهة لها procedure محمية فعلاً) — وده بند "role-by-procedure matrix test" المفتوح في `docs/security.md`. اقتراح: سكريبت CI يستخرج (route → permission) من `routes/*.tsx` و(procedure → permission) من `server/routers` ويقارنهم.
- ملفات كبيرة: `App.tsx` (722)، `main.tsx` (570+)، `pages/Home.tsx`، `appointments-activity.redesigned.tsx` (>1000 سطر) — اسم الملف `*.redesigned.tsx` بيوحي بنسخة قديمة موازية؛ نظّف الملفات اللي مش مستخدمة (`pages/ComponentShowcase.tsx`, `PortalStyleguide.tsx`, `WorkflowPrototype*.tsx` — إن كانت مجمّعة في bundle الإنتاج).
- `AdminStatus.tsx:282` `window.localStorage.clear()` (يمسح كل شيء بما فيه إعدادات المستخدم) — مقبول كأداة صيانة، لكن مع 12.3 مفيش بديل "مسح الـ cache فقط".

## Electron / Capacitor
**اللي شفته سليم:**
- `desktop-electron/main.js:146-147`: `contextIsolation: true`, `sandbox: true`؛ `setWindowOpenHandler`, `will-navigate`, `setPermissionRequestHandler` (سطور 181/187/236) موجودة — إعدادات أمان معقولة.
- `capacitor.config.ts`: `allowNavigation` محدود (`selrs.cc`, `*.selrs.cc`, `192.168.1.100`).
**نقاط للمتابعة:**
- `192.168.1.100` (LAN) في `allowNavigation` بيعني http cleartext داخلي — تأكد من `network_security_config.xml` (غير متاح في المستودع) وإن Android `usesCleartextTraffic` محصور لهذا الـ IP فقط.
- التطبيق بيحمّل الموقع الحي (`server.url`) = أي XSS على selrs.cc يتنفذ داخل WebView بصلاحيات plugins (Push, Preferences…). ده يرفع أهمية 12.1/12.2 وCSP.
- `/updates/*` (خدمة ملفات installers) تتقدّم بدون توقيع/verify من الـ server؛ لو بتستخدموا `electron-updater` فهو بيتحقق من `latest.yml`+sha512 (لم أتأكد من الاستخدام) — تأكد إن التوقيع (code signing) مفعّل، وإن `/updates` مش بيعرض باقي `desktop-electron/` (تقرير Core 1.2).
