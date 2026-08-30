Badge from selrs-ui. Use via `window.SELRSUI.Badge` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface BadgeProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "success" | "warning";
  asChild?: boolean;
}
```
