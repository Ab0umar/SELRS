/**
 * شعار المركز (الصورة الرسمية للمركز):
 * — انسخ ملف الشعار إلى `client/public/center-logo.png` (يُعرض أولاً في الشريط، الهيدر، الدخول، والتقارير).
 * — إن لم يوجد: يُجرَّب `logo.png` ثم `brand-fallback.svg` (انظر `BrandLogo`).
 */
export const BRAND_NAME_AR = "عيون الشروق";
export const BRAND_TAGLINE_AR = "لليزك والمياه البيضاء";
export const BRAND_NAME_EN = "Al Shrouq Eye Center";
/** سطر التذييل (إنجليزي) كما في واجهة المركز — يظهر في أسفل الشل. */
export const BRAND_FOOTER_EN = "Shorouk Eyes for Lasik & Refractive Surgery";
/** مسار شعار المركز في الويب (ملف من `client/public`). */
export const BRAND_LOGO_URL = "/center-logo.png";
/** SVG مضمّن في المستودع — يظهر إن لم يُرفع `center-logo.png` أو `logo.png`. */
export const BRAND_LOGO_FALLBACK_URL = "/brand-fallback.svg";
/** PNG تقليدي (اختياري) بين المركز والـ SVG إن وُجد. */
export const BRAND_LOGO_PNG_FALLBACK_URL = "/logo.png";
