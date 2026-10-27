# تقرير مراجعة — موديول 1: Core / Auth / Security / Server bootstrap

**النطاق:** `server/_core/auth.ts`, `context.ts`, `cookies.ts`, `env.ts`, `trpc.ts`, `procedures.ts`, `systemRouter.ts`, `ws.ts` (جزئي), `index.ts` (middleware + routes الـ Express), `server/routers.ts`.
**الأدوات:** قراءة يدوية + grep. خط الأساس: `pnpm check` نظيف، `pnpm test` = 645/645 ناجح.
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 1.1 | 🔴 | Security | الـ rate limit على `doctorPortal.login` / `patientPortal.login` بيتخطّى بالـ tRPC batching |
| 1.2 | 🔴 | Security | `/updates` بيقدّم مجلد `desktop-electron/` كله (بما فيه `node_modules`, scripts, configs) بدون auth |
| 1.3 | 🟠 | Bug / Security | `ocr-link/run`: الـ `finally` بيفك قفل `srv100DbCycleBusy` حتى لو الطلب مرفوض (403/409) |
| 1.4 | 🟠 | Security | `GET /api/srv100/uploads` (القائمة) متاحة لأي مستخدم مسجّل بدون فحص دور + بترجّع `ocr_text` |
| 1.5 | 🟠 | Security | `canReadSrv100Upload` بيسمح لأي staff بقراءة أي ملف أي مريض |
| 1.6 | 🟠 | Security | `express.json({limit:"50mb"})` عام على كل الـ routes قبل الـ auth |
| 1.7 | 🟠 | Security | جلسات سنة كاملة افتراضياً (`rememberMe !== false`) + الـ token بيرجع في الـ JSON body |
| 1.8 | 🟠 | Bug | `auth.logout` (tRPC) بيعمل `bumpUserAuthVersion` = تسجيل خروج من كل الأجهزة، بينما `/api/auth/logout` الـ bump فيه كود ميت |
| 1.9 | 🟠 | Security | عدم تساوي منطق الـ write permission بين الـ factories (bare path = write في بعضها) |
| 1.10 | 🟠 | Security | `managerProcedure` / `receptionProcedure` بيدخّلوا `accountant` |
| 1.11 | 🟠 | Bug | `link-by-filename`: pagination بـ OFFSET على مجموعة بتصغر → صفوف بتتخطّى |
| 1.12 | 🟡 | Security | الـ stored XSS المحتمل: `inline` + `Content-Type` من DB في `/api/srv100/uploads/:id` |
| 1.13 | 🟡 | Security | `generateToken` (بدون jti/authVersion) بيعدّي revocation — مستخدم في الـ tests بس |
| 1.14 | 🟡 | Security | CSP فيه `script-src ... 'unsafe-inline' https:` |
| 1.15 | 🟡 | Security | رسائل `error.message` الخام بترجع في 500 responses |
| 1.16 | 🟡 | Security | مفيش `trust proxy` — rate limit والـ `req.secure`/HSTS ممكن يبوظوا ورا reverse proxy |
| 1.17 | 🟡 | Security | سياسة كلمة المرور ضعيفة (min 6) + `changeUsername` بدون re-auth |
| 1.18 | 🟡 | Security | `jwt.verify` من غير `algorithms` + تخزين patient token خام في DB |
| 1.19 | 🟡 | Bug | `applyMigrations`: بدون lock/transaction + بيبلع أكواد أخطاء |
| 1.20 | 🔵 | Code | `trpc.ts` و`procedures.ts` بيعملوا `initTRPC` مرتين + 14 factory مكررة |
| 1.21 | 🔵 | Query/Perf | كل procedure بيعمل 2–3 queries للـ permissions بدون cache |
| 1.22 | 🔵 | Code | CORS مكرر hardcoded مرتين + `cookies.ts` فيه كود معلّق |

---

## 🔴 High

