import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import AssistantModelSelect from "./AssistantModelSelect";
import { GROK_TEXT_MODEL } from "@shared/marketing-providers";

export default function WorkloadModelSelect({
  workload,
  disabled = false,
  onReadyChange,
}: {
  workload: "whatsapp.marketing" | "marketing.text";
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
}) {
  const profiles = trpc.aiManagement.profiles.useQuery(undefined, {
    retry: false,
  });
  const models = trpc.aiManagement.models.useQuery(undefined, {
    retry: false,
    staleTime: 300000,
  });
  const profile = profiles.data?.find((item) => item.workload === workload);
  const [model, setModel] = useState("");
  const [feedback, setFeedback] = useState("");
  const utils = trpc.useUtils();
  const save = trpc.aiManagement.updateProfile.useMutation({ retry: false });
  useEffect(() => {
    if (profile) setModel(`${profile.provider}:${profile.model}`);
  }, [profile?.model, profile?.provider]);
  useEffect(() => {
    onReadyChange?.(
      Boolean(
        profile?.enabled &&
        model === `${profile.provider}:${profile.model}` &&
        !save.isPending,
      ),
    );
  }, [profile, model, save.isPending, onReadyChange]);
  if (profiles.isLoading)
    return <p role="status">جارٍ تحميل إعداد المساعد...</p>;
  if (profiles.isError || !profile)
    return (
      <p role="alert">تعذر تحميل إعداد المساعد. راجع المزوّدين والحدود.</p>
    );
  const options = new Map(
    (models.data ?? [])
      .filter((item) => item.kind === "text")
      .map((item) => [
        `gemini:${item.id}`,
        { value: `gemini:${item.id}`, label: `Gemini · ${item.label}` },
      ]),
  );
  for (const tier of ["standard", "lite", "max"])
    options.set(`manus:${tier}`, {
      value: `manus:${tier}`,
      label: `Manus · ${tier}`,
    });
  if (workload === "marketing.text")
    options.set(`grok:${GROK_TEXT_MODEL}`, {
      value: `grok:${GROK_TEXT_MODEL}`,
      label: `Grok · ${GROK_TEXT_MODEL}`,
    });
  options.set(`${profile.provider}:${profile.model}`, {
    value: `${profile.provider}:${profile.model}`,
    label: `${profile.provider === "manus" ? "Manus" : profile.provider === "grok" ? "Grok" : "Gemini"} · ${profile.model}`,
  });
  return (
    <div className="grid gap-3">
      <AssistantModelSelect
        value={model}
        onChange={(value) => {
          setModel(value);
          setFeedback("");
        }}
        options={[...options.values()]}
        disabled={disabled || save.isPending}
      />
      {models.isError && (
        <p role="status">تعذر تحديث قائمة الموديلات؛ الإعداد المحفوظ ظاهر.</p>
      )}
      {(model !== `${profile.provider}:${profile.model}` ||
        !profile.enabled) && (
        <Button
          type="button"
          disabled={disabled || save.isPending}
          onClick={async () => {
            try {
              const provider = model.startsWith("manus:")
                ? "manus"
                : model.startsWith("grok:")
                  ? "grok"
                  : "gemini";
              await save.mutateAsync({
                ...profile,
                provider,
                model: model.slice(provider.length + 1),
                enabled: true,
              });
              await utils.aiManagement.profiles.invalidate();
              setFeedback("تم حفظ الموديل لهذا القسم.");
            } catch {
              setFeedback("تعذر حفظ الموديل؛ يظل الإعداد السابق مستخدمًا.");
            }
          }}
        >
          {profile.enabled ? "حفظ اختيار المساعد" : "تفعيل المساعد لهذا القسم"}
        </Button>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </div>
  );
}
