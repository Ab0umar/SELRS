import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type {
  AudioConfig,
  Connection,
  SpeechRecognizer,
  PushAudioInputStream,
} from "microsoft-cognitiveservices-speech-sdk";
import { trpc } from "@/lib/trpc";
import { maintainContinuousSpeech } from "./continuous-speech";
import { hasOutgoingAudioStalled } from "./audio-stall";
import { observeSpeechSocket } from "./socket-diagnostics";
import { startPcmCapture } from "./pcm-capture";
import { releaseSpeechResources } from "./speech-cleanup";
import { routeTranscript, type RoutedTranscript } from "./transcript-routing";
import ProposalReview from "./ProposalReview";
import FloatingBar from "./FloatingBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type DictationTarget = {
  label: string;
  element: HTMLInputElement | HTMLTextAreaElement;
};

type RecordingProps = {
  speechProvider?: "azure" | "gemini";
  maxRecordingMinutes?: number;
  showDiagnostics?: boolean;
  patientName?: string;
  onClose: () => void;
} & (
  | { kind?: "field"; target: DictationTarget }
  | {
      kind: "conversation";
      mode: "conversation" | "dictation";
      onTranscript: (
        result: Extract<RoutedTranscript, { kind: "conversation" }>,
      ) => void;
    }
);

export default function FieldDictation(props: RecordingProps) {
  const settings = trpc.medicalAssistant.settings.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const [snapshot, setSnapshot] = useState<typeof settings.data>();
  useEffect(() => {
    if (!snapshot && settings.isSuccess && !settings.isFetching)
      setSnapshot(settings.data);
  }, [snapshot, settings.data, settings.isSuccess, settings.isFetching]);
  if (!snapshot)
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) props.onClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعدادات التسجيل</DialogTitle>
            <DialogDescription>
              {settings.isError
                ? "تعذّر تحميل الإعداد المركزي. لم يبدأ التسجيل."
                : "جارٍ تحميل إعداد التسجيل المركزي…"}
            </DialogDescription>
          </DialogHeader>
          {settings.isError && (
            <Button onClick={() => void settings.refetch()}>
              إعادة المحاولة
            </Button>
          )}
          <Button onClick={props.onClose}>إغلاق</Button>
        </DialogContent>
      </Dialog>
    );
  return (
    <ConfiguredFieldDictation
      {...props}
      speechProvider={snapshot.speechProvider}
      maxRecordingMinutes={snapshot.maxRecordingMinutes}
      showDiagnostics={snapshot.showDiagnostics}
    />
  );
}