### 1.1 تخطّي rate limit على login الدكتور/المريض
**الملف:** `server/_core/index.ts:2534-2541`
```ts
app.use("/api/trpc/doctorPortal.login", createApiRateLimiter(20, 15 * 60_000));
app.use("/api/trpc/patientPortal.login", createApiRateLimiter(20, 15 * 60_000));
```
Express بيطابق الـ prefix عند حد الـ segment (`/`) بس. tRPC batching بيبعت `/api/trpc/doctorPortal.login,doctorPortal.login,...?batch=1` — الحرف بعد الـ prefix هو `,` فالـ limiter **مش بيشتغل**. ولو اشتغل، batch فيه 50 محاولة بيتحسب طلب واحد.
**السيناريو:** brute-force على password الدكتور الخارجي / كود المريض بدون حد.
**ملاحظة مهمة (اكتُشفت لاحقاً في تقرير 10.1):** العدّاد الداخلي نفسه `consumeLoginRateLimit` (`db.ts:5137`) مش ذرّي (SELECT ثم UPSERT)، فالـ batch المتوازي بيرفع العدّاد بمقدار ≈ حجم الـ pool بدل عدد المحاولات — يعني حتى الـ throttle الموجود جوه الـ procedure بيتخطّاه الـ batching. لازم إصلاح الاتنين معاً.
**الإصلاح:** limiter على `"/api/trpc"` بفلترة بـ `req.path.includes("doctorPortal.login") || req.path.includes("patientPortal.login")`، وقيّد الـ batching: `maxBatchSize: 10` (أو `allowBatching: false`) في `createExpressMiddleware` — تحققت في `@trpc/server@11.19.0` إن الـ batch بيتنفذ بـ `Promise.all` (متوازي) وإن `maxBatchSize` غير محدد افتراضياً، وحط throttle جوه الـ procedure نفسه (per username/phone في DB زي `consumeLoginRateLimit`).

### 1.2 `/updates` بيقدّم مجلد الـ desktop كله
**الملف:** `server/_core/index.ts:2409-2428`
`express.static(path.resolve(cwd,"desktop-electron"))` — المجلد فيه `node_modules`, `main.js`, `*.ps1`, `deploy-exe.cmd`, `builder-effective-config.yaml`, `builder-debug.yml`, `dist/`, `package-lock.json` وكلها tracked في git. أي حد من الإنترنت يقرأ هيكل البناء والمسارات والـ installers القديمة.
(فحصت الملفات دي بحثاً عن secrets بـ grep ومفيش password/token واضح، لكن لازم تتراجع يدوياً.)
**الإصلاح:** مجلد `updates/` مخصّص فيه `latest.yml` + الـ installer الحالي + `.blockmap` فقط، أو `express.static(..., { index:false, dotfiles:"deny" })` مع whitelist للأسماء.

---

## 🟠 Medium

### 1.3 قفل `srv100DbCycleBusy` بيتفك غلط
**الملف:** `server/_core/index.ts:1929-2077`
الـ `finally { srv100DbCycleBusy = false }` بينفذ على **كل** المسارات، فـ:
- طلب من غير admin → `403` → الـ `finally` يفك القفل وبالتالي لو الـ worker شغال، المستخدم (حتى anonymous) بيكسر الـ mutual exclusion.
- طلب تاني وهو `busy` → `409` → نفس الشيء.
**الإصلاح:** `let acquired=false` وبعد ما تاخد القفل `acquired=true`، و`finally { if (acquired) srv100DbCycleBusy=false }`.

### 1.4 قائمة uploads بدون فحص دور
**الملف:** `index.ts:1710-1825` — `authenticateRequest` فقط. بترجّع `patient_name`, `patient_code`, `ocrIdCandidates` وبتدعم LIKE على `ocr_text`/`plain_text`. أي حساب (worker, supervisor…) يقدر يعمل enumeration لكل الوثائق الطبية.
**الإصلاح:** استعمل `clinicalStaffProcedure`-equivalent (أدوار + `/patients` permission).

### 1.5 `canReadSrv100Upload` متساهل
**الملف:** `index.ts:998-1005` — `if (await authenticateRequest(req)) return true;` ومفيش فحص branch ولا دور. عكس التعليق فوقها ("allow staff, the owning patient, or assigned doctor"). نفس النقطة للـ `/api/pentacam/exports/file/*`.

### 1.6 جسم الطلب 50MB قبل الـ auth
**الملف:** `index.ts:1571-1572` — على كل الـ routes بما فيها `/api/auth/login`. طلب 50MB JSON بيتحلّل في الذاكرة قبل أي فحص. **الإصلاح:** limit افتراضي `1mb`، و50mb فقط على routes الرفع المعروفة (أو multipart/stream).

