Tabs from selrs-ui. Use via `window.SELRSUI.Tabs` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TabsProps {
  /** The value for the selected tab, if controlled */
  value?: string;
  /** The value of the tab to select by default, if uncontrolled */
  defaultValue?: string;
  /** The orientation the tabs are layed out. Mainly so arrow navigation is done accordingly (left & right vs. up & down) */
  orientation?: "horizontal" | "vertical";
  /** The direction of navigation between toolbar items. */
  dir?: "ltr" | "rtl";
  /** Whether a tab is activated automatically or manually. */
  activationMode?: "manual" | "automatic";
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  persistKey?: string;
  showSwipeHint?: boolean;
}
```

## Related

`TabsContent`, `TabsList`, `TabsTrigger`
