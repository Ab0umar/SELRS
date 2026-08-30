PaginationNext from selrs-ui. Use via `window.SELRSUI.PaginationNext` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PaginationNextProps {
  isActive?: boolean;
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
}
```
