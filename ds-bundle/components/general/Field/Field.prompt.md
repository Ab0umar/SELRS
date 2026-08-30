Field from selrs-ui. Use via `window.SELRSUI.Field` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface FieldProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  orientation?: "horizontal" | "vertical" | "responsive";
}
```

## Related

`FieldContent`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLabel`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldTitle`