### 1.7 عمر الجلسة وتسريب الـ token
**الملف:** `server/_core/auth.ts:312,347-348` — `rememberMe !== false` يعني الافتراضي سنة، والـ JWT نفسه بيرجع في body (`token`) بالإضافة للـ HttpOnly cookie، فالـ HttpOnly بيفقد فايدته لو الـ client خزّنه في localStorage. نظام طبي → اجعل الافتراضي 24h/7d، واشطب `token` من الـ response لو الـ web client ما بيستخدمهوش (Capacitor/desktop بس).
كمان بيكتب cookie مرتين (`authToken` legacy) — شيل الـ legacy بعد فترة انتقالية.

### 1.8 `logout` غير متسق
- `server/routers.ts:179-181`: `ctx.user` اتحسب قبل الـ revoke فبيتنفذ `bumpUserAuthVersion` ⇒ **كل أجهزة المستخدم بتتفصل**.
- `server/_core/auth.ts:370-372`: بعد `revokeSessionFromRequest` الـ `authenticateRequest` بيرجع null، فالـ bump كود ميت.
قرّر السلوك المطلوب وطبّقه في الاتنين (الأفضل: revoke للـ jti الحالي فقط).

### 1.9 تناقض write-permission بين الـ factories
في `procedures.ts`:
- `makePageWriteProcedure` (303) و`accountingWriteProcedure` (205) و`kfWriteProcedure` (700) و`attendanceManagerProcedure` (872): **لازم `:rw` صريح**.
- `makeKfWriteProcedure` (355), `makeAccWriteProcedure` (422), `makeAttWriteProcedure` (486), `makeStockroomWriteProcedure` (550), `makeSalaryWriteProcedure` (620): `if (raw.endsWith(":r") && !raw.endsWith(":rw")) return false; clean = raw.replace(/:rw$/,"")` ⇒ **permission بدون suffix (مثل `/salary`) = كتابة**.
لو في مستخدمين عندهم paths عارية في `user_permissions` أو في role defaults، فالـ read-only الظاهر في الـ UI بيبقى write فعلي في الـ API. راجع `getRoleDefaultPermissions` و`normalizePermissionList` (db.ts ~6287) وحدّد: هل bare = read؟ ثم وحّد في دالة واحدة `hasWrite(permissions, path)`.

### 1.10 الأدوار الواسعة
`managerProcedure` (140) رسالته "Only managers" لكنها بتسمح بـ `accountant`؛ `receptionProcedure` (112) بتسمح بـ `accountant`. 37 استخدام لـ `managerProcedure` في routers الطبية (أمثلة: medical-ops, medical-mssql, medical-pentacam). لو ده مقصود، غيّر الاسم/التعليق؛ لو لأ، `accountant` بيوصل لعمليات مدير طبية (مثل MSSQL sync/reset).

### 1.11 باج الـ pagination في `link-by-filename`
**الملف:** `index.ts:2091-2128`
```sql
WHERE patient_id IS NULL ORDER BY id ASC LIMIT ? OFFSET ?   -- offset += rows.length
```
وكل ما ربطت صف، بيطلع من الشرط `patient_id IS NULL` فالـ OFFSET التالي بيقفز على صفوف لسه مش مربوطة. **الإصلاح:** keyset: `WHERE patient_id IS NULL AND id > ? ORDER BY id LIMIT ?` وخزّن آخر id.
بالمثل `fix-duplicates` (2147-2159): self-join على `file_name` غير مفهرس (O(n²) محتمل) ونتيجته غير حتمية لو الاسم موجود مع أكتر من patient.

---

## 🟡 Low

