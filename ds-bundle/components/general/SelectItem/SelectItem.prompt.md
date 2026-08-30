SelectItem from selrs-ui. Use via `window.SELRSUI.SelectItem` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SelectItemProps {
  value: string;
  disabled?: boolean;
  textValue?: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
