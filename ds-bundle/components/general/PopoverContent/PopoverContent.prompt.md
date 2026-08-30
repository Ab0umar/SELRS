PopoverContent from selrs-ui. Use via `window.SELRSUI.PopoverContent` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PopoverContentProps {
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  align?: "end" | "center" | "start";
  asChild?: boolean;
  /** When `true`, a `'pointerdown'` event outside of the layered element will wait for the interaction's click event before d */
  deferPointerDownOutside?: boolean;
  side?: "left" | "right" | "top" | "bottom";
  sideOffset?: number;
  alignOffset?: number;
  arrowPadding?: number;
  avoidCollisions?: boolean;
  collisionBoundary?: Element | Element[];
  collisionPadding?: number | Partial<Record<"left" | "right" | "top" | "bottom", number>>;
  sticky?: "partial" | "always";
  hideWhenDetached?: boolean;
  updatePositionStrategy?: "always" | "optimized";
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
