/**
 * One publish choice per page, stored in two existing settings:
 * the page's `autoPublish` flag (the scheduler runs only when it is on) and
 * `marketing_require_approval_<pageRole>` (scheduled drafts wait for a person).
 *
 * | choice   | autoPublish | requireApproval        |
 * | -------- | ----------- | ---------------------- |
 * | off      | false       | left as stored         |
 * | review   | true        | true                   |
 * | auto     | true        | false                  |
 *
 * With `autoPublish` off nothing is generated or published, so the stored
 * approval flag has no effect and both combinations read as "off".
 */
export type MarketingPublishMode = "off" | "review" | "auto";

export const MARKETING_PUBLISH_MODES: ReadonlyArray<{
  value: MarketingPublishMode;
  label: string;
}> = [
  { value: "off", label: "متوقف: مفيش توليد ولا نشر بالجدول" },
  { value: "review", label: "يجهّز المسودة وأنا أنشر" },
  { value: "auto", label: "يجهّز وينشر لوحده" },
];

export function marketingPublishModeOf(settings: {
  autoPublish: boolean;
  requireApproval: boolean;
}): MarketingPublishMode {
  if (!settings.autoPublish) return "off";
  return settings.requireApproval ? "review" : "auto";
}

export function marketingPublishSettingsFor(
  mode: MarketingPublishMode,
  storedRequireApproval: boolean,
): { autoPublish: boolean; requireApproval: boolean } {
  if (mode === "off")
    return { autoPublish: false, requireApproval: storedRequireApproval };
  return { autoPublish: true, requireApproval: mode === "review" };
}
