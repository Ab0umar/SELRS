export function FundusDiagram({ eye }: { eye: "od" | "os" }) {
  const discX = eye === "od" ? 87 : 63;

  return (
    <svg
      viewBox="0 0 150 150"
      className="aspect-square w-full max-w-[150px] shrink-0"
      role="img"
      aria-label={`رسم قاع العين ${eye === "od" ? "اليمنى" : "اليسرى"}`}
    >
      <circle cx="75" cy="75" r="70" fill="#f8fafc" stroke="#59799b" strokeWidth="3" />
      <path d="M5 75H145M75 5V145" fill="none" stroke="#64748b" strokeWidth="1" opacity="0.45" />
      <circle cx={discX} cy="71" r="18" fill="#f4c98a" stroke="#a96d28" strokeWidth="1.5" />
      <circle cx={discX} cy="71" r="8" fill="#ffffff" stroke="#a96d28" strokeWidth="1" />
    </svg>
  );
}
