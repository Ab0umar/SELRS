AlertDialogOverlay from selrs-ui. Use via `window.SELRSUI.AlertDialogOverlay` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface AlertDialogOverlayProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
