# تقرير مراجعة — موديول 7: Marketing / AI / Auto-Reply / WhatsApp / Webhooks

**النطاق:** `server/routers/marketing.ts` (1330)، `aiManagement.ts`، `autoReply.ts` (742)، `whatsappInbox.ts`، `whatsappConfirmations.ts`، `server/_core/{whatsappWebhook,autoReplyWebhook,llm,imageGeneration,voiceTranscription,notification,map,dataApi}.ts`، `server/services/{marketing,ai,auto-reply}/*` (~6000 سطر)، `services/whatsapp*.ts`.
**العمق (بصراحة):** قراءة كاملة لـ: الـ 2 webhooks، `publish.service.ts` (أول 140 سطر)، `policy.ts`، `uploadReferenceDesign`، `medical-assistant.ts` + `medicalGemini.ts`، `encryptedText.ts`، `whatsappReply/InboundAutoReply`. الباقي (`worker.ts`, `providers.ts`, `store.ts`, `coexistence*.ts`, `marketingDraft.ts`, `contentGenerator`, `scheduler`) **اتفحص بـ grep للأنماط الخطرة فقط** (fetch/fs/exec/tokens/logging) — مش مراجعة سطر بسطر.
**الانطباع العام:** ده أنضج جزء في الكود: HMAC + `timingSafeEqual` + idempotency + `FOR UPDATE` + kill-switch للـ AI الطبي + تشفير AES-256-GCM للتوكنات. الملاحظات تحت أغلبها تحسينات.
**التصنيف:** 🔴 High · 🟠 Medium · 🟡 Low · 🔵 Code quality

---

## ملخص

| # | الخطورة | النوع | العنوان |
|---|---|---|---|
| 7.1 | 🟠 | Abuse / Cost | `medicalAssistant.speechToken` بدون rate-limit لأي medical staff (مفتاح Azure مدفوع) |
| 7.2 | 🟠 | Privacy | مسار AI الطبي الافتراضي (Manus) ما عليهوش بوابة الموافقة اللي على Gemini؛ وصوت/نص المريض بيخرج لـ Azure/Manus |
| 7.3 | 🟠 | Abuse | الرد الآلي على **كل** رسالة واتساب واردة بدون cooldown لكل مرسل |
| 7.4 | 🟡 | Security | `voiceTranscription.ts` فيه `fetch(options.audioUrl)` (SSRF primitive) — كود غير مستخدم |
| 7.5 | 🟡 | Reliability | `fetch` بدون timeout في واتساب/Graph/LLM (عدا Gemini/Azure) |
| 7.6 | 🟡 | Security | Graph API: `access_token`/`client_secret` في query string (GET) |
| 7.7 | 🟡 | Defense | الـ safety classifier للرد الآلي regex فقط (عربي/إنجليزي محدود) |
| 7.8 | 🟡 | Config | عشرات `process.env.*` بتتقرأ مباشرة خارج `env.ts` (بدون validation) |
| 7.9 | 🟡 | Privacy | `rawPayload: JSON.stringify(msg)` لكل رسالة واتساب بدون retention |
| 7.10 | 🔵 | Code | webhooks مكررة (`/webhook/whatsapp` و`/webhook/auto-reply/meta`) كلاهما بيستدعي `ingestConfirmationReceipts` |

---

## 🟠 Medium

### 7.1 `speechToken` بلا حد
`medical-assistant.ts:63` `speechToken: medicalStaffProcedure.mutation(() => medicalSpeechToken())` → `speech.ts` بيستدعي Azure `issueToken` بمفتاح الاشتراك ويرجّع token (صلاحيته 10 دقايق) لأي medical staff، **من غير أي throttle**. حساب مخترَق أو سكريبت = استهلاك حصة/فاتورة Speech. (كمان token بيتسلّم للمتصفح ويتبعت له الصوت مباشرة — الصوت بيخرج من الجهاز لـ Azure؛ راجع 7.2.)
**الإصلاح:** rate-limit لكل مستخدم (مثلاً 6/ساعة) + cache للـ token 8 دقايق لكل مستخدم + audit.

