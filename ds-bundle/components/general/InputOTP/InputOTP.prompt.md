InputOTP from selrs-ui. Use via `window.SELRSUI.InputOTP` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface InputOTPProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  value?: string;
  maxLength: number;
  textAlign?: "center" | "left" | "right";
  pushPasswordManagerStrategy?: "none" | "increase-width";
  pasteTransformer?: (pasted: string) => string;
  containerClassName?: string;
  noScriptCSSFallback?: string;
  render?: (props: RenderProps) => React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Related

`InputOTPGroup`, `InputOTPSeparator`, `InputOTPSlot`
