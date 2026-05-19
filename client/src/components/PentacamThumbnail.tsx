import { ImageIcon } from "lucide-react";
import { useState } from "react";

type PentacamThumbnailProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export default function PentacamThumbnail({
  src,
  alt,
  className,
  loading = "lazy",
}: PentacamThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground ${className ?? ""}`}>
        <div className="flex flex-col items-center gap-2 text-xs">
          <ImageIcon className="h-5 w-5" />
          <span>Preview unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
