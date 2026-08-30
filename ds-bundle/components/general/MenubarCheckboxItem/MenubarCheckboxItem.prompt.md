MenubarCheckboxItem from selrs-ui. Use via `window.SELRSUI.MenubarCheckboxItem` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface MenubarCheckboxItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  disabled?: boolean;
  checked?: boolean | "indeterminate";
  textValue?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
