ChartLegendContent from selrs-ui. Use via `window.SELRSUI.ChartLegendContent` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ChartLegendContentProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  payload?: readonly RechartsPrimitive.LegendPayload[];
  verticalAlign?: "top" | "bottom" | "middle";
  hideIcon?: boolean;
  nameKey?: string;
}
```
