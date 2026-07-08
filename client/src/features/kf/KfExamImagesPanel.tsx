import { useRef, useState } from "react";
import { Camera, Eye, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface Props {
  kfPatientId: number;
  readOnly?: boolean;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function KfExamImagesPanel({ kfPatientId, readOnly = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadsQuery = trpc.kf.listExamImages.useQuery(
    { kfPatientId },
    { enabled: Boolean(kfPatientId) },
  );

  const uploadMutation = trpc.kf.uploadExamImage.useMutation({
    onSuccess: () => {
      void uploadsQuery.refetch();
      setUploadError(null);
    },
    onError: (err: { message: string }) => {
      setUploadError(err.message);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    setUploadError(null);
    try {
      const fileDataBase64 = await toBase64(file);
      await uploadMutation.mutateAsync({
        kfPatientId,
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        fileDataBase64,
      });
    } catch {
      // error handled by onError
    } finally {
      setUploading(false);
    }
  };

  const images = uploadsQuery.data ?? [];

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            كاميرا
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            إرفاق صورة
          </Button>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-destructive" dir="auto">
          {uploadError}
        </p>
      )}

      {uploadsQuery.isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : images.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          لا توجد صور مرفقة بعد
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img: { id: number; fileName: string; viewUrl: string }) => (
            <a
              key={img.id}
              href={img.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 hover:border-primary/40 transition-colors"
            >
              <img
                src={img.viewUrl}
                alt={img.fileName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="size-5 text-white" />
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1">
                <p className="text-[10px] text-white truncate" dir="auto">
                  {img.fileName}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
