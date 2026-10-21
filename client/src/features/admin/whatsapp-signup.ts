export type SignupAssets = {
  event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";
  phoneId: string;
  wabaId: string;
};
type LoginResponse = { authResponse?: { code?: string } };
type FacebookSdk = {
  init(options: {
    appId: string;
    version: string;
    autoLogAppEvents: boolean;
    xfbml: boolean;
  }): void;
  login(callback: (response: LoginResponse) => void, options: unknown): void;
};
declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}
export function parseSignupMessage(
  origin: string,
  raw: unknown,
): SignupAssets | "cancel" | null {
  if (
    ![
      "https://www.facebook.com",
      "https://web.facebook.com",
      "https://facebook.com",
      "https://m.facebook.com",
    ].includes(origin)
  )
    return null;
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (
    !value ||
    typeof value !== "object" ||
    !("type" in value) ||
    value.type !== "WA_EMBEDDED_SIGNUP" ||
    !("event" in value)
  )
    return null;
  if (value.event === "CANCEL" || value.event === "ERROR") return "cancel";
  if (
    value.event !== "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" ||
    !("data" in value) ||
    !value.data ||
    typeof value.data !== "object"
  )
    return null;
  const data = value.data;
  if (
    !("phone_number_id" in data) ||
    !("waba_id" in data) ||
    typeof data.phone_number_id !== "string" ||
    typeof data.waba_id !== "string" ||
    !/^\d{1,128}$/.test(data.phone_number_id) ||
    !/^\d{1,128}$/.test(data.waba_id)
  )
    return null;
  return {
    event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
    phoneId: data.phone_number_id,
    wabaId: data.waba_id,
  };
}
let sdkPromise: Promise<void> | null = null;
export function loadSignupSdk() {
  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => {
      script.remove();
      reject(new Error("SDK_TIMEOUT"));
    }, 20000);
    script.onload = () => {
      window.clearTimeout(timer);
      window.FB ? resolve() : reject(new Error("SDK_UNAVAILABLE"));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("SDK_UNAVAILABLE"));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}
