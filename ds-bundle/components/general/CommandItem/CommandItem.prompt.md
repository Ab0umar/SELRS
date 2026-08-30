CommandItem from selrs-ui. Use via `window.SELRSUI.CommandItem` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CommandItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Whether this item is currently disabled. */
  disabled?: boolean;
  /** A unique value for this item. If no value is provided, it will be inferred from `children` or the rendered `textContent` */
  value?: string;
  /** Optional keywords to match against when filtering. */
  keywords?: string[];
  /** Whether this item is forcibly rendered regardless of filtering. */
  forceMount?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
