InputGroupButton from selrs-ui. Use via `window.SELRSUI.InputGroupButton` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface InputGroupButtonProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  asChild?: boolean;
  variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost";
  size?: "sm" | "icon-sm" | "xs" | "icon-xs";
}
```