### 7.2 PHI خارج النظام
- الـ Gemini عليه بوابتين (`MEDICAL_GEMINI_CLINICAL_APPROVED` + `GEMINI_API_KEY`) وموثّق ("لم يُفعّل") — ممتاز.
- **لكن الافتراضي (`defaultProvider: "manus"`)** و`startMedicalProposals` بيرسل نص إملاء الدكتور (شكوى/تشخيص) لـ Manus بدون بوابة مماثلة (`medical.ts:76-79` فقط يعمل assert لـ Gemini). والتوثيق نفسه بيقول "لا تعني الإضافة اعتماد Manus طبياً أو امتثالاً قانونياً".
- Azure Speech: الصوت الخام بيروح لـ Azure من المتصفح.
**الإصلاح:** نفس نمط الـ kill-switch لـ Manus وAzure (`MEDICAL_MANUS_CLINICAL_APPROVED`, `MEDICAL_AZURE_SPEECH_APPROVED`) + خريطة "من أين تخرج بيانات المريض" في `docs/data-policy.md` (الـ AI، واتساب، FCM، الإيميل، Pentacam OCR…). قرار قانوني/إداري أكتر منه كودي.

### 7.3 رد آلي بلا cooldown
`whatsappWebhook.ts:231-266`: لكل رسالة واردة جديدة (`newMessages`) بيتبعت رد ثابت ("هذه رسالة آلية…") — مفيش حد لعدد الردود لنفس الرقم في الساعة. مريض بيكتب 10 رسايل = 10 ردود؛ ولو الطرف التاني chatbot/auto-responder (شركات، أرقام خدمة) = حلقة ردود متبادلة مكلّفة. الـ `messages` الواردة بتشمل أيضاً رسائل `reaction`/`sticker`/`image`... كلها بتولّد رد.
**الإصلاح:** cooldown (مثلاً رد واحد كل 6 ساعات لكل رقم) + تجاهل الأنواع غير النصية + تجاهل رسائل الـ status.

---

## 🟡 Low

- **7.4** `voiceTranscription.ts:102`: `fetch(options.audioUrl)` بلا فحص (يقبل `http://169.254.169.254/…`, `file:`-like لا لكن شبكة داخلية نعم). `grep transcribeAudio|voiceTranscription` خارج الملف = لا استخدام ⇒ كود قالب (Manus/Forge) ميت. **احذفه** (أو حط allow-list) بدل ما يتحوّل لثغرة بعد ما حد يربطه بـ API.
- **7.5** `whatsappReply.service.ts:49`, `facebookPublisher`, `facebookOAuth`, `providers.ts`, `llm.ts:320`, `imageGeneration.ts:53`: `fetch` بدون `AbortSignal.timeout` (Gemini/Azure الوحيدين اللي عندهم). Meta/LLM لو علّق، الـ webhook/worker يتعلّق وبالـ `server.setTimeout(600_000)` تتراكم الاتصالات.
- **7.6** `facebookOAuth.service.ts:55-190`: `client_secret` و`access_token` في الـ URL (GET). HTTPS تمام، لكن بيظهر في أي log لـ `fetch` error/proxy؛ استخدم `Authorization: Bearer` أو POST body. (التخزين نفسه مشفّر AES-256-GCM — `drizzle/encryptedText.ts` — جيد؛ المفتاح بيرجع لـ `JWT_SECRET` لو `SECRETS_ENCRYPTION_KEY` مش محدد.)
- **7.7** `policy.ts:75-100` `safetyDecision`: regex للـ clinical/human/prompt-injection. فعّال كطبقة أولى لكنه يفوّت: لهجات/كتابة عربية مختلفة ("عينى بتوجعنى"=بيلتقط "وجع" فقط)، لغات أخرى، تحويل حروف (`i.g.n.o.r.e`)، وuntrusted instruction بصيغ متنوعة. طبّق: (أ) منع المخرجات (output filtering: لا أسعار/جرعات/تشخيص خارج knowledge base)، (ب) سجّل كل رد AI فعلياً (يبدو موجود في `store.ts`)، (ج) وضع "اعتماد بشري" لأول N ردود. (لم أراجع `worker.ts` لأرى هل يوجد approval mode.)
- **7.8** `process.env` مباشرة: `AZURE_SPEECH_*`, `AUTO_REPLY_META_APP_SECRET`, `AUTO_REPLY_VERIFY_TOKEN`, `CORS_ALLOWED_ORIGINS`, `ZK_ADMS_*`, `SRV100_*`, `MEDICAL_GEMINI_*`, `FB_APP_ORIGIN`, `ANDROID_APK_DIR`, … كلها خارج `envSchema` في `_core/env.ts`. نتيجة: غلطة إملائية في `.env` تفضل صامتة، ومفيش فحص إقلاع للإعدادات الإلزامية في الإنتاج (حالياً فقط `DATABASE_URL`). وسّع الـ schema وفشّل الإقلاع في production لو ناقص `WHATSAPP_APP_SECRET`/`AUTO_REPLY_META_APP_SECRET`/`ZK_ADMS_DEVICE_ALLOWLIST` (لو الميزة مفعّلة).
- **7.9** `whatsappInboundMessages.rawPayload` = JSON كامل للرسالة (رقم + نص + ميديا IDs) بدون retention/purge. حدّد مدة.
- فحص `X-Hub-Signature-256` على `express.json({ limit: "5mb" })` بيحصل **بعد** parse الـ JSON (في `/webhook/whatsapp`)؛ التوقيع على الـ raw buffer نفسه سليم، لكن الـ parse لجسم غير موقّع (5MB) قبل الفحص — الأفضل `express.raw` زي مسار auto-reply.

