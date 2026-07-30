import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Eye, ImagePlus, Loader2, RotateCcw, RotateCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

interface Props {
  patientId: number;
  readOnly?: boolean;
}

type PendingImage = {
  file: File;
  url: string;
  name: string;
  mimeType: string;
};

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function editImageToFile(
  image: PendingImage,
  options: { rotation: number; zoom: number; offsetX: number; offsetY: number },
): Promise<File> {
  const source = await loadImage(image.url);
  const outputSize = 1600;
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot edit image on this device.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.translate(outputSize / 2, outputSize / 2);
  ctx.rotate((options.rotation * Math.PI) / 180);

  const normalizedRotation = ((options.rotation % 180) + 180) % 180;
  const rotatedWidth = normalizedRotation === 90 ? source.naturalHeight : source.naturalWidth;
  const rotatedHeight = normalizedRotation === 90 ? source.naturalWidth : source.naturalHeight;
  const baseScale = Math.min(outputSize / rotatedWidth, outputSize / rotatedHeight);
  const scale = baseScale * options.zoom;
  const drawWidth = source.naturalWidth * scale;
  const drawHeight = source.naturalHeight * scale;
  const maxOffset = outputSize * 0.9;

  ctx.drawImage(
    source,
    -drawWidth / 2 + (options.offsetX / 100) * maxOffset,
    -drawHeight / 2 + (options.offsetY / 100) * maxOffset,
    drawWidth,
    drawHeight,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Cannot export edited image."))),
      "image/jpeg",
      0.9,
    );
  });

  const safeName = image.name.replace(/\.[^.]+$/, "") || "diagnosis-image";
  return new File([blob], `${safeName}-edited.jpg`, { type: "image/jpeg" });
}

export function DiagnosisImagesPanel({ patientId, readOnly = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    return () => {
      if (pendingImage?.url) URL.revokeObjectURL(pendingImage.url);
    };
  }, [pendingImage?.url]);

  const uploadsQuery = trpc.medical.getPatientDiagnosisUploads.useQuery(
    { patientId },
    { enabled: Boolean(patientId) },
  );

  const uploadMutation = trpc.medical.uploadDiagnosisImage.useMutation({
    onSuccess: () => {
      void uploadsQuery.refetch();
      setUploadError(null);
    },
    onError: (err) => {
      setUploadError(err.message);
    },
  });

  const previewStyle = useMemo(
    () => ({
      transform: `translate(${offsetX * 0.9}%, ${offsetY * 0.9}%) rotate(${rotation}deg) scale(${zoom})`,
    }),
    [offsetX, offsetY, rotation, zoom],
  );

  const resetEditor = () => {
    setRotation(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const closeEditor = () => {
    if (pendingImage?.url) URL.revokeObjectURL(pendingImage.url);
    setPendingImage(null);
    resetEditor();
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fileDataBase64 = await toBase64(file);
      await uploadMutation.mutateAsync({
        patientId,
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        fileDataBase64,
      });
      closeEditor();
    } catch {
      // error handled by mutation callbacks
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("يرجى اختيار صورة فقط.");
      return;
    }
    closeEditor();
    setPendingImage({
      file,
      url: URL.createObjectURL(file),
      name: file.name || "diagnosis-image.jpg",
      mimeType: file.type || "image/jpeg",
    });
  };

  const handleEditedUpload = async () => {
    if (!pendingImage) return;
    try {
      const editedFile = await editImageToFile(pendingImage, {
        rotation,
        zoom,
        offsetX,
        offsetY,
      });
      await uploadFile(editedFile);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "فشل تعديل الصورة.");
    }
  };

  const images = uploadsQuery.data ?? [];

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
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
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            معرض الصور
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
          {images.map((img) => (
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

      <Dialog open={Boolean(pendingImage)} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>تعديل الصورة</DialogTitle>
            <DialogDescription className="text-right">
              حرّك الصورة بحرية، كبّر أو صغّر، ودوّرها قبل الحفظ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg border border-border bg-black">
              {pendingImage && (
                <img
                  src={pendingImage.url}
                  alt="معاينة الصورة"
                  className="h-full w-full object-contain transition-transform"
                  style={previewStyle}
                />
              )}
              <div className="pointer-events-none absolute inset-0 border border-white/25" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={() => setRotation((v) => v - 90)}>
                <RotateCcw className="size-4" />
                تدوير يسار
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => setRotation((v) => v + 90)}>
                <RotateCw className="size-4" />
                تدوير يمين
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">تكبير / تصغير</Label>
                <input type="range" min="0.25" max="4" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">تحريك أفقي</Label>
                <input type="range" min="-100" max="100" step="1" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} className="w-full" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">تحريك رأسي</Label>
                <input type="range" min="-100" max="100" step="1" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} className="w-full" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" className="gap-2" onClick={closeEditor} disabled={uploading}>
              <X className="size-4" />
              إلغاء
            </Button>
            <Button type="button" className="gap-2" onClick={() => void handleEditedUpload()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              حفظ الصورة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}