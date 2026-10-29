import { useEffect, useRef } from "react";

/** Copy of the fundus drawing canvas used by the legacy examination sheet. */
export function FundusDrawingCanvas({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);
  const persistDrawing = () => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/webp", 0.82));
  };
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y:
        ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  };
  return (
    <>
      <canvas
        ref={canvasRef}
        width={360}
        height={720}
        className="absolute inset-0 z-10 h-full w-full touch-none cursor-crosshair"
        onPointerDown={(event) => {
          drawingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          const ctx = event.currentTarget.getContext("2d");
          const current = point(event);
          ctx?.beginPath();
          ctx?.moveTo(current.x, current.y);
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          const ctx = event.currentTarget.getContext("2d");
          if (!ctx) return;
          const current = point(event);
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineTo(current.x, current.y);
          ctx.stroke();
        }}
        onPointerUp={persistDrawing}
        onPointerCancel={persistDrawing}
      />
      <button
        type="button"
        title="مسح الرسم"
        aria-label="مسح الرسم"
        className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] font-bold text-slate-500 shadow print:hidden"
        onClick={() => {
          const canvas = canvasRef.current;
          if (canvas) {
            canvas
              .getContext("2d")
              ?.clearRect(0, 0, canvas.width, canvas.height);
            onChange("");
          }
        }}
      >
        ×
      </button>
    </>
  );
}
