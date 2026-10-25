import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FieldDictation from "@/components/medical-assistant/FieldDictation";
import ProposalReview from "@/components/medical-assistant/ProposalReview";
import type { MedicalTranscript } from "@shared/medical-assistant";

export default function MedicalAssistant() {
  const [mode, setMode] = useState<"conversation" | "dictation">("dictation");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
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
          href="/admin-hub/ai"
          className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
        >
          إعدادات الذكاء الاصطناعي وحدود الاستخدام
        </Link>
      </header>
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
          disabled={Boolean(review) || recording}
          onClick={() => setRecording(true)}
        >
          تسجيل صوتي
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
            disabled={!transcript.trim() || recording}
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
      {review && <ProposalReview input={review} reviewOnly />}
      {recording && (
        <FieldDictation
          kind="conversation"
          mode={mode}
          onClose={() => setRecording(false)}
          onTranscript={(result) => {
            setTranscript(result.transcript);
            setMode(result.mode);
            setRecording(false);
          }}
        />
      )}
    </section>
  );
}
