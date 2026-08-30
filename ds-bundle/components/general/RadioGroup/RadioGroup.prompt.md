RadioGroup from selrs-ui. Use via `window.SELRSUI.RadioGroup` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface RadioGroupProps {
  name?: string;
  required?: boolean;
  disabled?: boolean;
  dir?: "ltr" | "rtl";
  orientation?: "horizontal" | "vertical";
  loop?: boolean;
  defaultValue?: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Related

`RadioGroupItem`
