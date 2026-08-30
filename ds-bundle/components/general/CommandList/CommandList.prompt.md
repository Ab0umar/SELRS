CommandList from selrs-ui. Use via `window.SELRSUI.CommandList` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CommandListProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Accessible label for this List of suggestions. Not shown visibly. */
  label?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```
