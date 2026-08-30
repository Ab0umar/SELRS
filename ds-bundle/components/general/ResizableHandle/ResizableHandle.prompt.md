ResizableHandle from selrs-ui. Use via `window.SELRSUI.ResizableHandle` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ResizableHandleProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  /** When disabled, the separator cannot be used to resize its neighboring panels. ℹ️ The panels may still be resized indirec */
  disabled?: boolean;
  /** When true, double-clicking this `Separator` will not reset its `Panel` to its default size. */
  disableDoubleClick?: boolean;
  /** Ref attached to the root `HTMLDivElement`. */
  elementRef?: React.Ref;
  withHandle?: boolean;
}
```
