ToggleGroupItem from selrs-ui. Use via `window.SELRSUI.ToggleGroupItem` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ToggleGroupItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** A string value for the toggle group item. All items within a toggle group should use a unique value. */
  value: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}
```
