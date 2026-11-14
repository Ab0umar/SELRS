import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import FieldDictation from "@/components/medical-assistant/FieldDictation";
import ProposalReview from "@/components/medical-assistant/ProposalReview";
import type { MedicalTranscript } from "@shared/medical-assistant";
import AssistantModelSelect from "@/features/ai/AssistantModelSelect";
import { medicalModelOptions } from "@/features/ai/medical-models";
import { trpc } from "@/lib/trpc";

type SpeechProvider = "azure" | "gemini";

export default function MedicalAssistant() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const settings = trpc.medicalAssistant.settings.useQuery(undefined, {
    retry: false,
  });
  const saveSettings = trpc.medicalAssistant.saveSettings.useMutation();
  const options = trpc.medicalAssistant.providerOptions.useQuery(undefined, {
    retry: false,
  });
  const speechOptions = trpc.medicalAssistant.speechOptions.useQuery(
    undefined,
    { retry: false },
  );
  // Recording and processing always use the saved central settings, so an
  // admin's unsaved draft in the panel never blocks anyone from working.
  const speechProvider: SpeechProvider =
    settings.data?.speechProvider ?? "azure";
  const recordingMinutes = settings.data?.maxRecordingMinutes ?? 8;
  const showDiagnostics = settings.data?.showDiagnostics ?? true;
  const model = settings.data?.processingModel ?? "manus:standard";

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [draftSpeech, setDraftSpeech] = useState<SpeechProvider>("azure");
  const [draftMinutes, setDraftMinutes] = useState(8);
  const [draftDiagnostics, setDraftDiagnostics] = useState(true);
  const [draftModel, setDraftModel] = useState("manus:standard");
  const [mode, setMode] = useState<"conversation" | "dictation">("dictation");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [consent, setConsent] = useState(false);
  const [review, setReview] = useState<MedicalTranscript>();

  useEffect(() => {
    if (!settings.data) return;
    setDraftSpeech(settings.data.speechProvider);
    setDraftMinutes(settings.data.maxRecordingMinutes);
    setDraftDiagnostics(settings.data.showDiagnostics);
    setDraftModel(settings.data.processingModel);
    setConsent(false);
  }, [settings.data]);

  const settingsDirty = Boolean(
    settings.data &&
    (settings.data.speechProvider !== draftSpeech ||
      settings.data.maxRecordingMinutes !== draftMinutes ||
      settings.data.showDiagnostics !== draftDiagnostics ||
      settings.data.processingModel !== draftModel),
  );
  const readyFor = (provider: SpeechProvider) =>
    provider === "gemini"
      ? Boolean(
          speechOptions.data?.gemini.configured &&
          speechOptions.data.gemini.clinicalEnabled,
        )
      : Boolean(speechOptions.data?.azure.configured);
  const speechReady = readyFor(speechProvider);
  const providerName =
    speechProvider === "gemini" ? "Google Gemini" : "Microsoft Azure";
  const speechStatus = (provider: SpeechProvider) =>
    speechOptions.isPending
      ? "جارٍ فحص إعدادات الصوت…"
      : speechOptions.isError
        ? "تعذّر قراءة إعدادات الصوت."
        : readyFor(provider)
          ? "إعداد المزوّد موجود. الوصول الفعلي والرصيد يُتحقق منهما عند الاتصال."
          : provider === "gemini"
            ? "Gemini يحتاج مفتاح API وتفعيل موافقة الاستخدام الطبي على السيرفر."
            : "Azure يحتاج مفتاح Speech ومنطقة الخدمة على السيرفر.";
  const panelDisabled =
    !isAdmin || settings.isPending || saveSettings.isPending || recording;

  return (
    <section
      dir="rtl"
      aria-label="المساعد الطبي"
      className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold">المساعد الطبي</h1>
          <p className="text-sm text-muted-foreground">
            لا تُحفظ بيانات في ملف مريض من هذه الصفحة.
          </p>
          <details className="text-sm">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline underline-offset-4">
              الخصوصية والتكلفة
            </summary>
            <div className="mt-1 max-w-2xl space-y-2 rounded-lg border bg-muted/40 p-3 text-muted-foreground">
              <p>
                الصوت يُرسل إلى {providerName} للتحويل إلى نص، وقد تُحتسب تكلفة
                استخدام. لازم موافقة صاحب الصوت قبل كل تسجيل.
              </p>
              <p>
                {speechProvider === "gemini"
                  ? "تفريغ حرفي مع اكتشاف اللغة تلقائيًا وقاموس أسماء من قاعدة البيانات. لا يضمن تحويل كل مصطلح إلى الإنجليزية."
                  : "التعرّف مضبوط على العربية المصرية (ar-EG)."}{" "}
                لا يحدث تبديل تلقائي إلى مزوّد آخر عند فشل الاتصال.
              </p>
              <p>
                اختيار معالجة النص لتنظيم النص واستخراج الاقتراحات، ولا يغيّر
                مزوّد الميكروفون.
              </p>
              {options.data && !options.data.gemini.clinicalEnabled && (
                <p>
                  Gemini الطبي يحتاج تفعيل إعداد الموافقة السريرية على الخادم
                  قبل استخدامه.
                </p>
              )}
              <p>
                مفاتيح API وموافقة الخصوصية وحدود الاستخدام العامة تُدار على
                السيرفر ومن صفحة إعدادات الذكاء الاصطناعي. لا تُحفظ بيانات مريض
                تلقائيًا.
              </p>
              <p>
                الإعداد موحّد لكل المستخدمين، ويُطبّق على التسجيلات الجديدة في
                جميع الخانات وملف المريض والـWorkflow. الأدمن فقط يمكنه تغييره.
              </p>
              <Link
                href="/ai/settings"
                className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
              >
                إعدادات الذكاء الاصطناعي وحدود الاستخدام
              </Link>
            </div>
          </details>
        </div>
        {isAdmin && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setSettingsOpen(true)}
          >
            الإعدادات
          </Button>
        )}
      </header>

      {settings.isError && (
        <p role="alert" className="text-sm text-destructive">
          تعذّر تحميل الإعداد المحفوظ.{" "}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => void settings.refetch()}
          >
            إعادة المحاولة
          </button>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5"
          aria-labelledby="medical-assistant-input-title"
        >
          <h2
            id="medical-assistant-input-title"
            className="text-lg font-semibold"
          >
            1. سجّل أو اكتب
          </h2>
          <div
            role="group"
            aria-label="نوع التسجيل"
            className="inline-flex flex-wrap rounded-lg border p-1"
          >
            {(
              [
                ["dictation", "إملاء الطبيب"],
                ["conversation", "حوار الطبيب والمريض"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                disabled={Boolean(review) || recording}
                onClick={() => setMode(value)}
                className={`min-h-11 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 ${
                  mode === value
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex min-h-11 items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0"
              checked={consent}
              disabled={recording}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              حصلت على موافقة صاحب الصوت على التسجيل وإرساله إلى{" "}
              {providerName}. قد تُحتسب تكلفة استخدام.
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="min-h-11"
              disabled={
                Boolean(review) ||
                recording ||
                !consent ||
                !speechReady ||
                !settings.data
              }
              onClick={() => {
                if (consent && speechReady) setRecording(true);
              }}
            >
              ابدأ التسجيل
            </Button>
            <span className="text-sm text-muted-foreground">
              أقصى مدة {recordingMinutes} دقائق ·{" "}
              {speechProvider === "gemini"
                ? "Gemini Live · عربي وإنجليزي"
                : "Azure · عربي مصري"}
            </span>
          </div>
          {!speechReady && (
            <div role="status" className="text-sm text-muted-foreground">
              {speechStatus(speechProvider)}
              {speechOptions.isError && (
                <Button
                  variant="link"
                  className="min-h-11"
                  onClick={() => void speechOptions.refetch()}
                >
                  إعادة فحص إعدادات الصوت
                </Button>
              )}
            </div>
          )}
          <label
            className="block text-sm font-semibold"
            htmlFor="admin-medical-transcript"
          >
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
          <p className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
            <span>راجع الأسماء والنفي والأرقام قبل التجهيز.</span>
            <span dir="ltr">{transcript.length} / 8000</span>
          </p>
          {!review ? (
            <Button
              type="button"
              className="min-h-11"
              disabled={!transcript.trim() || recording || !settings.data}
              onClick={() =>
                setReview({
                  kind: "conversation",
                  mode,
                  transcript: transcript.trim(),
                })
              }
            >
              جهّز للمراجعة
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                if (
                  window.confirm(
                    "العودة لتعديل النص تُخفي المتابعة الحالية ولا تلغي المهمة عند المزوّد. هل تريد المتابعة؟",
                  )
                )
                  setReview(undefined);
              }}
            >
              ارجع للنص
            </Button>
          )}
        </section>

        <section
          className="min-w-0 space-y-3 rounded-xl border bg-card p-4 sm:p-5"
          aria-labelledby="medical-assistant-review-title"
        >
          <h2
            id="medical-assistant-review-title"
            className="text-lg font-semibold"
          >
            2. راجع واعتمد
          </h2>
          {review ? (
            <ProposalReview input={review} reviewOnly modelChoice={model} />
          ) : (
            <p className="text-sm text-muted-foreground">
              الاقتراحات هتظهر هنا بعد ما تجهّز النص: الشكوى، التشخيص، العلاج،
              والفحوصات. كل اقتراح بتعتمده أو ترفضه لوحده.
            </p>
          )}
        </section>
      </div>

      {isAdmin && (
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent
            side="left"
            dir="rtl"
            className="w-full overflow-y-auto sm:max-w-md"
          >
            <SheetHeader>
              <SheetTitle>الإعدادات</SheetTitle>
              <SheetDescription>
                للأدمن فقط. بتتطبق على كل المستخدمين وعلى التسجيلات الجديدة.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <section
                aria-labelledby="medical-speech-settings"
                className="space-y-3"
              >
                <h3 id="medical-speech-settings" className="font-semibold">
                  إعدادات الصوت والتسجيل
                </h3>
                <label className="block space-y-2 text-sm">
                  <span>مزوّد تحويل الصوت إلى نص</span>
                  <select
                    aria-label="مزوّد تحويل الصوت إلى نص"
                    className="block min-h-11 w-full rounded-md border bg-background px-3"
                    value={draftSpeech}
                    disabled={panelDisabled}
                    onChange={(event) =>
                      setDraftSpeech(
                        event.target.value === "gemini" ? "gemini" : "azure",
                      )
                    }
                  >
                    <option value="azure">Azure — العربية المصرية</option>
                    <option value="gemini">
                      Gemini 3.5 Transcribe Live — عربي وإنجليزي
                    </option>
                  </select>
                </label>
                <p role="status" className="text-sm text-muted-foreground">
                  {speechStatus(draftSpeech)}
                </p>
                <label className="block space-y-2 text-sm">
                  <span>الحد الأقصى لمدة التسجيل</span>
                  <select
                    aria-label="الحد الأقصى لمدة التسجيل"
                    value={draftMinutes}
                    disabled={panelDisabled}
                    className="block min-h-11 w-full rounded-md border bg-background px-3"
                    onChange={(event) =>
                      setDraftMinutes(Number(event.target.value))
                    }
                  >
                    {[1, 3, 5, 8].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} دقائق
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={draftDiagnostics}
                    disabled={panelDisabled}
                    onChange={(event) =>
                      setDraftDiagnostics(event.target.checked)
                    }
                  />
                  إظهار معلومات الاتصال والتسجيل
                </label>
              </section>
              <section
                aria-labelledby="medical-processing-settings"
                className="space-y-3 border-t pt-4"
              >
                <h3 id="medical-processing-settings" className="font-semibold">
                  معالجة النص بعد التسجيل
                </h3>
                <AssistantModelSelect
                  value={draftModel}
                  onChange={setDraftModel}
                  disabled={panelDisabled || Boolean(review)}
                  options={medicalModelOptions(options.data)}
                />
                {options.data?.managementEnabled && (
                  <p className="text-sm text-muted-foreground">
                    إعداد المعالجة المركزي: {options.data.central?.provider} /{" "}
                    {options.data.central?.model}. حفظ الاختيار هنا يحدّثه لكل
                    المستخدمين مع الحفاظ على حدود الاستهلاك.
                  </p>
                )}
              </section>
              <div className="space-y-2 border-t pt-4">
                <Button
                  className="min-h-11 w-full"
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
                        speechProvider: draftSpeech,
                        maxRecordingMinutes: draftMinutes,
                        showDiagnostics: draftDiagnostics,
                        processingModel: draftModel,
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
                {settingsDirty && (
                  <p role="status" className="text-sm text-muted-foreground">
                    تغييرات غير محفوظة. التسجيل والمعالجة بيستخدموا الإعداد
                    المحفوظ لحد ما تحفظ.
                  </p>
                )}
                {savedMessage && (
                  <p role="status" className="text-sm">
                    {savedMessage}
                  </p>
                )}
                {saveSettings.error && (
                  <p role="alert" className="text-sm text-destructive">
                    {saveSettings.error.message}
                  </p>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
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
                .join("\n")
                .slice(0, 8000),
            );
            setMode(result.mode);
            setRecording(false);
          }}
        />
      )}
    </section>
  );
}
