import { ENV } from "../_core/env";

type TextTemplateParameter = {
  type: "text";
  parameter_name: string;
  text: string;
};

function internationalSupportPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return `2${digits}`;
  if (/^201\d{9}$/.test(digits)) return digits;
  return "201285800309";
}

export function appendSupportNoticeToLastParameter<
  T extends TextTemplateParameter,
>(parameters: T[]): T[] {
  if (parameters.length === 0) return parameters;

  const supportNumber = ENV.whatsappSupportNumber || "01285800309";
  const supportLink = `https://wa.me/${internationalSupportPhone(supportNumber)}`;
  const notice = `هذه رسالة آلية، برجاء عدم الرد على هذه الرسالة. للاستفسارات تواصل معنا عبر واتساب: ${supportNumber} | ${supportLink}`;
  const lastIndex = parameters.length - 1;

  return parameters.map((parameter, index) =>
    index === lastIndex
      ? {
          ...parameter,
          text: `${parameter.text} | ${notice}`.replace(/\s+/g, " ").trim(),
        }
      : parameter,
  );
}
