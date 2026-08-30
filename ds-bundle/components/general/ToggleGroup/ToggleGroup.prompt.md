ToggleGroup from selrs-ui. Use via `window.SELRSUI.ToggleGroup` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ToggleGroupProps {
  type: "single" | "multiple";
  /** The controlled stateful value of the item that is pressed. */
  value?: string | string[];
  /** The value of the item that is pressed when initially rendered. Use `defaultValue` if you do not need to control the stat */
  defaultValue?: string | string[];
  /** Whether the group is disabled from user interaction. */
  disabled?: boolean;
  /** Whether the group should maintain roving focus of its buttons. */
  rovingFocus?: boolean;
  loop?: boolean;
  orientation?: "horizontal" | "vertical";
  dir?: "ltr" | "rtl";
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

`ToggleGroupItem`
