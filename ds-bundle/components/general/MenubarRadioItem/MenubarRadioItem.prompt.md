MenubarRadioItem from selrs-ui. Use via `window.SELRSUI.MenubarRadioItem` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface MenubarRadioItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  disabled?: boolean;
  value: string;
  textValue?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