- **1.12** `index.ts:1907-1920`: `Content-Type` من عمود `mime_type` + `inline`. لو اترفع `text/html` يتنفذ في origin التطبيق (والـ CSP بيسمح inline). حدّد whitelist (`image/*`, `application/pdf`) وإلا `attachment` + `application/octet-stream`.
- **1.13** `auth.ts:110` `generateToken` بدون `jti`/`authVersion` ⇒ `verifySession` بيعدّيه بدون فحص revocation. استخدامه الوحيد في `server/auth.test.ts`. احذفه أو خلّيه يلف `createSessionToken`.
- **1.14** `index.ts:1586`: `script-src 'self' 'unsafe-inline' https:` يلغي معظم حماية CSP. استخدم nonce/hash أو اقتصر على `'self'`.
- **1.15** `index.ts:1821,2073,2133,2169,2247`: `String(error?.message)` في الـ response. (docs/security.md قال إن raw DB errors اتشالت — ده تسريب متبقي.)
- **1.16** مفيش `app.set("trust proxy", …)`: لو التطبيق ورا nginx/cloudflared، `req.ip` = IP الـ proxy ⇒ `loginIpRateLimiter` (20/15د) مشترك بين كل المستخدمين = **أي حد يقفل login للكل**، وكمان `req.secure` false فالـ HSTS (`index.ts:1598`) مش بيتبعت أبداً. اتحقق من طريقة النشر وحدّد قيمة `trust proxy` الصح.
- **1.17** `routers.ts:117-121`: `newPassword.min(6)` بدون max/تعقيد (bcrypt بيقطع عند 72 byte). `changeUsername` من غير كلمة المرور الحالية. بعد `changePassword` الـ `bumpUserAuthVersion` بيبطّل الجلسة الحالية كمان (لازم client re-login — اتأكد إن ده المقصود).
- **1.18** `jwt.verify(token, secret)` في `auth.ts:181`, `context.ts:44,80`, `index.ts:~1010`: حدّد `{ algorithms:["HS256"] }`. جدول `patient_portal_sessions` بيخزّن الـ JWT كامل في عمود `token` — خزّن hash أو jti.
  كمان `Login` مفيهوش bcrypt dummy-compare لما المستخدم مش موجود (timing → user enumeration).
- **1.19** `systemRouter.ts:178-242` `applyMigrations`: مفيش lock (mutex/`GET_LOCK`) ⇒ استدعاءان متزامنان يعملوا apply مرتين؛ فشل في نص الملف يسيب الملف نصف مطبّق وغير مسجّل، وأكواد `ER_DUP_FIELDNAME` إلخ بتتبلع. admin-only فالخطورة محدودة.
- **FB OAuth callback** (`index.ts:2431-2530`): الـ `state` عام (صف واحد في `marketingSettings`) ومقارنته بـ `!==` (استعمل `crypto.timingSafeEqual`)، ومش مربوط بمستخدم/جلسة معيّنة (callback غير مصادَق عليه). *(تصحيح: أعمدة التوكن `fbAccessToken`/`fbPendingPages` من نوع `encryptedText` = AES-256-GCM في `drizzle/encryptedText.ts`، فالتخزين مشفّر. الملاحظة الوحيدة: المفتاح بيرجع لـ `JWT_SECRET` لو `SECRETS_ENCRYPTION_KEY` مش متحدد، فتدوير JWT_SECRET يفقد التوكنات وتسريبه يفكّها — حدد `SECRETS_ENCRYPTION_KEY` منفصل.)*
- **`Access-Control-Allow-Origin`** بيتحدد من قائمة hardcoded في `index.ts:1609-1620` منفصلة عن `getAllowedCorsOrigins()` (153) — `CORS_ALLOWED_ORIGINS` env مش بيتطبّق على الـ header، بس على فحص الـ Origin.

---

## 🔵 Code / Queries

- **1.20** `server/_core/trpc.ts` و`procedures.ts` كل واحد فيه `initTRPC...create()` (instance مختلف) وبيكرّر `publicProcedure/protectedProcedure/adminProcedure`. `medical-assistant.ts` بيستورد من `trpc.ts` والباقي من `procedures.ts`. وحّد على ملف واحد.
- 14 factory متطابقة تقريباً (Kf/Acc/Att/Stockroom/Salary/Page × read/write). اعمل `makeScopedProcedure({ bypassRoles, paths, level })` — ده كمان بيحل 1.9.
- **1.21** كل `makeXProcedure` بيستدعي `db.getEffectiveUserPermissions` ⇒ `getUserPermissionState` + `getRoleDefaultPermissions` (2+ queries) على **كل** call، وصفحة واحدة بتطلق 10–30 طلب. حط cache قصير (30–60ث) في الذاكرة مفتاحه `userId:authVersion` مع invalidate في `setUserPermissions`.
- `createContext` (`context.ts`) بيعمل query لـ `patient_portal_sessions` و`externalDoctors` فقط لو الـ header موجود — تمام. لكن `authenticateRequest` بيعمل `isAuthSessionActive` + `getUserById` على كل request (2 queries) — cache قصير مناسب.
- `cookies.ts`: 15 سطر كود معلّق + `LOCAL_HOSTS`/`isIpAddress` غير مستخدمين، و`sameSite:"none"` هناك مقابل `"lax"` في `auth.ts` — مصدر لخلط عند الـ logout.
- `auth.ts:46`: مفتاح الـ rate limit بيتضمن username مدخل من المستخدم بدون حد طول — صف في DB لكل قيمة (`consumeLoginRateLimit`). حدّد `slice(0,64)`.
- `systemRouter.health` public وبياخد `timestamp` غير مستخدم.

