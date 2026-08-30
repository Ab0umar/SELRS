Toggle from selrs-ui. Use via `window.SELRSUI.Toggle` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ToggleProps {
  /** The controlled state of the toggle. */
  pressed?: boolean;
  /** The state of the toggle when initially rendered. Use `defaultPressed` if you do not need to control the state of the tog */
  defaultPressed?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}
```

## Related

`ToggleGroup`, `ToggleGroupItem`
