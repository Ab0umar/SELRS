import { useState } from "react";
import {
  BRAND_LOGO_FALLBACK_URL,
  BRAND_LOGO_PNG_FALLBACK_URL,
  BRAND_LOGO_URL,
} from "@/lib/brand";

const LOGO_SOURCES = [
  BRAND_LOGO_URL,
  BRAND_LOGO_PNG_FALLBACK_URL,
  BRAND_LOGO_FALLBACK_URL,
] as const;

type SheetWatermarkProps = {
  className?: string;
  imageClassName?: string;
};

export default function SheetWatermark({
  className,
  imageClassName,
}: SheetWatermarkProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const src = LOGO_SOURCES[sourceIndex];

  if (!src) return null;

  return (
    <div className={`sheet-watermark pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden ${className ?? ""}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        className={`h-[120mm] w-[120mm] object-contain opacity-[0.055] grayscale ${imageClassName ?? ""}`}
        decoding="async"
        onError={() => setSourceIndex((index) => index + 1)}
      />
    </div>
  );
}
