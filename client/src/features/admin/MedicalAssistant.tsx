import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FieldDictation from "@/components/medical-assistant/FieldDictation";
import ProposalReview from "@/components/medical-assistant/ProposalReview";
import type { MedicalTranscript } from "@shared/medical-assistant";
import AssistantModelSelect from "@/features/ai/AssistantModelSelect";
import { medicalModelOptions } from "@/features/ai/medical-models";
import { trpc } from "@/lib/trpc";

export default function MedicalAssistant() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const settings = trpc.medicalAssistant.settings.useQuery(undefined, {
    retry: false,
  });
  const saveSettings = trpc.medicalAssistant.saveSettings.useMutation();
  const [savedMessage, setSavedMessage] = useState("");
  const [model, setModel] = useState("manus:standard");
  const options = trpc.medicalAssistant.providerOptions.useQuery(undefined, {
    retry: false,
  });
  const [mode, setMode] = useState<"conversation" | "dictation">("dictation");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [speechProvider, setSpeechProvider] = useState<"azure" | "gemini">(
    "azure",
  );
  const [recordingMinutes, setRecordingMinutes] = useState(8);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  useEffect(() => {
    if (!settings.data) return;
    setSpeechProvider(settings.data.speechProvider);
    setRecordingMinutes(settings.data.maxRecordingMinutes);
    setShowDiagnostics(settings.data.showDiagnostics);
    setModel(settings.data.processingModel);
    setConsent(false);
  }, [settings.data]);
  const settingsDirty = Boolean(
    settings.data &&
    (settings.data.speechProvider !== speechProvider ||
      settings.data.maxRecordingMinutes !== recordingMinutes ||
      settings.data.showDiagnostics !== showDiagnostics ||
      settings.data.processingModel !== model),
  );
  const [consent, setConsent] = useState(false);
  const speechOptions = trpc.medicalAssistant.speechOptions.useQuery(
    undefined,
    { retry: false },
  );
  const speechReady =
    speechProvider === "gemini"
      ? Boolean(
          speechOptions.data?.gemini.configured &&
          speechOptions.data.gemini.clinicalEnabled,
        )
      : Boolean(speechOptions.data?.azure.configured);
  const [review, setReview] = useState<MedicalTranscript>();
  return (
    <section
      dir="rtl"
      aria-label="المساعد الطبي"
      className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6"
    >
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">المساعد الطبي</h1>
        <p className="text-sm text-muted-foreground">
          سجّل الإملاء أو أدخل نصًا، ثم راجع الاقتراحات وانسخ ما اعتمدته. لا
          تُحفظ بيانات في ملف مريض من هذه الصفحة.
        </p>
        <Link
          href="/ai/settings"
          className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
        >
          إعدادات الذكاء الاصطناعي وحدود الاستخدام
        </Link>
      </header>
      <section
        aria-labelledby="medical-processing-settings"
        className="space-y-3 rounded-xl border bg-card p-4 sm:p-5"
      >
        <h2 id="medical-processing-settings" className="text-lg font-semibold">
          معالجة النص بعد التسجيل
        </h2>
        <p className="text-sm text-muted-foreground">
          هذا الاختيار لتنظيم النص واستخراج الاقتراحات، ولا يغيّر مزوّد
          الميكروفون.
        </p>
        <AssistantModelSelect
          value={model}
          onChange={setModel}
          disabled={
            !isAdmin ||
            settings.isPending ||
            saveSettings.isPending ||
            Boolean(review) ||
            recording
          }
          options={medicalModelOptions(options.data)}
        />
        {options.data?.managementEnabled && (
          <p className="text-sm text-muted-foreground">
            إعداد المعالجة المركزي: {options.data.central?.provider} /{" "}
            {options.data.central?.model}. حفظ الاختيار هنا يحدّثه لكل
            المستخدمين مع الحفاظ على حدود الاستهلاك.
          </p>
        )}
        {options.data && !options.data.gemini.clinicalEnabled && (
          <p className="text-sm text-muted-foreground">
            Gemini الطبي يحتاج تفعيل إعداد الموافقة السريرية على الخادم قبل
            استخدامه.
          </p>
        )}
      </section>
      <section
        aria-labelledby="medical-speech-settings"
        className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
      >
        <h2 id="medical-speech-settings" className="text-lg font-semibold">
          إعدادات الصوت والتسجيل
        </h2>
        <label className="block space-y-2">
          <span>مزوّد تحويل الصوت إلى نص</span>
          <select
            aria-label="مزوّد تحويل الصوت إلى نص"
            className="block min-h-11 w-full rounded-md border bg-background px-3"
            value={speechProvider}
            disabled={
              !isAdmin ||
              settings.isPending ||
              saveSettings.isPending ||
              recording ||
              Boolean(review)
            }
            onChange={(event) => {
              setSpeechProvider(
                event.target.value === "gemini" ? "gemini" : "azure",
              );
              setConsent(false);
            }}
          >
            <option value="azure">Azure — العربية المصرية</option>
            <option value="gemini">
              Gemini 3.5 Transcribe Live — عربي وإنجليزي
            </option>
          </select>
        </label>
        <p role="status" className="text-sm text-muted-foreground">
          {speechOptions.isPending
            ? "جارٍ فحص إعدادات الصوت…"
            : speechOptions.isError
              ? "تعذّر قراءة إعدادات الصوت."
              : speechReady
                ? "إعداد المزوّد موجود. الوصول الفعلي والرصيد يُتحقق منهما عند الاتصال."
                : speechProvider === "gemini"
                  ? "Gemini يحتاج مفتاح API وتفعيل موافقة الاستخدام الطبي على السيرفر."
                  : "Azure يحتاج مفتاح Speech ومنطقة الخدمة على السيرفر."}
        </p>
        {speechOptions.isError && (
          <Button
            variant="outline"
            onClick={() => void speechOptions.refetch()}
          >
            إعادة فحص إعدادات الصوت
          </Button>
        )}
        <label className="block space-y-2">
          <span>الحد الأقصى لمدة التسجيل</span>
          <select
            aria-label="الحد الأقصى لمدة التسجيل"
            value={recordingMinutes}
            disabled={
              !isAdmin ||
              settings.isPending ||
              saveSettings.isPending ||
              recording ||
              Boolean(review)
            }
            className="block min-h-11 w-full rounded-md border bg-background px-3"
            onChange={(event) =>
              setRecordingMinutes(Number(event.target.value))
            }
          >
            {[1, 3, 5, 8].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} دقائق
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={showDiagnostics}
            disabled={
              !isAdmin ||
              settings.isPending ||
              saveSettings.isPending ||
              recording
            }
            onChange={(event) => setShowDiagnostics(event.target.checked)}
          />
          إظهار معلومات الاتصال والتسجيل
        </label>
        <p className="text-sm text-muted-foreground">
          {speechProvider === "gemini"
            ? "تفريغ حرفي مع اكتشاف اللغة تلقائيًا وقاموس أسماء من قاعدة البيانات. لا يضمن تحويل كل مصطلح إلى الإنجليزية."
            : "التعرّف مضبوط على العربية المصرية (ar-EG)."}{" "}
          لا يحدث تبديل تلقائي إلى مزوّد آخر عند فشل الاتصال.
        </p>
        <label className="flex min-h-11 items-start gap-2">
          <input
            type="checkbox"
            checked={consent}
            disabled={recording}
            onChange={(event) => setConsent(event.target.checked)}
          />
          حصلت على موافقة صاحب الصوت على التسجيل وإرساله إلى{" "}
          {speechProvider === "gemini" ? "Google Gemini" : "Microsoft Azure"}.
          قد تُحتسب تكلفة استخدام.
        </label>
        <p className="text-sm text-muted-foreground">
          مفاتيح API وموافقة الخصوصية وحدود الاستخدام العامة تُدار على السيرفر
          ومن صفحة إعدادات الذكاء الاصطناعي. لا تُحفظ بيانات مريض تلقائيًا.
        </p>
        <p className="text-sm">
          الإعداد موحّد لكل المستخدمين، ويُطبّق على التسجيلات الجديدة في جميع
          الخانات وملف المريض والـWorkflow. الأدمن فقط يمكنه تغييره.
        </p>
        {settings.isError && (
          <p role="alert">
            تعذّر تحميل الإعداد المحفوظ.{" "}
            <button onClick={() => void settings.refetch()}>
              إعادة المحاولة
            </button>
          </p>
        )}
        {isAdmin && (
          <Button
            disabled={
              !settings.data ||
              !settingsDirty ||
              recording ||
              saveSettings.isPending
            }
            onClick={async () => {
              setSavedMessage("");
              try {
                await saveSettings.mutateAsync({
                  speechProvider,
                  maxRecordingMinutes: recordingMinutes,
                  showDiagnostics,
                  processingModel: model,
                });
                await Promise.all([
                  settings.refetch(),
                  utils.medicalAssistant.providerOptions.invalidate(),
                  utils.aiManagement.profiles.invalidate(),
                ]);
                setSavedMessage(
                  "تم حفظ الإعداد المركزي لكل المستخدمين. التسجيلات الشغّالة لم تتغيّر.",
                );
              } catch {
                setSavedMessage("");
              }
            }}
          >
            {saveSettings.isPending
              ? "جارٍ الحفظ…"
              : "حفظ الإعدادات لكل المستخدمين"}
          </Button>
        )}
        {settingsDirty && (
          <p role="status">
            تغييرات غير محفوظة. احفظها أولًا قبل بدء التسجيل أو المعالجة.
          </p>
        )}
        {savedMessage && <p role="status">{savedMessage}</p>}
        {saveSettings.error && <p role="alert">{saveSettings.error.message}</p>}
      </section>
      <section
        className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
        aria-labelledby="medical-assistant-input-title"
      >
        <h2
          id="medical-assistant-input-title"
          className="text-lg font-semibold"
        >
          النص المراد مراجعته
        </h2>
        <label className="block space-y-2">
          <span>نوع التسجيل</span>
          <select
            aria-label="نوع التسجيل"
            className="block min-h-11 w-full rounded-md border bg-background px-3"
            value={mode}
            disabled={Boolean(review) || recording}
            onChange={(event) => setMode(event.target.value as typeof mode)}
          >
            <option value="dictation">إملاء الطبيب</option>
            <option value="conversation">حوار الطبيب والمريض</option>
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={
            Boolean(review) ||
            recording ||
            !consent ||
            !speechReady ||
            !settings.data ||
            settingsDirty
          }
          onClick={() => {
            if (consent && speechReady) setRecording(true);
          }}
        >
          تسجيل صوتي عبر {speechProvider === "gemini" ? "Gemini Live" : "Azure"}
        </Button>
        <label className="block space-y-2" htmlFor="admin-medical-transcript">
          النص
        </label>
        <Textarea
          id="admin-medical-transcript"
          dir="auto"
          className="min-h-48"
          style={{ maxWidth: "none" }}
          maxLength={8000}
          value={transcript}
          disabled={Boolean(review) || recording}
          onChange={(event) => setTranscript(event.target.value)}
          placeholder="اكتب النص أو استخدم التسجيل الصوتي"
        />
        <p className="text-sm text-muted-foreground">
          راجع الأسماء والنفي والأرقام قبل إرسال النص للمعالجة.{" "}
          {transcript.length} / 8000 حرف.
        </p>
        {!review ? (
          <Button
            type="button"
            disabled={
              !transcript.trim() || recording || !settings.data || settingsDirty
            }
            onClick={() =>
              setReview({
                kind: "conversation",
                mode,
                transcript: transcript.trim(),
              })
            }
          >
            تجهيز النص للمراجعة
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  "العودة لتعديل النص تُخفي المتابعة الحالية ولا تلغي المهمة عند المزوّد. هل تريد المتابعة؟",
                )
              )
                setReview(undefined);
            }}
          >
            العودة لتعديل النص
          </Button>
        )}
      </section>
      {review && (
        <ProposalReview input={review} reviewOnly modelChoice={model} />
      )}
      {recording && (
        <FieldDictation
          speechProvider={speechProvider}
          maxRecordingMinutes={recordingMinutes}
          showDiagnostics={showDiagnostics}
          kind="conversation"
          mode={mode}
          onClose={() => setRecording(false)}
          onTranscript={(result) => {
            setTranscript((previous) =>
              [previous.trim(), result.transcript.trim()]
                .filter(Boolean)
                .join("\n"),
            );
            setMode(result.mode);
            setRecording(false);
          }}
        />
      )}
    </section>
  );
}
