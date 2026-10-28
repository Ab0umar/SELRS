export function isAiMobileApp(userAgent = navigator.userAgent): boolean {
  return /\bSELRS-AI\/1\b/.test(userAgent);
}

export function isAiMobilePath(path: string): boolean {
  return (
    path === "/ai" ||
    path.startsWith("/ai/") ||
    path === "/login" ||
    path === "/force-password-change"
  );
}