## 🔵 Code

- **7.10** مساران webhooks (`whatsappWebhook.ts` للـ WhatsApp Cloud + `autoReplyWebhook.ts` للـ Meta page/WABA) كلاهما `ingestConfirmationReceipts(body)`؛ لو الـ WABA مشتركة في الاتنين الإيصالات هتتعالج مرتين (اتأكد إنها idempotent — لم أفتح `whatsappConfirmations.ts`).
- `marketing.ts` 1330 سطر = 42 `adminProcedure`: لا فرق بين قراءة/كتابة/نشر. فكّر في `marketingProcedure` بصلاحية صفحة (زي باقي النظام) لو هيشتغل عليه موظف تسويق غير admin.
- تكرار `GRAPH_API` وبناء URL في 3 ملفات (`facebookOAuth/Publisher`, `coexistence.ts`, `providers.ts`) ⇒ client واحد مع timeout/retry/redaction.
- `imageGenerator.service.ts:57` `fetch(url)` لـ URL راجع من مزوّد صور (fal) — تأكد إنه host موثوق قبل التحميل (SSRF من نتيجة مزوّد خارجي، منخفض الاحتمال).

## ما اتأكدت إنه سليم
- **Webhooks:** HMAC-SHA256 على الـ raw body + `timingSafeEqual` + فحص صيغة التوقيع بـ regex قبلها، رفض لو السر غير مهيّأ (503)، rate-limit (600/دقيقة)، idempotency بـ unique على `waMessageId` داخل transaction، 503 عند فشل التخزين ليعيد Meta المحاولة، وفلترة `phone_number_id`، وتحقق من `hub.challenge` بـ regex.
- **النشر على Facebook:** `SELECT … FOR UPDATE` + حالة `publishing` + `uncertain` لمنع النشر المزدوج بعد فشل غير محسوم + حجز موضوع (`topicHistory`).
- **التوكنات:** `encryptedText` (AES-256-GCM, HKDF, IV عشوائي, GCM tag) على `fbAccessToken`, `fbPendingPages`, page `accessToken`؛ ملف credentials الـ coexistence بـ `mode: 0o600` + `flag: "wx"`.
- **AI الطبي:** kill-switch، schema صارم للمخرجات (`additionalProperties:false`, `maxItems:8`, enum للحقول)، `validateMedicalProposals` (اقتباس حرفي من المصدر)، لا حفظ تلقائي، مفاتيح الـ API في header (`x-goog-api-key`) مش في الـ URL، `AbortSignal.timeout`.
- **`uploadReferenceDesign`:** اسم ملف مولَّد (`Date.now()+nanoid`)، MIME whitelist، حد حجم (14M base64 + `MAX_REFERENCE_IMAGE_BYTES`)، rollback للملف عند فشل DB.
- كل routers هذا الموديول `adminProcedure` (أو page-gated لـ `whatsappInbox`) — لا يوجد public.
