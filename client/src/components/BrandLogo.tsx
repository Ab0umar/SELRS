import { useState } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_FALLBACK_URL, BRAND_LOGO_PNG_FALLBACK_URL, BRAND_LOGO_URL } from "@/lib/brand";

const SRC_CHAIN = [BRAND_LOGO_URL, BRAND_LOGO_PNG_FALLBACK_URL, BRAND_LOGO_FALLBACK_URL] as const;

type BrandLogoProps = {
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
};

/**
 * شعار المركز: `center-logo.png` → `logo.png` → `brand-fallback.svg`، ثم أيقونة إن فشل الكل.
 */
export function BrandLogo({ className, imgClassName, fallbackClassName }: BrandLogoProps) {
  const [idx, setIdx] = useState(0);

  if (idx >= SRC_CHAIN.length) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl selrs-gradient-mixed text-white shadow-sm",
          className,
          fallbackClassName,
        )}
        aria-hidden
      >
        <Eye className="h-[55%] w-[55%] max-h-[22px] max-w-[22px]" />
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      <img
        src={SRC_CHAIN[idx]}
        alt=""
        className={cn("h-full w-full object-contain p-0.5", imgClassName)}
        onError={() => setIdx((i) => i + 1)}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