---

## WebSocket (`server/_core/ws.ts`) — قراءة كاملة

- 🟠 **1.23 توكن الدكتور في الـ query string + بدون فحص `authVersion/isActive`:** `ws.ts:~193-205` يقبل `?doctorToken=<JWT>` ويكتفي بـ `jwt.verify` (`verifyDoctorToken`، سطر 55-64) — **ما بيفحصش** `authVersion`/`isActive` عكس الـ HTTP context (`context.ts:86-103`)، و`revalidateStaffSockets` بيراجع الموظفين فقط. دكتور اتعطّل/اتغيّرت كلمة سره يفضل يستقبل `broadcastToDoctorPortal` (إشعارات إحالة مرضى — `medical-patient.ts:80`) لحد ما التوكن (30 يوم) ينتهي. والتوكن في الـ URL بيتسجّل في access logs/proxies. **الإصلاح:** رسالة `auth` أولى بعد الاتصال أو `Sec-WebSocket-Protocol`، + نفس فحص الـ DB، + إدخال sockets الدكاترة في `revalidate`.
- 🟡 **1.24 حدود الرسائل:** `new WebSocketServer({ noServer: true })` بدون `maxPayload` (الافتراضي **100 MiB**) ولا rate-limit للرسائل ولا heartbeat/`ping` لإسقاط الاتصالات الميتة. `patient-create-presence` من أي موظف بيعمل `broadcastPatientCreatePresence()` = O(عدد الاتصالات) لكل رسالة (تضخيم)، و`subscriptions` Set غير محدود الحجم. اضبط `maxPayload: 16*1024`، حد للـ subscriptions (مثلاً 200)، وthrottle.
- 🟡 **1.25 `broadcastBookingUpdate()`** (سطر ~361) بيبعت لكل client مفتوح (حتى sockets الأطباء الخارجيين أو sockets لسه مش مكتمل توثيقها بين `await verifySession` والـ handlers)؛ المحتوى فارغ (`{type:"booking-update"}`) فمفيش تسريب، لكن فلتره بـ `staffUserId`.
- 🟡 **1.26 إشعارات بدون `targetRoles`:** `resolveNotificationTargetRolesByUserRole` (`patient-helpers.ts:75-85`) بترجّع `null` لـ reception/accountant ⇒ `isStaffRecipient` بيعتبر `null` = **كل الموظفين** (`ws.ts:~100-113`): إشعار "مريض جديد — {الاسم}" يوصل لأي دور (حتى `worker`)، ويتخزّن في `app_notifications_feed_v1` (مقروء لأي مستخدم عبر `getSystemSetting` — تقرير 5.4). حدد قائمة أدوار صريحة.
- ✅ سليم: فحص Origin على الـ upgrade، المصادقة بالـ cookie + `verifySession` + `loadActiveStaffUser` (isActive/authVersion)، إعادة التحقق من الجلسات كل 60 ثانية، `canSubscribeToPatients/Attendance` بتعكس صلاحيات الـ HTTP، و`subscribe-denied`.

## ما اتأكدت إنه سليم
- كل SQL في `index.ts` parameterized (`?`).
- `/healthz/diagnostics` admin-only، `/healthz` liveness فقط.
- Origin-check على الـ unsafe methods لـ `/api/*`.
- فحص `isUnsafePentacamName` + regex للـ patient key قبل قراءة S3.
- أسرار الـ env بتتقرأ من env فقط، و`JWT_SECRET ≥ 32`.
