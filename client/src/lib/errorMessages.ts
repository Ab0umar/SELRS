export function getErrorContext(message?: string): { title: string; hint: string } {
  if (!message) {
    return {
      title: "حدث خطأ غير متوقع",
      hint: "تحقق من الاتصال أو حاول مرة أخرى.",
    };
  }

  const msg = message.toLowerCase();

  // Not found / no results
  if (msg.includes("not found") || msg.includes("موجود") || msg.includes("غير موجود")) {
    return {
      title: "لم يتم العثور على النتيجة",
      hint: "تحقق من البيانات المدخلة والفلاتر المختارة.",
    };
  }

  // Connection errors
  if (
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("اتصال")
  ) {
    return {
      title: "خطأ في الاتصال",
      hint: "تأكد من اتصالك بالإنترنت وحاول مرة أخرى.",
    };
  }

  // Timeout
  if (msg.includes("timeout") || msg.includes("استغرق") || msg.includes("طويل")) {
    return {
      title: "انتهت مهلة الانتظار",
      hint: "الطلب استغرق وقتاً طويلاً. حاول مرة أخرى مع تقليل نطاق البيانات.",
    };
  }

  // Database/server errors
  if (msg.includes("database") || msg.includes("server") || msg.includes("500")) {
    return {
      title: "خطأ في الخادم",
      hint: "يحدث صيانة أو مشكلة تقنية. حاول لاحقاً.",
    };
  }

  // Validation errors
  if (msg.includes("invalid") || msg.includes("validation") || msg.includes("غير صحيح")) {
    return {
      title: "بيانات غير صحيحة",
      hint: "تحقق من صيغة البيانات المدخلة.",
    };
  }

  // Default fallback
  return {
    title: "خطأ في تحميل البيانات",
    hint: message,
  };
}
