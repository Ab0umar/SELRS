Collapsible from selrs-ui. Use via `window.SELRSUI.Collapsible` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CollapsibleProps {
  defaultOpen?: boolean;
  open?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Related

`CollapsibleContent`, `CollapsibleTrigger`