function ConfiguredFieldDictation(props: RecordingProps) {
  const { patientName, onClose } = props;
  const provider = props.speechProvider ?? "azure";
  const maxRecordingMinutes = Math.min(
    8,
    Math.max(1, props.maxRecordingMinutes ?? 8),
  );
  const target = props.kind === "conversation" ? undefined : props.target;
  const token = trpc.medicalAssistant.speechToken.useMutation();
  const geminiToken = trpc.medicalAssistant.geminiSpeechToken.useMutation();
  const [text, setText] = useState("");
  const [partial, setPartial] = useState("");
  const [status, setStatus] = useState("جارٍ تشغيل الميكروفون…");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reviewText, setReviewText] = useState<string>();
  const [seconds, setSeconds] = useState(0);
  const [approvedProposal, setApprovedProposal] = useState<string>();
  const [diagnostics, setDiagnostics] = useState({
    level: 0,
    microphone: "Starting",
    meter: "Starting",
    lastResponse: "None yet",
    connection: "Starting",
    audioSent: "None yet",
    serviceMessage: "None yet",
    packets: 0,
    pcmChunks: 0,
    socketFrames: 0,
    socketLastSend: "None yet",
    socketState: "Starting",
    socketBufferedBytes: 0,
  });
  const resources = useRef<{
    recognizer?: SpeechRecognizer;
    audio?: AudioConfig;
    stream?: MediaStream;
  }>({});
  const initial = useRef(target?.element.value ?? "");
  const lastApplied = useRef<string | undefined>(undefined);
  const end = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let stopping = false;
    let gemini:
      | Awaited<ReturnType<typeof import("./gemini-live").connectGeminiLive>>
      | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let session: ReturnType<typeof maintainContinuousSpeech> | undefined;
    let limit: ReturnType<typeof setTimeout> | undefined;
    let meterTimer: ReturnType<typeof setInterval> | undefined;
    let meterContext: AudioContext | undefined;
    let meterSource: MediaStreamAudioSourceNode | undefined;
    let lastResponseAt: number | undefined;
    let connection: Connection | undefined;
    let connectionState = "Starting";
    let lastAudioSentAt: number | undefined;
    let lastServiceMessageAt: number | undefined;
    let audioPackets = 0;
    let pcmChunks = 0;
    let stopPcm: (() => void) | undefined;
    let pushStream: PushAudioInputStream | undefined;
    let lastPcmAt: number | undefined;
    let generation = 0;
    let recoveries = 0;
    let recoveryTimer: ReturnType<typeof setInterval> | undefined;
    const socketProbe = observeSpeechSocket();
    const elapsed = (at: number | undefined) =>
      at === undefined
        ? "None yet"
        : `${Math.floor((performance.now() - at) / 1000)} seconds ago`;
    const release = () => {
      generation++;
      clearInterval(recoveryTimer);
      socketProbe.dispose();
      clearInterval(meterTimer);
      clearTimeout(limit);
      clearTimeout(finishTimer);
      releaseSpeechResources([
        () => gemini?.close(),
        () => session?.dispose(),
        () => stopPcm?.(),
        () => pushStream?.close(),
        () => connection?.close(),
        () => meterSource?.disconnect(),
        () => {
          if (meterContext && meterContext.state !== "closed")
            void meterContext.close().catch(() => {});
        },
        () => resources.current.recognizer?.close(),
        () =>
          resources.current.stream
            ?.getTracks()
            .forEach((track) => track.stop()),
      ]);
      stopPcm = undefined;
      pushStream = undefined;
      connection = undefined;
      resources.current = {};
    };
    const fail = (message: string) => {
      if (disposed) return;
      stopping = true;
      setError(message);
      setStatus("انقطع التسجيل — النص الملتقط محفوظ.");
      setActive(false);
      setPartial("");
      release();
    };
    end.current = () => {
      if (disposed || stopping) return;
      stopping = true;
      session?.stop();
      clearTimeout(limit);
      setStatus("جارٍ الإيقاف…");
      const recognizer = resources.current.recognizer;
      const finish = () => {
        if (!disposed) {
          setActive(false);
          setPartial("");
          setStatus("تم الإيقاف — راجع النص.");
        }
        release();
      };
      if (gemini) {
        stopPcm?.();
        stopPcm = undefined;
        try {
          gemini.finish();
        } catch {
          fail("Unable to finish Gemini recording. Review captured text.");
          return;
        }
        finishTimer = setTimeout(finish, 2500);
      } else if (recognizer)
        recognizer.stopContinuousRecognitionAsync(finish, () =>
          fail("Unable to finish recording. Review the captured text."),
        );
      else {
        disposed = true;
        finish();
        setActive(false);
        setStatus("تم الإيقاف");
      }
    };
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Microphone requires HTTPS and a supported browser.");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        resources.current.stream = stream;
        const track = stream.getAudioTracks()[0];
        let analyser: AnalyserNode | undefined;
        let samples: Uint8Array<ArrayBuffer> | undefined;
        try {
          meterContext = new AudioContext({ sampleRate: 16000 });
          meterSource = meterContext.createMediaStreamSource(stream);
          analyser = meterContext.createAnalyser();
          analyser.fftSize = 256;
          meterSource.connect(analyser);
          samples = new Uint8Array(analyser.fftSize);
          await meterContext.resume();
        } catch {
          // Meter failure must not prevent Azure recording.
        }
        if (disposed) {
          release();
          return;
        }
        meterTimer = setInterval(() => {
          if (disposed) return;
          let level = 0;
          if (analyser && samples && meterContext?.state === "running") {
            analyser.getByteTimeDomainData(samples);
            const energy =
              samples.reduce(
                (sum, value) => sum + ((value - 128) / 128) ** 2,
                0,
              ) / samples.length;
            level = Math.min(100, Math.round(Math.sqrt(energy) * 500));
          }
          const socket = socketProbe.read();
          setDiagnostics({
            level,
            microphone: !track
              ? "No audio track"
              : `${track.readyState}${track.muted ? " (muted)" : ""}${!track.enabled ? " (disabled)" : ""}`,
            meter: meterContext?.state ?? "Unavailable",
            lastResponse:
              lastResponseAt === undefined
                ? "None yet"
                : `${Math.floor((performance.now() - lastResponseAt) / 1000)} seconds ago`,
            connection: connectionState,
            audioSent: elapsed(lastAudioSentAt),
            serviceMessage: elapsed(lastServiceMessageAt),
            packets: audioPackets,
            pcmChunks,
            socketFrames: socket.frames,
            socketLastSend: elapsed(socket.lastSendAt),
            socketState: socket.state,
            socketBufferedBytes: socket.bufferedBytes,
          });
        }, 250);
        if (provider === "gemini") {
          const credentials = await geminiToken.mutateAsync();
          if (disposed || stopping) return;
          if (!meterContext || !meterSource || meterContext.state !== "running")
            throw new Error("Browser audio capture is unavailable.");
          const { connectGeminiLive } = await import("./gemini-live");
          if (disposed || stopping) return;
          const connected = await connectGeminiLive(credentials, {
            final: (value) => {
              if (disposed) return;
              lastResponseAt = performance.now();
              setText((previous) =>
                [previous, value].filter(Boolean).join("\n"),
              );
              setPartial("");
            },
            partial: (value) => {
              if (!disposed && !stopping) {
                lastResponseAt = performance.now();
                setPartial(value);
              }
            },
            error: () =>
              fail(
                "Gemini Live disconnected. Finalized text is preserved; some speech may be missing. Try Azure or start a new recording.",
              ),
          });
          gemini = connected;
          if (disposed || stopping) {
            connected.close();
            return;
          }
          connectionState = "Connected";
          setStatus("جارٍ التسجيل — Gemini");
          stopPcm = await startPcmCapture(
            meterContext,
            meterSource,
            (bytes) => {
              if (disposed || stopping) return;
              pcmChunks++;
              try {
                connected.write(bytes);
                audioPackets++;
                lastAudioSentAt = performance.now();
              } catch {
                fail(
                  "Gemini audio delivery failed. Finalized text is preserved.",
                );
              }
            },
            () =>
              fail(
                "Browser audio capture stopped. Finalized text is preserved.",
              ),
          );
          if (disposed || stopping) release();
          else
            limit = setTimeout(
              () => end.current(),
              maxRecordingMinutes * 60 * 1000,
            );
          return;
        }
        const credentials = await token.mutateAsync();
        if (disposed) return;
        const sdk = await import("microsoft-cognitiveservices-speech-sdk");
        if (disposed) return;
        if (!meterContext || !meterSource || meterContext.state !== "running")
          throw new Error(
            "Browser audio capture is unavailable. Close and try again.",
          );
        const connectAzure = () => {
          const epoch = ++generation;
          releaseSpeechResources([
            () => session?.dispose(),
            () => resources.current.recognizer?.close(),
            () => pushStream?.close(),
            () => connection?.close(),
          ]);
          const current = () => !disposed && !stopping && generation === epoch;
          const startedAt = performance.now();
          lastAudioSentAt = undefined;
          connectionState = "Connecting";
          const config = sdk.SpeechConfig.fromAuthorizationToken(
            credentials.token,
            credentials.region,
          );
          config.speechRecognitionLanguage = "ar-EG";
          config.setProperty(sdk.PropertyId.WebWorkerLoadType, "off");
          if (!meterContext || !meterSource || meterContext.state !== "running")
            throw new Error(
              "Browser audio capture is unavailable. Close and try again.",
            );
          pushStream = sdk.AudioInputStream.createPushStream(
            sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1),
          );
          const audio = sdk.AudioConfig.fromStreamInput(pushStream);
          resources.current.audio = audio;
          const recognizer = new sdk.SpeechRecognizer(config, audio);
          connection = sdk.Connection.fromRecognizer(recognizer);
          connection.connected = () => {
            if (!current()) return;
            connectionState = "Connected";
          };
          connection.disconnected = () => {
            if (!current()) return;
            connectionState = "Disconnected";
          };
          connection.messageSent = (event) => {
            if (!current()) return;
            if (
              event.message.path.toLowerCase() === "audio" &&
              event.message.isBinaryMessage
            ) {
              lastAudioSentAt = performance.now();
              audioPackets++;
            }
          };
          connection.messageReceived = () => {
            if (!current()) return;
            lastServiceMessageAt = performance.now();
          };
          resources.current.audio = audio;
          resources.current.recognizer = recognizer;
          recognizer.recognizing = (_, event) => {
            if (!current()) return;
            lastResponseAt = performance.now();
            if (!disposed) setPartial(event.result.text);
          };
          recognizer.recognized = (_, event) => {
            if (disposed || generation !== epoch) return;
            lastResponseAt = performance.now();
            if (
              !disposed &&
              event.result.reason === sdk.ResultReason.RecognizedSpeech &&
              event.result.text.trim()
            ) {
              setText((previous) =>
                [previous, event.result.text.trim()].filter(Boolean).join("\n"),
              );
              setPartial("");
            }
          };
          session = maintainContinuousSpeech(
            recognizer,
            sdk.CancellationReason.Error,
            {
              recording: () => {
                if (current()) setStatus("جارٍ التسجيل — Azure عربي (مصر)");
              },
              reconnecting: () => {
                if (current())
                  setStatus("إعادة اتصال Azure — اترك الشريط مفتوحًا.");
              },
              failed: (message) => {
                if (current()) fail(message);
              },
            },
          );
          recognizer.startContinuousRecognitionAsync(
            () => {
              if (!current()) return;
              setStatus("جارٍ التسجيل — Azure عربي (مصر)");
              if (!limit)
                limit = setTimeout(
                  () => end.current(),
                  maxRecordingMinutes * 60 * 1000,
                );
            },
            () => {
              if (current()) fail("Could not start Azure recording.");
            },
          );
          clearInterval(recoveryTimer);
          recoveryTimer = setInterval(() => {
            if (
              !current() ||
              !hasOutgoingAudioStalled({
                now: performance.now(),
                startedAt,
                lastPcmAt,
                lastPacketAt: lastAudioSentAt,
              })
            )
              return;
            if (++recoveries > 2) {
              fail(
                "Azure audio delivery stalled repeatedly. Finalized text is preserved; speech during the interruptions may be missing. Close and try again.",
              );
              return;
            }
            setError(
              "توقف إرسال الصوت. قد يكون الكلام أثناء التوقف ناقصًا؛ أعده بعد استئناف التسجيل.",
            );
            setPartial("");
            setStatus("إعادة بناء اتصال Azure — انتظر قبل الكلام.");
            try {
              connectAzure();
            } catch {
              fail("Could not rebuild Azure. Finalized text is preserved.");
            }
          }, 1000);
        };
        connectAzure();
        stopPcm = await startPcmCapture(
          meterContext,
          meterSource,
          (bytes) => {
            if (disposed || stopping) return;
            lastPcmAt = performance.now();
            pcmChunks++;
            try {
              pushStream?.write(bytes);
            } catch {
              fail(
                "Could not send microphone audio. Finalized text is preserved.",
              );
            }
          },
          () =>
            fail(
              "Browser audio processor stopped. Captured text is preserved.",
            ),
        );
        if (disposed || stopping) release();
      } catch (cause) {
        fail(
          cause instanceof Error
            ? cause.message
            : "Could not access the microphone.",
        );
      }
    })();
    return () => {
      disposed = true;
      clearTimeout(limit);
      release();
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (!active || error) setExpanded(true);
  }, [active, error]);
  useEffect(() => {
    // Snapshot the finished recording once: edits, apply and undo must never restart a billed request.
    if (!active && reviewText === undefined && text.trim()) setReviewText(text);
  }, [active, text, reviewText]);

  const write = (value: string) => {
    if (!target) return false;
    const element = target.element;
    if (!element.isConnected || element.disabled || element.readOnly) {
      setError("الحقل لم يعد قابلًا للتعديل. أغلق الشريط واختر الحقل من جديد.");
      return false;
    }
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
      element,
      value,
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  };
  const applyTranscript = () => {
    if (props.kind === "conversation") {
      const result = routeTranscript(
        { kind: "conversation", mode: props.mode },
        text,
      );
      if (result.kind === "conversation") props.onTranscript(result);
      return;
    }
    if (!target) return;
    if (target.element.value !== initial.current) {
      setError(
        "تغيّر الحقل أثناء التسجيل. أغلق الشريط وأعد المحاولة حتى لا يُمسح تعديلك.",
      );
      return;
    }
    const result = routeTranscript(
      { kind: "field", label: target.label },
      approvedProposal ?? text,
    );
    const value = [initial.current, result.transcript]
      .filter(Boolean)
      .join("\n");
    if (write(value)) {
      lastApplied.current = value;
      setApplied(true);
    }
  };
  const undoApplied = () => {
    if (!target) return;
    if (target.element.value !== lastApplied.current) {
      setError("تغيّر الحقل بعد التطبيق، فلا يمكن التراجع.");
      return;
    }
    if (write(initial.current)) setApplied(false);
  };
  return (
    <FloatingBar
      label={target ? `إملاء: ${target.label}` : "تسجيل الزيارة كاملة"}
      storageKey="medical-dictation-bar-position"
      expanded={expanded}
      zIndex={60}
      onEscape={onClose}
      sheetTitle={
        <>
          <h2 className="text-sm font-semibold">
            {target ? `إملاء: ${target.label}` : "تسجيل الزيارة كاملة"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {patientName} · راجع قبل التطبيق.{" "}
            {target ? "يُطبّق على هذا الحقل فقط." : "لا تتغير أي حقول من هنا."}{" "}
            · {provider === "gemini" ? "Gemini" : "Azure عربي (مصر)"}
          </p>
        </>
      }
      sheet={
        <>
          {props.showDiagnostics !== false && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                تشخيص الاتصال
              </summary>
              {provider === "gemini" && (
                <p role="status">
                  Connection: {diagnostics.connection} · Audio chunks sent:{" "}
                  {diagnostics.packets} · Last transcription:{" "}
                  {diagnostics.lastResponse}
                </p>
              )}
              {provider === "azure" && (
                <section
                  aria-label="Recording diagnostics"
                  className="space-y-1 rounded border p-3 text-sm"
                >
                  <label htmlFor="dictation-mic-level">
                    Microphone activity: {diagnostics.level}%
                  </label>
                  <progress
                    id="dictation-mic-level"
                    max={100}
                    value={diagnostics.level}
                    className="block w-full"
                  />
                  <p>
                    Microphone: {diagnostics.microphone} · Audio meter:{" "}
                    {diagnostics.meter}
                  </p>
                  <p>
                    Last Azure transcription response:{" "}
                    {diagnostics.lastResponse}
                  </p>
                  <p>Azure connection: {diagnostics.connection}</p>
                  <p>
                    Last SDK audio packet: {diagnostics.audioSent} · Packets:{" "}
                    {diagnostics.packets}
                  </p>
                  <p>
                    Last Azure service message: {diagnostics.serviceMessage}
                  </p>
                  <p>PCM chunks produced: {diagnostics.pcmChunks}</p>
                  <p>
                    Actual Azure WebSocket frames sent:{" "}
                    {diagnostics.socketFrames} · Last send:{" "}
                    {diagnostics.socketLastSend}
                  </p>
                  <p>
                    Azure socket: {diagnostics.socketState} · Queued bytes:{" "}
                    {diagnostics.socketBufferedBytes}
                  </p>
                  <p className="text-muted-foreground">
                    Diagnostics stay in this window; no speech or audio is
                    logged.
                  </p>
                </section>
              )}
            </details>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <Textarea
            aria-label="النص"
            dir="auto"
            value={text}
            readOnly={active || applied}
            onChange={(event) => {
              setText(event.target.value);
              setApprovedProposal(undefined);
            }}
            className="min-h-16 max-h-32"
          />
          {partial && (
            <p dir="auto" className="text-muted-foreground">
              {partial}
            </p>
          )}
          {target && reviewText !== undefined && (
            <div hidden={applied}>
              <ProposalReview
                autoStart
                input={{
                  kind: "field",
                  label: target.label,
                  transcript: reviewText,
                }}
                onApplyField={(value) => setApprovedProposal(value)}
              />
            </div>
          )}
          {approvedProposal && !applied && (
            <p role="status">
              تم اعتماد اقتراح الذكاء الاصطناعي. اضغط تطبيق لإضافته؛ النص الأصلي
              يبقى محفوظًا.
            </p>
          )}
        </>
      }
      pill={
        <>
          <span
            aria-hidden="true"
            className={
              "h-2.5 w-2.5 shrink-0 rounded-full " +
              (active ? "animate-pulse bg-destructive" : "bg-muted-foreground")
            }
          />
          <span className="w-12 shrink-0 font-mono text-sm tabular-nums max-sm:me-auto">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </span>
          <p
            role="status"
            className="hidden min-w-0 flex-1 truncate text-sm sm:block"
          >
            {error || partial || status}
          </p>
          {active ? (
            <Button size="sm" onClick={() => end.current()}>
              إيقاف
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={applied || !text.trim()}
              onClick={applyTranscript}
            >
              {target ? "تطبيق على الحقل" : "استخدام نص الزيارة"}
            </Button>
          )}
          {target && applied && (
            <Button size="sm" variant="outline" onClick={undoApplied}>
              تراجع
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label={expanded ? "إخفاء المراجعة" : "إظهار المراجعة"}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label="إغلاق"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </>
      }
    />
  );
}
