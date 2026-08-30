DropdownMenuItem from selrs-ui. Use via `window.SELRSUI.DropdownMenuItem` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DropdownMenuItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  disabled?: boolean;
  textValue?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  inset?: boolean;
  variant?: "default" | "destructive";
}
```
