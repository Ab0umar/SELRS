import "./loaders.css";

type LoaderProps = {
  size?: number;
  label?: string;
  logo?: "eye" | "arabic" | "full";
  className?: string;
};

function LoaderStage({
  size = 120,
  label,
  logo = "full",
  className = "",
  children,
}: LoaderProps & { children?: React.ReactNode }) {
  return (
    <div className={`organic-loader-stage ${className}`} style={{ width: size, height: size }}>
      {children}
      <div className={`organic-loader-logo ${logo}`} />
      {label ? <div className="organic-loader-label">{label}</div> : null}
    </div>
  );
}

export function A4Loader(props: LoaderProps) {
  return <LoaderStage {...props} className={`organic-loader-a4 ${props.className ?? ""}`} />;
}

export function LidWipeLoader(props: LoaderProps) {
  return <LoaderStage {...props} className={`organic-loader-lid-wipe ${props.className ?? ""}`} />;
}

export function B4Loader(props: LoaderProps) {
  return <LoaderStage {...props} logo={props.logo ?? "full"} className={`organic-loader-b4 ${props.className ?? ""}`} />;
}

export function C4Loader(props: LoaderProps) {
  return <B4Loader {...props} />;
}

export function LoadingOverlay({
  label = "جاري التحميل...",
  variant = "b4",
}: {
  label?: string;
  variant?: "a4" | "b4" | "c4" | "lid";
}) {
  const Loader =
    variant === "lid" ? LidWipeLoader :
    B4Loader;

  return (
    <div className="organic-loader-overlay">
      <Loader size={140} label={label} />
    </div>
  );
}
