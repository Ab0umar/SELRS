CommandSeparator from selrs-ui. Use via `window.SELRSUI.CommandSeparator` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CommandSeparatorProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Whether this separator should always be rendered. Useful if you disable automatic filtering. */
  alwaysRender?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
