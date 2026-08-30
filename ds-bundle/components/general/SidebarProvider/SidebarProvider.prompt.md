SidebarProvider from selrs-ui. Use via `window.SELRSUI.SidebarProvider` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SidebarProviderProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
```
