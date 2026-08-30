ScrollBar from selrs-ui. Use via `window.SELRSUI.ScrollBar` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ScrollBarProps {
  forceMount?: true;
  orientation?: "horizontal" | "vertical";
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
